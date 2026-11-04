// Streak freezes (spec 4.6). Pure, so the daily job, a Home visit and the tests all run the same rule.
// A learner earns 1 freeze for each calendar week (Monday to Sunday by default, see WEEK_START, in their own time zone) in which they met their
// daily goal on 5 days, and holds at most 2. A day with no finished lesson uses one freeze if there is one, and the
// streak carries on; with none left the streak starts again.

export const FREEZE_GOAL_DAYS = 5;
export const FREEZE_MAX = 2;

export type DayActivity = { lessons: number; goalMet: boolean };
export type SettleState = { current: number; longest: number; freezes: number };
export type Settled = SettleState & {
  /** Days a freeze covered, oldest first. */
  usedDays: string[];
  /** Last days of a week (Sunday by default) that ended a week with the goal met on 5 days and room for a freeze, oldest first. */
  earnedDays: string[];
  /** The last day that has been settled. */
  settledThrough: string;
};

export const shiftDay = (day: string, by: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};
/** 0 = Sunday ... 6 = Saturday, for a YYYY-MM-DD day. */
export const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
/**
 * The one place the week start is set: 0 = Sunday, 1 = Monday ... 6 = Saturday. It drives the freeze week, the
 * "goal days this week" count and the leaderboard week. Monday for now; Arabic may move to Saturday (one-line change).
 */
export const WEEK_START = 1;
/** The first day of the week that holds `day`. */
export const weekStartOf = (day: string, start: number = WEEK_START) => shiftDay(day, -((weekday(day) - start + 7) % 7));
/** The last day of the week, as a weekday number. */
export const WEEK_END = (WEEK_START + 6) % 7;
/** Kept for the tests and older callers: the week start under the current setting. */
export const mondayOf = (day: string) => weekStartOf(day);

/**
 * Settles every finished day after `settledThrough` up to and including `through` (the learner's yesterday).
 * Running it again with the result changes nothing. `activity` must hold at least the days of the week that
 * contains the first day settled, so a week that began before it still counts all its goal days.
 * With no `settledThrough` the learner starts at their first active day, so days before they began never count as missed.
 */
export function settle(state: SettleState, settledThrough: string | null, through: string, activity: Record<string, DayActivity>): Settled {
  let { current, longest, freezes } = state;
  const usedDays: string[] = [];
  const earnedDays: string[] = [];
  let from: string | null = settledThrough ? shiftDay(settledThrough, 1) : null;
  if (!from) from = Object.keys(activity).filter((d) => (activity[d].lessons ?? 0) > 0).sort()[0] ?? null;
  if (!from || from > through) return { current, longest, freezes, usedDays, earnedDays, settledThrough: settledThrough && settledThrough > through ? settledThrough : through };

  for (let d = from; d <= through; d = shiftDay(d, 1)) {
    const a = activity[d];
    if (a && a.lessons > 0) {
      current += 1;
      if (current > longest) longest = current;
    } else if (freezes > 0) {
      freezes -= 1;
      usedDays.push(d);
    } else {
      current = 0;
    }
    if (weekday(d) === WEEK_END) {
      const monday = weekStartOf(d);
      let goalDays = 0;
      for (let i = 0; i < 7; i++) if (activity[shiftDay(monday, i)]?.goalMet) goalDays++;
      if (goalDays >= FREEZE_GOAL_DAYS && freezes < FREEZE_MAX) { freezes += 1; earnedDays.push(d); }
    }
  }
  return { current, longest, freezes, usedDays, earnedDays, settledThrough: through };
}

/** Goal days so far in the week that holds `today`, and how many more earn the next freeze (never negative). */
export function weekGoalProgress(today: string, activity: Record<string, DayActivity>) {
  const monday = weekStartOf(today);
  let goalDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = shiftDay(monday, i);
    if (d <= today && activity[d]?.goalMet) goalDays++;
  }
  return { goalDays, needed: FREEZE_GOAL_DAYS, more: Math.max(0, FREEZE_GOAL_DAYS - goalDays), monday };
}
