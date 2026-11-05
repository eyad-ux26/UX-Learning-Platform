import type { SupabaseClient } from "@supabase/supabase-js";
import { getUnit, getLessonMeta } from "@uxgate/content";
import { getBank } from "@/lib/server/content";
import type { QuestionStep } from "@uxgate/content/types";
import { firstTries, missedSkills, pickRound, unresolvedSkills } from "@/lib/mastery";

type Row = { attempt_id: string; step_id: string; skill_id: string | null; try_no: number; kind: string; correct: boolean; attempts: { lesson_id: string; started_at: string; finished_at: string | null; kind: string } | { lesson_id: string; started_at: string; finished_at: string | null; kind: string }[] };

export type Round = { unitId: string; bankId: string; hash: string; skillCheckDone: boolean; missed: string[]; unresolved: string[]; steps: QuestionStep[] };

/** What the mastery round of a unit asks this learner, read with the learner's own session. */
export async function loadRound(db: SupabaseClient, userId: string, unitId: string): Promise<Round | null> {
  const unit = getUnit(unitId);
  const bank = await getBank(unitId);
  if (!unit || !bank) return null;
  const checkId = unit.lessons.find((id) => getLessonMeta(id)?.mode === "check");
  const { data } = await db
    .from("step_results")
    .select("attempt_id, step_id, skill_id, try_no, kind, correct, attempts!inner(lesson_id, started_at, finished_at, kind)")
    .eq("user_id", userId)
    .in("attempts.lesson_id", [...unit.lessons, bank.lessonId]);
  const rows = ((data ?? []) as unknown as Row[]).map((r) => ({ ...r, attempt: Array.isArray(r.attempts) ? r.attempts[0] : r.attempts }));
  const skillCheckDone = !!checkId && (await db.from("attempts").select("id").eq("user_id", userId).eq("lesson_id", checkId).not("finished_at", "is", null).limit(1)).data?.length === 1;

  // Per lesson, only its latest play counts: a lesson played again and aced no longer holds a miss against the learner.
  const latest = new Map<string, string>();
  for (const r of rows) if (r.attempt.kind !== "mastery") {
    const cur = rows.find((x) => x.attempt_id === latest.get(r.attempt.lesson_id));
    if (!cur || r.attempt.started_at > cur.attempt.started_at) latest.set(r.attempt.lesson_id, r.attempt_id);
  }
  const asRow = (r: (typeof rows)[number]) => ({ attempt_id: r.attempt_id, lesson_id: r.attempt.lesson_id, step_id: r.step_id, skill_id: r.skill_id, try_no: r.try_no, kind: r.kind, correct: r.correct });
  const lessonTries = firstTries(rows.filter((r) => r.attempt.kind !== "mastery" && latest.get(r.attempt.lesson_id) === r.attempt_id).map(asRow));
  const masteryRows = rows.filter((r) => r.attempt.kind === "mastery");
  const masteryTries = firstTries(masteryRows.map(asRow));
  const missed = missedSkills(unit, lessonTries, masteryTries, checkId);
  const seen = [...new Set(masteryRows.map((r) => `${r.attempt_id}:${r.step_id}`))].map((k) => k.split(":")[1]);
  return { unitId, bankId: bank.lessonId, hash: bank.hash, skillCheckDone, missed, unresolved: unresolvedSkills(unit, lessonTries, masteryTries, checkId), steps: pickRound(bank, missed, seen) };
}
