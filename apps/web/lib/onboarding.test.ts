import { describe, expect, it } from "vitest";
import { catalogEntry } from "./catalog-list";
import { CATALOG, isPlayable } from "./catalog";
import { FOCUSES, FOCUS_PATH, focusOpen, onboardingSchema } from "./onboarding";

const ok = { goal: "g1", focus: "forms", weeklyTime: "t2", dailyGoal: 2, reminder: "19:30", timeZone: "Africa/Cairo", skipped: false };
describe("onboardingSchema", () => {
  it("accepts a full answer", () => expect(onboardingSchema.safeParse(ok).success).toBe(true));
  it("accepts a skipped, empty answer", () => expect(onboardingSchema.safeParse({ ...ok, goal: null, focus: null, weeklyTime: null, reminder: null, timeZone: null, skipped: true }).success).toBe(true));
  it("rejects a daily goal outside 1 to 3", () => { expect(onboardingSchema.safeParse({ ...ok, dailyGoal: 0 }).success).toBe(false); expect(onboardingSchema.safeParse({ ...ok, dailyGoal: 4 }).success).toBe(false); });
  it("rejects a bad reminder time or time zone", () => {
    expect(onboardingSchema.safeParse({ ...ok, reminder: "25:00" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...ok, timeZone: "Not/AZone" }).success).toBe(false);
  });
});

describe("focusOpen (the \"not open yet\" note on an answer\'s preview card)", () => {
  const playable = CATALOG.filter((p) => isPlayable(p.id)).map((p) => p.id);
  it("says not open only for answers whose path has no lessons", () => {
    for (const f of FOCUSES) {
      const id = FOCUS_PATH[f];
      expect(focusOpen(f, playable), f).toBe(id === null || isPlayable(id));
    }
  });
  it("follows the playable list, not a fixed set", () => {
    expect(focusOpen("hier", [])).toBe(false);
    expect(focusOpen("hier", [FOCUS_PATH.hier!])).toBe(true);
    expect(focusOpen("none", [])).toBe(true);
  });
});

// Each "what first?" card shows a path name (components/app/Onboarding.tsx FOCUS_NAME); picking it must start that path.
describe("FOCUS_PATH", () => {
  it("points each answer at the path its card names", () => {
    expect(catalogEntry(FOCUS_PATH.forms!)?.name).toBe("Forms That Flow");
    expect(catalogEntry(FOCUS_PATH.hier!)?.name).toBe("Visual Hierarchy in Action");
    expect(catalogEntry(FOCUS_PATH.usab!)?.name).toBe("Find and Fix Usability");
  });
});
