import { describe, expect, it } from "vitest";
import { lastDays, lessonStates, localDay, streakDays } from "./progress";

describe("streakDays", () => {
  it("counts back from today", () => expect(streakDays(["2026-10-28", "2026-10-29", "2026-10-30"], "2026-10-30")).toBe(3));
  it("keeps the run alive when today is still empty", () => expect(streakDays(["2026-10-28", "2026-10-29"], "2026-10-30")).toBe(2));
  it("breaks after a missed day", () => expect(streakDays(["2026-10-27", "2026-10-29"], "2026-10-30")).toBe(1));
  it("is zero with nothing recent", () => expect(streakDays(["2026-10-20"], "2026-10-30")).toBe(0));
  it("crosses month ends", () => expect(streakDays(["2026-10-31", "2026-11-01"], "2026-11-01")).toBe(2));
});

describe("localDay", () => {
  it("uses the learner's time zone", () => {
    const t = Date.UTC(2026, 9, 30, 22, 30);
    expect(localDay(t, "UTC")).toBe("2026-10-30");
    expect(localDay(t, "Africa/Cairo")).toBe("2026-10-31");
  });
  it("falls back to UTC for unknown zones", () => expect(localDay(Date.UTC(2026, 9, 30, 12), "Nowhere/City")).toBe("2026-10-30"));
});

describe("lastDays", () => {
  it("ends today", () => expect(lastDays("2026-10-30", 3)).toEqual(["2026-10-28", "2026-10-29", "2026-10-30"]));
});

describe("lessonStates", () => {
  const ids = ["L1", "L2", "L3"];
  it("opens only the first lesson for a new learner", () =>
    expect(lessonStates(ids, new Set(), new Set())).toEqual({ L1: "available", L2: "locked", L3: "locked" }));
  it("moves on after a lesson is finished", () =>
    expect(lessonStates(ids, new Set(["L1"]), new Set(["L1"]))).toEqual({ L1: "done", L2: "available", L3: "locked" }));
  it("marks a started lesson in progress", () =>
    expect(lessonStates(ids, new Set(["L1"]), new Set(["L1", "L2"]))).toEqual({ L1: "done", L2: "in_progress", L3: "locked" }));
});
