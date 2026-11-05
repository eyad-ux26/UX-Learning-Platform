/** Reminder times are stored as "HH:MM" (24 hour). The screen shows 12 hour time, as the canvas does. */
export type Period = "am" | "pm";
export const DEFAULT_REMINDER = "20:00";
export const PRESETS = [
  { id: "morning", time: "08:00" },
  { id: "midday", time: "13:00" },
  { id: "evening", time: "20:00" },
  { id: "night", time: "22:00" },
] as const;
export const MINUTES = [0, 15, 30, 45] as const;

export function parseTime(value: string): { hour: number; minute: number; period: Period } {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  const h24 = m ? Math.min(23, Number(m[1])) : 20;
  const minute = m ? Math.min(59, Number(m[2])) : 0;
  return { hour: h24 % 12 === 0 ? 12 : h24 % 12, minute, period: h24 >= 12 ? "pm" : "am" };
}

export function toTime(hour: number, minute: number, period: Period): string {
  const h = (hour % 12) + (period === "pm" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "8:00 PM" in English, "8:00 م" in Arabic (Western digits, as on the canvas). */
export function formatTime(value: string, locale: "en" | "ar"): string {
  const { hour, minute, period } = parseTime(value);
  const mark = locale === "ar" ? (period === "am" ? "ص" : "م") : period === "am" ? "AM" : "PM";
  return `${hour}:${String(minute).padStart(2, "0")} ${mark}`;
}

/** The five hours shown in the hour column: the chosen one in the middle, the outer two faded. */
export const hourWindow = (hour: number): number[] => [-2, -1, 0, 1, 2].map((d) => ((hour - 1 + d + 12) % 12) + 1);
