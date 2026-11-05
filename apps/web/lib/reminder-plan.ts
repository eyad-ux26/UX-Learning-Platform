// Which daily reminder (if any) a learner gets in this hourly run. Pure, so the rules are tested without a database.
// Rules (slice 4 design review, 2 Nov 2026):
// - at most one reminder email a day, at the learner's own time, in their time zone;
// - nothing when the day's goal is already met, or when reminders are off;
// - when the goal is still open and the streak is 3 days or more, that day's reminder uses the "goal still open" copy;
//   it is never a second email;
// - no loss-framed words in any copy (checked in the message tests).

export type ReminderInput = {
  /** "HH:MM" (24 hour), or null when the learner turned reminders off. */
  reminderTime: string | null;
  /** The learner's local hour now (0 to 23). */
  localHour: number;
  dailyGoal: number;
  lessonsToday: number;
  streak: number;
  /** Already sent a reminder or goal email for this local day. */
  sentToday: boolean;
  /** Account set to be deleted: nothing goes out. */
  deleting?: boolean;
};

export type ReminderKind = "reminder" | "goal";

export function planReminder(r: ReminderInput): ReminderKind | null {
  if (!r.reminderTime) return null;
  const hour = Number(/^(\d{1,2}):/.exec(r.reminderTime)?.[1] ?? NaN);
  if (!Number.isFinite(hour) || hour !== r.localHour) return null;
  return planDue(r);
}

/** The same rules once the learner is known to be due this hour (the database picks them by their own hour). */
export function planDue(r: Pick<ReminderInput, "dailyGoal" | "lessonsToday" | "streak" | "sentToday" | "deleting">): ReminderKind | null {
  if (r.deleting || r.sentToday) return null;
  if (r.lessonsToday >= r.dailyGoal) return null;
  // With a run of 3 days or more, today's one reminder uses the "goal still open" copy. Never a second email.
  return r.streak >= 3 ? "goal" : "reminder";
}

/** The learner's local hour and day for an instant. Unknown zones count as UTC. */
export function localClock(at: Date, timeZone: string | null | undefined): { hour: number; day: string } {
  const run = (tz: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return { hour: Number(get("hour")) % 24, day: `${get("year")}-${get("month")}-${get("day")}` };
  };
  try { return run(timeZone || "UTC"); } catch { return run("UTC"); }
}

/** 30 days after the delete request, the account is removed. */
export const DELETE_GRACE_DAYS = 30;
export function deleteAfter(from: Date): Date {
  return new Date(from.getTime() + DELETE_GRACE_DAYS * 86_400_000);
}

/** "2 December 2026" / "2 ديسمبر 2026" with Western digits, as on the canvas. */
export function longDate(at: Date | string, locale: "en" | "ar"): string {
  const d = typeof at === "string" ? new Date(at) : at;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}
