// The leaderboard week starts on the first day of the week (WEEK_START in freeze.ts) at 00:00 in the learner's time zone.
import { WEEK_START, weekStartOf } from "./freeze";
import { localDay } from "./progress";

const parts = (at: Date, timeZone: string) => {
  const m = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
};
/** The instant that is 00:00 on `day` (YYYY-MM-DD) in the time zone. */
export function startOfDay(day: string, timeZone: string): Date {
  const wall = Date.parse(`${day}T00:00:00Z`);
  let guess = wall;
  for (let i = 0; i < 3; i++) guess = wall - (parts(new Date(guess), timeZone) - guess);
  return new Date(guess);
}
export function weekStart(now: Date, timeZone: string | null | undefined, start: number = WEEK_START): Date {
  let tz = timeZone || "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  return startOfDay(weekStartOf(localDay(now, tz), start), tz);
}

/** The full name of a weekday number (0 = Sunday) in a language, e.g. "Saturday" / «السبت». */
export const weekdayName = (locale: string, n: number) =>
  new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 1 + n))); // 1 Nov 2026 is a Sunday
