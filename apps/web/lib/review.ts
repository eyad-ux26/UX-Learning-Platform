// The review queue: skills that are Shown and due, from every joined path, confident errors first.
import { reviewDue, type SkillRow } from "./skill-state";

export type ReviewSkill = SkillRow & { skillId: string; pathId: string };
export type ReviewItem = { skillId: string; pathId: string; confidentError: boolean; dueAt: Date };

/**
 * `confidentErrors` holds the skills where the learner said "Sure" and was wrong (and has not been right since).
 * Order: confident errors first, then the longest-waiting skill first, then by id so the order is stable.
 */
export function buildQueue(skills: ReviewSkill[], confidentErrors: ReadonlySet<string>, now: Date): ReviewItem[] {
  return skills
    .filter((s) => reviewDue(s, now))
    .map((s) => ({ skillId: s.skillId, pathId: s.pathId, confidentError: confidentErrors.has(s.skillId), dueAt: s.nextReviewAt! }))
    .sort((a, b) => Number(b.confidentError) - Number(a.confidentError) || a.dueAt.getTime() - b.dueAt.getTime() || a.skillId.localeCompare(b.skillId));
}

export type CheckResult = { skillId: string; correct: boolean; confidence: number | null; at: number };

/** Skills whose latest "Sure" answer was wrong and has no right answer after it. Results may come in any order. */
export function confidentErrorSkills(results: CheckResult[]): Set<string> {
  const lastWrong = new Map<string, number>();
  const lastRight = new Map<string, number>();
  for (const r of results) {
    if (r.correct) lastRight.set(r.skillId, Math.max(lastRight.get(r.skillId) ?? 0, r.at));
    else if (r.confidence === 2) lastWrong.set(r.skillId, Math.max(lastWrong.get(r.skillId) ?? 0, r.at));
  }
  return new Set([...lastWrong].filter(([id, t]) => (lastRight.get(id) ?? 0) < t).map(([id]) => id));
}

/** Pathid of a skill id like SK-P01-U02-03 or a lesson/unit id like P01-U02. */
export const pathOfId = (id: string) => id.match(/P\d{2}/)?.[0] ?? "";

/** A review session covers one unit at a time (its re-test bank), so it stays short and each step is a new case. */
export const REVIEW_SESSION_MAX = 5;

/**
 * The skills of the next session: the unit of the first skill in the queue, then every due skill of that unit in queue
 * order, at most REVIEW_SESSION_MAX. Null when nothing is due.
 */
export function sessionSkills(queue: ReviewItem[], unitOf: (skillId: string) => string | undefined): { unitId: string; skills: string[] } | null {
  const first = queue.find((q) => unitOf(q.skillId));
  if (!first) return null;
  const unitId = unitOf(first.skillId)!;
  return { unitId, skills: queue.filter((q) => unitOf(q.skillId) === unitId).slice(0, REVIEW_SESSION_MAX).map((q) => q.skillId) };
}

/**
 * Whether a plan a page built earlier still holds: one case per skill, at most REVIEW_SESSION_MAX, every skill due now,
 * and each case one the learner has not answered unless every case of that skill was answered before (#141).
 */
export function reviewPlanOk<S extends { id: string; skill: string }>(plan: string[], bankSteps: S[], due: ReadonlySet<string>, seen: ReadonlyMap<string, number>): boolean {
  const byId = new Map(bankSteps.map((s) => [s.id, s]));
  const steps = plan.map((id) => byId.get(id));
  if (!plan.length || plan.length > REVIEW_SESSION_MAX || steps.some((s) => !s || !due.has(s.skill))) return false;
  if (new Set(steps.map((s) => s!.skill)).size !== steps.length) return false;
  return steps.every((s) => !seen.has(s!.id) || bankSteps.filter((b) => b.skill === s!.skill).every((b) => seen.has(b.id)));
}

/**
 * One step per skill from the unit's bank: a case the learner has not answered yet, in bank order. If every case of the
 * skill was answered before (in a mastery round or an earlier review), the one answered longest ago comes back.
 * `seen` maps a step id to when it was last answered (ms).
 */
export function pickReviewSteps<S extends { id: string; skill: string }>(bankSteps: S[], skills: string[], seen: ReadonlyMap<string, number>): S[] {
  return skills.flatMap((skill) => {
    const cases = bankSteps.filter((s) => s.skill === skill);
    if (!cases.length) return [];
    const fresh = cases.find((s) => !seen.has(s.id));
    return [fresh ?? [...cases].sort((a, b) => (seen.get(a.id) ?? 0) - (seen.get(b.id) ?? 0) || a.id.localeCompare(b.id))[0]];
  });
}
