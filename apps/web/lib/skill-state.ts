// Skill states: Practiced (lessons done) → Shown (skill check passed on a new case) → Kept (right again in review, 3 or more days later).
// Pure: the server applies these and stores the result. Nothing here ever moves a skill backwards.

export type SkillStateName = "practiced" | "shown" | "kept";
export type SkillRow = { state: SkillStateName; shownAt: Date | null; keptAt: Date | null; nextReviewAt: Date | null };

export const REVIEW_AFTER_DAYS = 3;
export const MISS_RETRY_DAYS = 1;
const DAY = 86_400_000;
const plusDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/** The skill check was passed. A skill that is already Kept stays Kept; one already Shown keeps its original dates. */
export function applyShown(prev: SkillRow | undefined, now: Date): SkillRow {
  if (prev?.state === "kept" || prev?.state === "shown") return prev;
  return { state: "shown", shownAt: now, keptAt: null, nextReviewAt: plusDays(now, REVIEW_AFTER_DAYS) };
}

/** True when a Shown skill's review date has come. Practiced skills are not reviewed (they have not been shown yet), and Kept ones are done. */
export function reviewDue(row: Pick<SkillRow, "state" | "nextReviewAt">, now: Date): boolean {
  return row.state === "shown" && !!row.nextReviewAt && row.nextReviewAt.getTime() <= now.getTime();
}

/**
 * The learner answered a review question on a new case. Right when due: Kept. Missed: the skill stays Shown and comes
 * back tomorrow. Nothing already earned is taken away. A right answer before the date changes nothing.
 */
export function applyReview(prev: SkillRow, correct: boolean, now: Date): SkillRow {
  if (prev.state !== "shown" || !reviewDue(prev, now)) return prev;
  if (correct) return { ...prev, state: "kept", keptAt: now, nextReviewAt: null };
  return { ...prev, nextReviewAt: plusDays(now, MISS_RETRY_DAYS) };
}

/** Badge colour of a skill: blue at Shown, gold at Kept, none before. */
export const badgeOf = (state: SkillStateName | undefined): "gold" | "blue" | null => (state === "kept" ? "gold" : state === "shown" ? "blue" : null);
