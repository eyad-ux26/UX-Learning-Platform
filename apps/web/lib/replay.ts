import { localDay } from "./progress";

/** A replay of a lesson the learner already finished. Null means a first play. */
export type ReplayKind = "paid" | "unpaid";

/**
 * The first replay of a lesson on a given day pays (half XP, counts toward the daily goal and streak);
 * later replays that day are allowed but pay nothing. `paidStarts` are the start times of earlier paid replays of this lesson.
 */
export function decideReplay(finishedBefore: boolean, paidStarts: Iterable<string | number | Date>, now: Date, timeZone?: string | null): ReplayKind | null {
  if (!finishedBefore) return null;
  const today = localDay(now, timeZone);
  for (const s of paidStarts) if (localDay(new Date(s), timeZone) === today) return "unpaid";
  return "paid";
}

/** XP for one question in a replay: half, rounded down (5 first try, 2 with help, 0 revealed); nothing for an unpaid replay. */
export const replayXp = (amount: number, kind: ReplayKind | null): number => (kind === "unpaid" ? 0 : kind === "paid" ? Math.floor(amount / 2) : amount);
