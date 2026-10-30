// What the learner has done, boiled down to what Home and the path map show. Pure, so it runs the same on the server and in tests.

export type LessonState = "done" | "in_progress" | "available" | "locked";

/** The calendar day (YYYY-MM-DD) of an instant in the learner's time zone. Unknown zones count as UTC. */
export function localDay(at: Date | number, timeZone?: string | null): string {
  const fmt = (tz?: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  try { return fmt(timeZone ?? "UTC"); } catch { return fmt("UTC"); }
}

const shiftDay = (day: string, by: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};

/**
 * Days in a row with at least one finished lesson. Today may still be empty without breaking the run,
 * because the learner still has the rest of the day. Streak freezes arrive in slice 3.
 */
export function streakDays(activeDays: Iterable<string>, today: string): number {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (days.has(cursor)) { n++; cursor = shiftDay(cursor, -1); }
  return n;
}

/** The week shown on Home: the last 7 days ending today, oldest first. */
export function lastDays(today: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => shiftDay(today, i - (count - 1)));
}

/**
 * Lessons play in order. A finished lesson is done; the first unfinished one is open (in progress when the
 * learner has started it); everything after it waits. Finished lessons stay open for replay.
 */
export function lessonStates(lessonIds: string[], finished: ReadonlySet<string>, started: ReadonlySet<string>): Record<string, LessonState> {
  const out: Record<string, LessonState> = {};
  let openUsed = false;
  for (const id of lessonIds) {
    if (finished.has(id)) out[id] = "done";
    else if (!openUsed) { out[id] = started.has(id) ? "in_progress" : "available"; openUsed = true; }
    else out[id] = "locked";
  }
  return out;
}

export type Progress = {
  displayName: string | null;
  dailyGoal: number;
  xpTotal: number;
  lessonsToday: number;
  streak: number;
  activeDays: string[]; // last 7 days with a finished lesson, YYYY-MM-DD
  today: string;
  finishedLessons: string[];
  startedLessons: string[];
  xpByLesson: Record<string, number>;
};
