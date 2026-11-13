// Streak freezes (spec 4.6). Pure, so the daily job, a Home visit and the tests all run the same rule.
// A learner earns 1 freeze for each calendar week (Monday to Sunday by default, see WEEK_START, in their own time zone) in which they met their
// daily goal on 5 days, and holds at most 2. A day with no finished lesson uses one freeze if there is one, and the
// streak carries on; with none left the streak starts again.

import { DEFAULT_RULES, type LearningRules } from "./learning-rules";

/** Defaults; the Admins can change both in Learning rules (lib/learning-rules.ts). */
export const FREEZE_GOAL_DAYS = DEFAULT_RULES.freezeGoalDays;
export const FREEZE_MAX = DEFAULT_RULES.freezeMax;

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
 * The one place the week start is set: 0 = Sunday, 1 = Monday ... 6 = Saturday. English weeks start on Monday and
 * Arabic weeks on Saturday (design audit U3; Arabic is an assumption until the PM confirms). Every rule below takes the
 * start as an argument, so it can later come from a per-learner profile column instead of the language.
 */
export const WEEK_START = 1;
/** The week start a language gets when a learner signs up (the database trigger does the same). */
export const weekStartFor = (locale: string | null | undefined) => (locale === "ar" ? 6 : WEEK_START);
/** The learner's own week start (fixed at sign-up, stored in profiles.week_start); falls back to the language only if the column is unreadable. */
export const resolveWeekStart = (stored: number | null | undefined, locale: string | null | undefined) =>
  typeof stored === "number" && stored >= 0 && stored <= 6 ? stored : weekStartFor(locale);
/** The first day of the week that holds `day`. */
export const weekStartOf = (day: string, start: number = WEEK_START) =>
  shiftDay(day, -((weekday(day) - start + 7) % 7));
/** The weekday number of the last day of a week that starts on `start`. */
export const weekEndOf = (start: number) => (start + 6) % 7;
/** Kept for the tests and older callers: the Monday-start week. */
export const mondayOf = (day: string) => weekStartOf(day, 1);

/**
 * Settles every finished day after `settledThrough` up to and including `through` (the learner's yesterday).
 * Running it again with the result changes nothing. `activity` must hold at least the days of the week that
 * contains the first day settled, so a week that began before it still counts all its goal days.
 * With no `settledThrough` the learner starts at their first active day, so days before they began never count as missed.
 */
export function settle(
  state: SettleState,
  settledThrough: string | null,
  through: string,
  activity: Record<string, DayActivity>,
  start: number = WEEK_START,
  rules: Pick<LearningRules, "freezeGoalDays" | "freezeMax"> = DEFAULT_RULES,
): Settled {
  let { current, longest, freezes } = state;
  const usedDays: string[] = [];
  const earnedDays: string[] = [];
  let from: string | null = settledThrough ? shiftDay(settledThrough, 1) : null;
  if (!from)
    from =
      Object.keys(activity)
        .filter((d) => (activity[d].lessons ?? 0) > 0)
        .sort()[0] ?? null;
  if (!from || from > through)
    return {
      current,
      longest,
      freezes,
      usedDays,
      earnedDays,
      settledThrough: settledThrough && settledThrough > through ? settledThrough : through,
    };

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
    if (weekday(d) === weekEndOf(start)) {
      const monday = weekStartOf(d, start);
      let goalDays = 0;
      for (let i = 0; i < 7; i++) if (activity[shiftDay(monday, i)]?.goalMet) goalDays++;
      if (goalDays >= rules.freezeGoalDays && freezes < rules.freezeMax) {
        freezes += 1;
        earnedDays.push(d);
      }
    }
  }
  return { current, longest, freezes, usedDays, earnedDays, settledThrough: through };
}

/** Goal days so far in the week that holds `today`, and how many more earn the next freeze (never negative). */
export function weekGoalProgress(
  today: string,
  activity: Record<string, DayActivity>,
  start: number = WEEK_START,
  goalDays_: number = FREEZE_GOAL_DAYS,
) {
  const monday = weekStartOf(today, start);
  let goalDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = shiftDay(monday, i);
    if (d <= today && activity[d]?.goalMet) goalDays++;
  }
  return { goalDays, needed: goalDays_, more: Math.max(0, goalDays_ - goalDays), monday };
}
