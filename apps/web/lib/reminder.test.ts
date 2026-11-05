import { describe, expect, it } from "vitest";
import { formatTime, hourWindow, parseTime, toTime } from "./reminder";

describe("reminder time", () => {
  it("shows 12 hour time in both languages", () => {
    expect(formatTime("20:00", "en")).toBe("8:00 PM");
    expect(formatTime("20:00", "ar")).toBe("8:00 م");
    expect(formatTime("00:15", "en")).toBe("12:15 AM");
    expect(formatTime("12:30", "ar")).toBe("12:30 م");
  });
  it("round-trips through the picker columns", () => {
    for (const v of ["00:00", "08:00", "12:00", "13:45", "22:30", "23:15"]) {
      const p = parseTime(v);
      expect(toTime(p.hour, p.minute, p.period)).toBe(v);
    }
  });
  it("keeps the chosen hour in the middle of five, wrapping around the clock", () => {
    expect(hourWindow(8)).toEqual([6, 7, 8, 9, 10]);
    expect(hourWindow(1)).toEqual([11, 12, 1, 2, 3]);
    expect(hourWindow(12)).toEqual([10, 11, 12, 1, 2]);
  });
});
