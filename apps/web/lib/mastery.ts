// Pure rules for the end-of-unit mastery round. Learning model: a skill missed anywhere in the unit comes back
// after the skill check as a fresh re-test, until the learner gets one right on the first try.
import type { LessonVersion, QuestionStep, UnitMeta } from "@uxgate/content/types";
import { isQuestion } from "@uxgate/player/engine";

/** The first judged answer of one step in one attempt. */
export type FirstTry = { lessonId: string; stepId: string; skillId: string; correct: boolean };

/** A skill is missed when the first try of any of its steps in the unit's lessons was wrong, and no later mastery step for it was right first try. */
export function missedSkills(unit: Pick<UnitMeta, "skills">, lessonTries: FirstTry[], masteryTries: FirstTry[]): string[] {
  const missed = new Set(lessonTries.filter((t) => !t.correct).map((t) => t.skillId));
  const won = new Set(masteryTries.filter((t) => t.correct).map((t) => t.skillId));
  return unit.skills.map((s) => s.id).filter((id) => missed.has(id) && !won.has(id));
}

/** One fresh bank step per missed skill: the variant the learner has seen least (never seen first), in bank order. */
export function pickRound(bank: Pick<LessonVersion, "body">, missed: string[], seenStepIds: string[]): QuestionStep[] {
  const seen = new Map<string, number>();
  for (const id of seenStepIds) seen.set(id, (seen.get(id) ?? 0) + 1);
  const steps = bank.body.steps.filter(isQuestion);
  return missed.flatMap((skill) => {
    const options = steps.filter((s) => s.skill === skill).map((s, order) => ({ s, order }));
    options.sort((a, b) => (seen.get(a.s.id) ?? 0) - (seen.get(b.s.id) ?? 0) || a.order - b.order);
    return options.length ? [options[0].s] : [];
  });
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
