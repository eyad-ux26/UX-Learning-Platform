import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./onboarding";

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
