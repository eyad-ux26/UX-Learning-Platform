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
