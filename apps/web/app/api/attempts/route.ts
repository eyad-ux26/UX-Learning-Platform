import { NextResponse } from "next/server";
import { getLessonVersion } from "@/lib/server/content";
import type { Lesson } from "@uxgate/content/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodySchema, processEvents } from "@/lib/server/process-attempts";
import { localDay } from "@/lib/progress";
import { buildPathView, canPlay } from "@/lib/learning";
import { loadProgress } from "@/lib/server/load-progress";
import { withinDbLimit, withinMemoryLimit } from "@/lib/server/rate-limit";
import { decideReplay, replayXp, type ReplayKind } from "@/lib/replay";
import { markPracticed, markReviewed, markShown } from "@/lib/server/skill-states";
import { loadReviewSession } from "@/lib/server/review-session";
import { notifyKept } from "@/lib/server/progress-notify";
import { reviewPlanOk } from "@/lib/review";
import { isQuestion } from "@uxgate/player/engine";
import { lessonOpen } from "@/lib/billing/access";
import { readPro } from "@/lib/server/billing/account";
import { hostOf } from "@/lib/server/billing/config";
import { loadRound } from "@/lib/server/mastery";
import { gatedOut } from "@/lib/coming-soon";

const tooMany = () => NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
const PER_MINUTE = 60;
const NEW_ATTEMPTS_PER_DAY = 300;

/**
 * Receives a learner's committed answers, re-scores them from the stored lesson and saves them.
 * Safe to call again with the same events: every row is keyed so repeats are ignored.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // Coming Soon: lessons, videos and review requests are for admins until launch (lib/coming-soon.ts).
  if (gatedOut(auth.user)) return NextResponse.json({ error: "coming_soon" }, { status: 403 });

  if (!withinMemoryLimit(`attempts:${auth.user.id}`, PER_MINUTE, 60_000)) return tooMany();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;

  const current = await getLessonVersion(body.lessonId);
  if (!current) return NextResponse.json({ error: "unknown_lesson" }, { status: 404 });

  const db = createAdminClient();
  const userId = auth.user.id;
  // These reads do not depend on each other, so they go out together: a skill check sends all its answers in this one
  // request at the end (D1), and every serial round trip to the database was time the learner waited on its end page.
  const [pro, withinMinute, { data: versionRow }, { data: known }] = await Promise.all([
    // Units after Unit 1 need Pro, checked here and not only on the screen. Read with the learner's own session.
    lessonOpen(body.lessonId, false) ? Promise.resolve(true) : readPro(supabase, userId, hostOf(req)),
    withinDbLimit(db, userId, "attempts-minute", PER_MINUTE, 60),
    // Answers given on an older version of the lesson are scored against that version, which stays stored.
    db.from("content_versions").select("id, body").eq("lesson_id", body.lessonId).eq("hash", body.hash).maybeSingle(),
    // A first send for a play: it must be a lesson the learner has unlocked, and a learner can only start so many plays a day.
    db.from("attempts").select("id, plan, kind").eq("user_id", auth.user.id).eq("client_attempt_id", body.attemptId).maybeSingle(),
  ]);
  if (!pro) return NextResponse.json({ error: "pro_required" }, { status: 403 });
  if (!withinMinute) return tooMany();
  if (!versionRow) {
    // The app knows this version but the database does not yet (a deploy that came before the content seed): the client must keep the answers and retry.
    if (current.hash === body.hash) return NextResponse.json({ error: "content_not_ready" }, { status: 503, headers: { "retry-after": "300" } });
    return NextResponse.json({ error: "content_not_published" }, { status: 409 }); // a version we never stored: nothing can score it
  }
  const lesson: Lesson = current.hash === body.hash ? current.body : (versionRow.body as Lesson);
  if (!Array.isArray(lesson?.steps)) return NextResponse.json({ error: "content_not_published" }, { status: 409 });

  const bank = lesson.mode === "bank";
  // A bank is played either as the unit's mastery round or as a review session; once stored, the play keeps its kind.
  const review = bank && (known ? known.kind === "review" : body.purpose === "review");
  const mastery = bank && !review;
  const kind = review ? "review" : mastery ? "mastery" : lesson.mode === "check" ? "check" : "lesson";
  let plan: string[] | null = (known?.plan as string[] | null | undefined) ?? null;
  let replay: ReplayKind | null = null;
  if (review) {
    // Spaced review: the server builds the session from the skills that are due now; the client's plan is only checked.
    if (!known) {
      const session = await loadReviewSession(db, userId);
      if (!session) return NextResponse.json({ error: "nothing_to_review" }, { status: 409 });
      // The page built the plan a little earlier; it still holds if every step is a case of this bank for a skill that is
      // due now, one per skill. Otherwise the queue moved on (a skill was reviewed elsewhere) and the play cannot be saved.
      // A case already answered is accepted only when that skill has no unseen case left (#141).
      if (body.plan && (session.bankId !== body.lessonId || !reviewPlanOk(body.plan, lesson.steps.filter(isQuestion), session.due, session.seen))) return NextResponse.json({ error: "plan_changed" }, { status: 409 });
      if (!body.plan && session.bankId !== body.lessonId) return NextResponse.json({ error: "plan_changed" }, { status: 409 });
      if (!(await withinDbLimit(db, userId, "attempts-new-day", NEW_ATTEMPTS_PER_DAY, 86_400))) return tooMany();
      plan = body.plan ?? session.steps.map((x) => x.id);
    }
  } else if (mastery) {
    // The mastery round of a unit opens once its skill check is finished. The server builds the round itself
    // (one fresh bank step per missed skill); the plan the client sends is only checked against it, never trusted.
    if (!known) {
      const round = await loadRound(db, userId, current.unitId);
      if (!round || !round.skillCheckDone) return NextResponse.json({ error: "lesson_locked" }, { status: 403 });
      if (!round.steps.length) return NextResponse.json({ error: "nothing_to_retest" }, { status: 409 });
      const serverPlan = round.steps.map((x) => x.id);
      if (round.bankId !== body.lessonId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
      if (body.plan && (body.plan.length !== serverPlan.length || body.plan.some((id) => !serverPlan.includes(id)))) return NextResponse.json({ error: "plan_changed" }, { status: 409 });
      if (!(await withinDbLimit(db, userId, "attempts-new-day", NEW_ATTEMPTS_PER_DAY, 86_400))) return tooMany();
      plan = serverPlan;
    }
  } else if (known) {
    // Its own query: if migration 0004 is not applied yet this just reads as a first play.
    const { data: r } = await db.from("attempts").select("replay_kind").eq("id", known.id).maybeSingle();
    replay = (r?.replay_kind as ReplayKind | null | undefined) ?? null;
  } else {
    const progress = await loadProgress(db, userId);
    const view = buildPathView(current.pathId, progress, new Set());
    // A skill check of the unit the learner is in may be taken early (test out); every other locked lesson is refused.
    if (view && !canPlay(view, body.lessonId)) return NextResponse.json({ error: "lesson_locked" }, { status: 403 });
    // Playing a finished lesson again is a replay: half XP the first time each day, nothing after that.
    const again = progress.finishedLessons.includes(body.lessonId);
    const [withinDay, paidRes, profRes] = await Promise.all([
      withinDbLimit(db, userId, "attempts-new-day", NEW_ATTEMPTS_PER_DAY, 86_400),
      again ? db.from("attempts").select("started_at").eq("user_id", userId).eq("lesson_id", body.lessonId).eq("replay_kind", "paid") : null,
      again ? db.from("profiles").select("time_zone").eq("user_id", userId).maybeSingle() : null,
    ]);
    if (!withinDay) return tooMany();
    if (paidRes && !paidRes.error) replay = decideReplay(true, (paidRes.data ?? []).map((p) => p.started_at as string), new Date(), profRes?.data?.time_zone);
  }

  // The attempt is created once per play; the client's attempt id makes repeated sends land on the same row.
  const { data: attempt, error: aerr } = await db.from("attempts").upsert(
    { client_attempt_id: body.attemptId, user_id: userId, lesson_id: body.lessonId, content_version_id: versionRow.id, started_at: new Date(body.startedAt).toISOString(), kind, ...(plan ? { plan } : {}) },
    { onConflict: "user_id,client_attempt_id" },
  ).select("id, finished_at").single();
  if (aerr || !attempt) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  const [, { data: stored }] = await Promise.all([
    !known && replay ? db.from("attempts").update({ replay_kind: replay }).eq("id", attempt.id) : null,
    db.from("step_results").select("step_id, try_no, kind, answer, hints_used").eq("attempt_id", attempt.id).eq("user_id", userId),
  ]);
  const prior = (stored ?? []).map((r) => ({ stepId: r.step_id, tryNo: r.try_no, kind: r.kind as "check" | "main_ok" | "reveal", answer: r.answer as { sel: string[]; reason?: string[] }, hintsUsed: r.hints_used }));

  const out = processEvents(lesson, body, prior, plan);

  const xpRows = replay === "unpaid" ? [] : out.xp.map((x) => ({ ...x, amount: replayXp(x.amount, replay) }));
  // Both writes are keyed, so a retry after a partial failure only adds what is missing.
  const [resWrite, xpWrite] = await Promise.all([
    out.results.length ? db.from("step_results").upsert(
      out.results.map((r) => ({ ...r, attempt_id: attempt.id, user_id: userId })),
      { onConflict: "user_id,idempotency_key", ignoreDuplicates: true },
    ) : null,
    xpRows.length ? db.from("xp_events").upsert(
      xpRows.map((x) => ({ user_id: userId, attempt_id: attempt.id, step_id: x.step_id, outcome: x.outcome, amount: x.amount })),
      { onConflict: "attempt_id,step_id", ignoreDuplicates: true },
    ) : null,
  ]);
  if (resWrite?.error || xpWrite?.error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  if (out.finished && !attempt.finished_at) {
    const now = new Date();
    // Only the request that actually flips finished_at counts the lesson, so a double send cannot count it twice.
    const { data: flipped } = await db.from("attempts").update({ finished_at: now.toISOString() }).eq("id", attempt.id).is("finished_at", null).select("id");
    if (flipped?.length) await recordFinish(db, userId, body.lessonId, replay, kind, attempt.id, lesson.steps.flatMap((s) => ("skill" in s && (!plan || plan.includes(s.id)) ? [s.skill] : [])), now);
  }

  return NextResponse.json({ saved: out.results.length, xp: xpRows, replay, finished: out.finished, rejected: out.rejected });
}

/** A lesson was finished for the first time in this attempt: count it for today and mark its skills Practiced. */
async function recordFinish(db: ReturnType<typeof createAdminClient>, userId: string, lessonId: string, replay: ReplayKind | null, kind: "lesson" | "check" | "mastery" | "review", attemptId: string, skillIds: string[], now: Date) {
  if (kind === "review") {
    // A review session is not a lesson either. Right first try on a due skill: Kept. A miss: back tomorrow, nothing taken away.
    const kept = await markReviewed(db, userId, skillIds, await firstTryRight(db, attemptId, userId, "any"), now);
    await notifyKept(db, userId, kept);
    return;
  }
  if (kind === "mastery") {
    // The mastery round is not a lesson: it does not count toward the daily goal. A right first try moves the skill to Shown.
    await markShown(db, userId, await firstTryRight(db, attemptId, userId, "any"), now);
    return;
  }
  // A replay counts toward the day only when it is the paid one; it never changes skills.
  if (replay === "unpaid") return;
  // Independent writes go out together (one finished request now carries a whole skill check, D1).
  const [{ data: profile }, right] = await Promise.all([
    db.from("profiles").select("time_zone, daily_goal").eq("user_id", userId).maybeSingle(),
    kind === "check" && !replay ? firstTryRight(db, attemptId, userId) : Promise.resolve([] as string[]),
  ]);
  const day = localDay(now, profile?.time_zone);
  const goal = profile?.daily_goal ?? 1;
  const countDay = async () => {
    // One atomic statement, so two lessons finishing together are both counted.
    const bump = await db.rpc("bump_lessons_done", { p_user: userId, p_day: day, p_goal: goal });
    if (!bump.error) return;
    // Database not yet on migration 0003: fall back to read then write.
    const { data: today } = await db.from("daily_activity").select("lessons_done").eq("user_id", userId).eq("day", day).maybeSingle();
    const lessonsDone = (today?.lessons_done ?? 0) + 1;
    await db.from("daily_activity").upsert({ user_id: userId, day, lessons_done: lessonsDone, goal_met: lessonsDone >= goal }, { onConflict: "user_id,day" });
  };
  const skills = async () => {
    if (replay) return;
    await markPracticed(db, userId, skillIds);
    // Skill check passed unaided (right on its one try): that skill is Shown, with its first review in 3 days.
    if (kind === "check") await markShown(db, userId, right, now);
  };
  await Promise.all([
    countDay(),
    // Lesson ids start with their path id (P01-U01-L01); mark that path as active just now.
    db.from("enrollments").update({ last_active_at: now.toISOString() }).eq("user_id", userId).eq("path_id", lessonId.split("-")[0]),
    skills(),
  ]);
}

/** Skills whose step in this attempt was right on the first judged try. A skill with several steps needs all of them right in a skill check ("all"); in the mastery round one right first try is enough ("any"). */
async function firstTryRight(db: ReturnType<typeof createAdminClient>, attemptId: string, userId: string, rule: "all" | "any" = "all"): Promise<string[]> {
  const { data } = await db.from("step_results").select("step_id, skill_id, try_no, kind, correct").eq("attempt_id", attemptId).eq("user_id", userId).eq("kind", "check");
  const first = new Map<string, { skill: string; correct: boolean; tryNo: number }>();
  for (const r of data ?? []) {
    const cur = first.get(r.step_id as string);
    if (r.skill_id && (!cur || (r.try_no as number) < cur.tryNo)) first.set(r.step_id as string, { skill: r.skill_id as string, correct: r.correct as boolean, tryNo: r.try_no as number });
  }
  const bySkill = new Map<string, boolean>();
  for (const f of first.values()) bySkill.set(f.skill, rule === "any" ? (bySkill.get(f.skill) ?? false) || f.correct : (bySkill.get(f.skill) ?? true) && f.correct);
  return [...bySkill].filter(([, ok]) => ok).map(([skill]) => skill);
}
