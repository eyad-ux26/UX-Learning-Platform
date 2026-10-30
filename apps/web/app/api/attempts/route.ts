import { NextResponse } from "next/server";
import { getLessonVersion } from "@uxgate/content";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bodySchema, processEvents } from "@/lib/server/process-attempts";

/**
 * Receives a learner's committed answers, re-scores them from the stored lesson and saves them.
 * Safe to call again with the same events: every row is keyed so repeats are ignored.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;

  const version = getLessonVersion(body.lessonId);
  if (!version || version.hash !== body.hash) return NextResponse.json({ error: "unknown_content_version" }, { status: 409 });

  const db = createAdminClient();
  const userId = auth.user.id;

  const { data: versionRow } = await db.from("content_versions").select("id").eq("lesson_id", body.lessonId).eq("hash", body.hash).maybeSingle();
  if (!versionRow) return NextResponse.json({ error: "content_not_published" }, { status: 409 });

  // The attempt is created once per play; the client's attempt id makes repeated sends land on the same row.
  const { data: attempt, error: aerr } = await db.from("attempts").upsert(
    { client_attempt_id: body.attemptId, user_id: userId, lesson_id: body.lessonId, content_version_id: versionRow.id, started_at: new Date(body.startedAt).toISOString() },
    { onConflict: "user_id,client_attempt_id" },
  ).select("id, finished_at").single();
  if (aerr || !attempt) return NextResponse.json({ error: "save_failed" }, { status: 500 });

  const { data: stored } = await db.from("step_results").select("step_id, try_no, kind, answer, hints_used").eq("attempt_id", attempt.id).eq("user_id", userId);
  const prior = (stored ?? []).map((r) => ({ stepId: r.step_id, tryNo: r.try_no, kind: r.kind as "check" | "main_ok" | "reveal", answer: r.answer as { sel: string[]; reason?: string[] }, hintsUsed: r.hints_used }));

  const out = processEvents(version.body, body, prior);

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
  if (out.finished && !attempt.finished_at) await db.from("attempts").update({ finished_at: new Date().toISOString() }).eq("id", attempt.id);

  return NextResponse.json({ saved: out.results.length, xp: out.xp, finished: out.finished, rejected: out.rejected });
}
