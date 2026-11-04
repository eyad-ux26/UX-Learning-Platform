import { describe, expect, it } from "vitest";
import { mondayOf, settle, weekEndOf, weekGoalProgress, weekStartFor, weekStartOf, type DayActivity } from "./freeze";
import { localDay, streakDays } from "./progress";
import { startOfDay, weekStart } from "./week";

// 2026-11-02 is a Monday. Week: 02 Mon .. 08 Sun.
const act = (days: Record<string, [number, boolean]>): Record<string, DayActivity> =>
  Object.fromEntries(Object.entries(days).map(([d, [lessons, goalMet]]) => [d, { lessons, goalMet }]));

describe("settle", () => {
  it("earns a freeze when the goal is met on 5 days of a Monday to Sunday week", () => {
    const a = act({ "2026-11-02": [1, true], "2026-11-03": [1, true], "2026-11-04": [1, true], "2026-11-05": [1, true], "2026-11-06": [1, true], "2026-11-07": [0, false], "2026-11-08": [1, false] });
    // 07 is a miss with no freeze yet, so the run restarts there; the freeze is still earned on Sunday 08
    const r = settle({ current: 0, longest: 0, freezes: 0 }, "2026-11-01", "2026-11-08", a);
    expect(r.earnedDays).toEqual(["2026-11-08"]);
    expect(r.freezes).toBe(1);
    expect(r.usedDays).toEqual([]);
  });
  it("does not earn one with only 4 goal days", () => {
    const a = act({ "2026-11-02": [1, true], "2026-11-03": [1, true], "2026-11-04": [1, true], "2026-11-05": [1, true], "2026-11-06": [1, false], "2026-11-07": [1, false], "2026-11-08": [1, false] });
    expect(settle({ current: 0, longest: 0, freezes: 0 }, "2026-11-01", "2026-11-08", a).freezes).toBe(0);
  });
  it("never holds more than 2", () => {
    const a = act(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`2026-11-0${2 + i}`.replace("2026-11-010", "2026-11-10"), [1, true]])));
    const r = settle({ current: 10, longest: 10, freezes: 2 }, "2026-11-01", "2026-11-08", a);
    expect(r.freezes).toBe(2);
    expect(r.earnedDays).toEqual([]);
  });
  it("a missed day uses a freeze and keeps the streak", () => {
    const a = act({ "2026-11-02": [1, true], "2026-11-04": [1, true] });
    const r = settle({ current: 5, longest: 5, freezes: 1 }, "2026-11-01", "2026-11-04", a);
    expect(r.usedDays).toEqual(["2026-11-03"]);
    expect(r.freezes).toBe(0);
    expect(r.current).toBe(7);
  });
  it("a missed day with no freeze ends the streak", () => {
    const a = act({ "2026-11-02": [1, true], "2026-11-04": [1, true] });
    const r = settle({ current: 5, longest: 5, freezes: 0 }, "2026-11-01", "2026-11-04", a);
    expect(r.current).toBe(1);
    expect(r.longest).toBe(6);
  });
  it("is idempotent: settling again from the result changes nothing", () => {
    const a = act({ "2026-11-02": [1, true], "2026-11-04": [1, true] });
    const first = settle({ current: 5, longest: 5, freezes: 1 }, "2026-11-01", "2026-11-04", a);
    const again = settle(first, first.settledThrough, "2026-11-04", a);
    expect(again).toMatchObject({ current: first.current, freezes: first.freezes, usedDays: [], earnedDays: [] });
  });
  it("starts at the first active day, so days before the learner began are not misses", () => {
    const r = settle({ current: 0, longest: 0, freezes: 0 }, null, "2026-11-04", act({ "2026-11-03": [1, true], "2026-11-04": [1, true] }));
    expect(r.current).toBe(2);
    expect(r.usedDays).toEqual([]);
  });
  it("a learner with no activity settles to yesterday with nothing changed", () => {
    expect(settle({ current: 0, longest: 0, freezes: 0 }, null, "2026-11-04", {})).toMatchObject({ current: 0, freezes: 0, settledThrough: "2026-11-04" });
  });
});

describe("streak with freezes", () => {
  it("counts through a frozen day without adding it", () => {
    expect(streakDays(["2026-11-01", "2026-11-02", "2026-11-04"], "2026-11-04", ["2026-11-03"])).toBe(3);
  });
  it("keeps today empty from breaking the run when yesterday was frozen", () => {
    expect(streakDays(["2026-11-01", "2026-11-02"], "2026-11-04", ["2026-11-03"])).toBe(2);
  });
});

describe("week goal progress", () => {
  it("counts goal days of this Monday to Sunday week only", () => {
    const a = act({ "2026-11-01": [1, true], "2026-11-02": [1, true], "2026-11-03": [1, true] });
    expect(weekGoalProgress("2026-11-04", a)).toMatchObject({ goalDays: 2, more: 3, monday: "2026-11-02" });
  });
  it("mondayOf finds Monday from any day", () => {
    expect(["2026-11-02", "2026-11-05", "2026-11-08"].map(mondayOf)).toEqual(["2026-11-02", "2026-11-02", "2026-11-02"]);
  });
});

describe("time zones: the same instant is a different day for Cairo and Riyadh", () => {
  // 2026-11-02 21:30 UTC: Cairo (UTC+2 in November) is 23:30 on the 2nd; Riyadh (UTC+3) is 00:30 on the 3rd.
  const at = new Date("2026-11-02T21:30:00Z");
  it("localDay differs", () => {
    expect(localDay(at, "Africa/Cairo")).toBe("2026-11-02");
    expect(localDay(at, "Asia/Riyadh")).toBe("2026-11-03");
  });
  it("a learner in Riyadh has already left the day that a learner in Cairo is still in", () => {
    const a = act({ "2026-11-02": [1, true] });
    const riyadhYesterday = localDay(new Date(at.getTime() - 86_400_000), "Asia/Riyadh"); // 2026-11-02
    const cairoYesterday = localDay(new Date(at.getTime() - 86_400_000), "Africa/Cairo"); // 2026-11-01
    expect(settle({ current: 3, longest: 3, freezes: 0 }, "2026-11-01", riyadhYesterday, a).current).toBe(4);
    expect(settle({ current: 3, longest: 3, freezes: 0 }, "2026-11-01", cairoYesterday, a).settledThrough).toBe("2026-11-01");
  });
  it("the leaderboard week starts Monday 00:00 in the learner's own zone", () => {
    expect(startOfDay("2026-11-02", "Africa/Cairo").toISOString()).toBe("2026-11-01T22:00:00.000Z");
    expect(startOfDay("2026-11-02", "Asia/Riyadh").toISOString()).toBe("2026-11-01T21:00:00.000Z");
    expect(weekStart(new Date("2026-11-05T10:00:00Z"), "Asia/Riyadh").toISOString()).toBe("2026-11-01T21:00:00.000Z");
    expect(weekStart(new Date("2026-11-05T10:00:00Z"), "Not/AZone").toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });
});

describe("the week start is one setting per language", () => {
  it("English weeks start on Monday and Arabic weeks on Saturday", () => {
    expect([weekStartFor("en"), weekStartFor("ar"), weekStartFor(null)]).toEqual([1, 6, 1]);
    expect(weekEndOf(1)).toBe(0); // Sunday
    expect(weekEndOf(6)).toBe(5); // Friday
  });
  it("finds the first day of a Saturday week", () => {
    // 2026-10-31 is a Saturday; 2026-11-06 is the Friday that ends that week
    expect(["2026-10-31", "2026-11-03", "2026-11-06"].map((d) => weekStartOf(d, 6))).toEqual(["2026-10-31", "2026-10-31", "2026-10-31"]);
    expect(weekStartOf("2026-11-07", 6)).toBe("2026-11-07");
  });
  it("earns the freeze on the Friday that ends a Saturday week", () => {
    const a = act({ "2026-10-31": [1, true], "2026-11-01": [1, true], "2026-11-02": [1, true], "2026-11-03": [1, true], "2026-11-04": [1, true], "2026-11-05": [1, false], "2026-11-06": [1, false] });
    const r = settle({ current: 0, longest: 0, freezes: 0 }, "2026-10-30", "2026-11-06", a, 6);
    expect(r.earnedDays).toEqual(["2026-11-06"]);
    // the same days under a Monday week do not complete a week, so nothing is earned yet
    expect(settle({ current: 0, longest: 0, freezes: 0 }, "2026-10-30", "2026-11-06", a, 1).earnedDays).toEqual([]);
  });
  it("counts goal days in the Saturday week", () => {
    const a = act({ "2026-10-31": [1, true], "2026-11-01": [1, true], "2026-11-02": [1, true] });
    expect(weekGoalProgress("2026-11-03", a, 6).goalDays).toBe(3);
    expect(weekGoalProgress("2026-11-03", a, 1).goalDays).toBe(1);
  });
  it("the leaderboard week can start on Saturday", () => {
    expect(weekStart(new Date("2026-11-05T10:00:00Z"), "UTC", 6).toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });
});
