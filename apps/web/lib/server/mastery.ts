import type { SupabaseClient } from "@supabase/supabase-js";
import { getUnit, getLessonMeta } from "@uxgate/content";
import { getBank } from "@/lib/server/content";
import type { QuestionStep } from "@uxgate/content/types";
import { firstTries, missedSkills, pickRound, unresolvedSkills } from "@/lib/mastery";
import { learningRules } from "@/lib/app-config";

type Row = {
  attempt_id: string;
  step_id: string;
  skill_id: string | null;
  try_no: number;
  kind: string;
  correct: boolean;
  attempts: Att | Att[];
};
type Att = {
  lesson_id: string;
  started_at: string;
  finished_at: string | null;
  kind: string;
  replay_kind?: string | null;
};

export type Round = {
  unitId: string;
  bankId: string;
  hash: string;
  skillCheckDone: boolean;
  missed: string[];
  unresolved: string[];
  steps: QuestionStep[];
};

/** What the mastery round of a unit asks this learner, read with the learner's own session. */
export async function loadRound(db: SupabaseClient, userId: string, unitId: string): Promise<Round | null> {
  const unit = getUnit(unitId);
  const bank = await getBank(unitId);
  if (!unit || !bank) return null;
  const checkId = unit.lessons.find((id) => getLessonMeta(id)?.mode === "check");
  const [{ data }, checkDone] = await Promise.all([
    db
      .from("step_results")
      .select(
        "attempt_id, step_id, skill_id, try_no, kind, correct, attempts!inner(lesson_id, started_at, finished_at, kind, replay_kind)",
      )
      .eq("user_id", userId)
      .in("attempts.lesson_id", [...unit.lessons, bank.lessonId]),
    checkId
      ? db
          .from("attempts")
          .select("id")
          .eq("user_id", userId)
          .eq("lesson_id", checkId)
          .not("finished_at", "is", null)
          .limit(1)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const all = ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    attempt: Array.isArray(r.attempts) ? r.attempts[0] : r.attempts,
  }));
  // Review sessions also draw from the bank, but they are not part of the unit: they only mark cases as seen.
  // A finished skill check played again (revise a unit) is practice only: it never puts a skill back in the round.
  const rows = all.filter((r) => r.attempt.kind !== "review" && !(r.attempt.kind === "check" && r.attempt.replay_kind));
  const skillCheckDone = !!checkId && checkDone.data?.length === 1;

  // Per lesson, only its latest play counts: a lesson played again and aced no longer holds a miss against the learner.
  const latest = new Map<string, string>();
  const latestStart = new Map<string, string>();
  for (const r of rows)
    if (r.attempt.kind !== "mastery") {
      const cur = latestStart.get(r.attempt.lesson_id);
      if (cur === undefined || r.attempt.started_at > cur) {
        latest.set(r.attempt.lesson_id, r.attempt_id);
        latestStart.set(r.attempt.lesson_id, r.attempt.started_at);
      }
    }
  const asRow = (r: (typeof rows)[number]) => ({
    attempt_id: r.attempt_id,
    lesson_id: r.attempt.lesson_id,
    step_id: r.step_id,
    skill_id: r.skill_id,
    try_no: r.try_no,
    kind: r.kind,
    correct: r.correct,
  });
  const lessonTries = firstTries(
    rows.filter((r) => r.attempt.kind !== "mastery" && latest.get(r.attempt.lesson_id) === r.attempt_id).map(asRow),
  );
  const masteryRows = rows.filter((r) => r.attempt.kind === "mastery");
  const masteryTries = firstTries(masteryRows.map(asRow));
  const rules = await learningRules();
  const missed = missedSkills(unit, lessonTries, masteryTries, checkId, rules.maxMasteryMisses);
  const seen = [
    ...new Set(all.filter((r) => r.attempt.kind === "mastery" || r.attempt.kind === "review").map((r) => r.step_id)),
  ];
  return {
    unitId,
    bankId: bank.lessonId,
    hash: bank.hash,
    skillCheckDone,
    missed,
    unresolved: unresolvedSkills(unit, lessonTries, masteryTries, checkId),
    steps: pickRound(bank, missed, seen, rules.variantsPerSkill),
  };
}
