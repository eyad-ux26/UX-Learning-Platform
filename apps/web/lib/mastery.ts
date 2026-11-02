// Pure rules for the end-of-unit mastery round. Learning model: a skill missed anywhere in the unit comes back
// after the skill check as a fresh re-test, until the learner gets one right on the first try.
import type { LessonVersion, QuestionStep, UnitMeta } from "@uxgate/content/types";
import { isQuestion } from "@uxgate/player/engine";

/** The first judged answer of one step in one attempt. */
export type FirstTry = { lessonId: string; stepId: string; skillId: string; correct: boolean };

/** At most this many mastery misses before a skill is left Practiced (it goes to spaced review in slice 3). */
export const MAX_MASTERY_MISSES = 2;
/** At most this many fresh variants of one skill in a round. */
export const VARIANTS_PER_SKILL = 2;

/**
 * A skill is missed when the first try of any of its steps in the unit's lessons was wrong, and no mastery step for it
 * was right first try yet. After 2 wrong mastery answers it stays Practiced and stops coming back.
 */
export function missedSkills(unit: Pick<UnitMeta, "skills">, lessonTries: FirstTry[], masteryTries: FirstTry[]): string[] {
  const missed = new Set(lessonTries.filter((t) => !t.correct).map((t) => t.skillId));
  const won = new Set(masteryTries.filter((t) => t.correct).map((t) => t.skillId));
  const misses = new Map<string, number>();
  for (const t of masteryTries) if (!t.correct) misses.set(t.skillId, (misses.get(t.skillId) ?? 0) + 1);
  return unit.skills.map((s) => s.id).filter((id) => missed.has(id) && !won.has(id) && (misses.get(id) ?? 0) < MAX_MASTERY_MISSES);
}

/** Up to 2 fresh bank steps per missed skill, in bank order. A step the learner has already answered in a mastery round is never asked again; a skill with none left is skipped. */
export function pickRound(bank: Pick<LessonVersion, "body">, missed: string[], seenStepIds: string[]): QuestionStep[] {
  const seen = new Set(seenStepIds);
  const steps = bank.body.steps.filter(isQuestion);
  return missed.flatMap((skill) => steps.filter((s) => s.skill === skill && !seen.has(s.id)).slice(0, VARIANTS_PER_SKILL));
}

/** Reads the first judged try of every step out of stored step_results rows (kind 'check' with the lowest try_no), per attempt. */
export function firstTries(rows: { attempt_id: string; lesson_id: string; step_id: string; skill_id: string | null; try_no: number; kind: string; correct: boolean }[]): FirstTry[] {
  const best = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.kind !== "check" || !r.skill_id) continue;
    const key = `${r.attempt_id}:${r.step_id}`;
    const cur = best.get(key);
    if (!cur || r.try_no < cur.try_no) best.set(key, r);
  }
  return [...best.values()].map((r) => ({ lessonId: r.lesson_id, stepId: r.step_id, skillId: r.skill_id!, correct: r.correct }));
}
