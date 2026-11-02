import { NextResponse } from "next/server";
import { getLessonVersion } from "@uxgate/content";
import type { Lesson } from "@uxgate/content/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodySchema, processEvents } from "@/lib/server/process-attempts";
import { localDay } from "@/lib/progress";
import { buildPathView } from "@/lib/learning";
import { loadProgress } from "@/lib/server/load-progress";
import { withinDbLimit, withinMemoryLimit } from "@/lib/server/rate-limit";

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

  if (!withinMemoryLimit(`attempts:${auth.user.id}`, PER_MINUTE, 60_000)) return tooMany();

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;

  const current = getLessonVersion(body.lessonId);
  if (!current) return NextResponse.json({ error: "unknown_lesson" }, { status: 404 });

  const db = createAdminClient();
  const userId = auth.user.id;
  if (!(await withinDbLimit(db, userId, "attempts-minute", PER_MINUTE, 60))) return tooMany();

  // Answers given on an older version of the lesson are scored against that version, which stays stored.
  const { data: versionRow } = await db.from("content_versions").select("id, body").eq("lesson_id", body.lessonId).eq("hash", body.hash).maybeSingle();
  if (!versionRow) return NextResponse.json({ error: "content_not_published" }, { status: 409 });
  const lesson: Lesson = current.hash === body.hash ? current.body : (versionRow.body as Lesson);
  if (!Array.isArray(lesson?.steps)) return NextResponse.json({ error: "content_not_published" }, { status: 409 });

  // A first send for a play: it must be a lesson the learner has unlocked, and a learner can only start so many plays a day.
  const { data: known } = await db.from("attempts").select("id").eq("user_id", userId).eq("client_attempt_id", body.attemptId).maybeSingle();
  if (!known) {
    const progress = await loadProgress(db, userId);
    const state = buildPathView(current.pathId, progress, new Set())?.units.flatMap((u) => u.lessons).find((l) => l.lesson.lessonId === body.lessonId)?.state;
    if (state === "locked") return NextResponse.json({ error: "lesson_locked" }, { status: 403 });
    if (!(await withinDbLimit(db, userId, "attempts-new-day", NEW_ATTEMPTS_PER_DAY, 86_400))) return tooMany();
  }

  // The attempt is created once per play; the client's attempt id makes repeated sends land on the same row.
  const { data: attempt, error: aerr } = await db.from("attempts").upsert(
    { client_attempt_id: body.attemptId, user_id: userId, lesson_id: body.lessonId, content_version_id: versionRow.id, started_at: new Date(body.startedAt).toISOString() },
    { onConflict: "user_id,client_attempt_id" },
  ).select("id, finished_at").single();
  if (aerr || !attempt) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  const { data: stored } = await db.from("step_results").select("step_id, try_no, kind, answer, hints_used").eq("attempt_id", attempt.id).eq("user_id", userId);
  const prior = (stored ?? []).map((r) => ({ stepId: r.step_id, tryNo: r.try_no, kind: r.kind as "check" | "main_ok" | "reveal", answer: r.answer as { sel: string[]; reason?: string[] }, hintsUsed: r.hints_used }));

  const out = processEvents(lesson, body, prior);

  if (out.results.length) {
    const { error } = await db.from("step_results").upsert(
      out.results.map((r) => ({ ...r, attempt_id: attempt.id, user_id: userId })),
      { onConflict: "user_id,idempotency_key", ignoreDuplicates: true },
    );
    if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  if (out.xp.length) {
    const { error } = await db.from("xp_events").upsert(
      out.xp.map((x) => ({ user_id: userId, attempt_id: attempt.id, step_id: x.step_id, outcome: x.outcome, amount: x.amount })),
      { onConflict: "attempt_id,step_id", ignoreDuplicates: true },
    );
    if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  if (out.finished && !attempt.finished_at) {
    const now = new Date();
    // Only the request that actually flips finished_at counts the lesson, so a double send cannot count it twice.
    const { data: flipped } = await db.from("attempts").update({ finished_at: now.toISOString() }).eq("id", attempt.id).is("finished_at", null).select("id");
    if (flipped?.length) await recordFinish(db, userId, body.lessonId, lesson.steps.flatMap((s) => ("skill" in s ? [s.skill] : [])), now);
  }

  return NextResponse.json({ saved: out.results.length, xp: out.xp, finished: out.finished, rejected: out.rejected });
}

/** A lesson was finished for the first time in this attempt: count it for today and mark its skills Practiced. */
async function recordFinish(db: ReturnType<typeof createAdminClient>, userId: string, lessonId: string, skillIds: string[], now: Date) {
  const { data: profile } = await db.from("profiles").select("time_zone, daily_goal").eq("user_id", userId).maybeSingle();
  const day = localDay(now, profile?.time_zone);
  const goal = profile?.daily_goal ?? 1;
  // One atomic statement, so two lessons finishing together are both counted.
  const bump = await db.rpc("bump_lessons_done", { p_user: userId, p_day: day, p_goal: goal });
  if (bump.error) {
    // Database not yet on migration 0003: fall back to read then write.
    const { data: today } = await db.from("daily_activity").select("lessons_done").eq("user_id", userId).eq("day", day).maybeSingle();
    const lessonsDone = (today?.lessons_done ?? 0) + 1;
    await db.from("daily_activity").upsert({ user_id: userId, day, lessons_done: lessonsDone, goal_met: lessonsDone >= goal }, { onConflict: "user_id,day" });
  }
  // Lesson ids start with their path id (P01-U01-L01); mark that path as active just now.
  await db.from("enrollments").update({ last_active_at: now.toISOString() }).eq("user_id", userId).eq("path_id", lessonId.split("-")[0]);
  const unique = [...new Set(skillIds)];
  if (unique.length) await db.from("skill_states").upsert(unique.map((skill_id) => ({ user_id: userId, skill_id, state: "practiced" })), { onConflict: "user_id,skill_id", ignoreDuplicates: true });
}
