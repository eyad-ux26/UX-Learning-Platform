import { describe, expect, it } from "vitest";
import { deleteAfter, localClock, longDate, planDue, planReminder } from "./reminder-plan";

const base = { reminderTime: "20:00", localHour: 20, dailyGoal: 2, lessonsToday: 0, streak: 0, sentToday: false };

describe("the daily reminder", () => {
  it("goes out at the learner's hour only", () => {
    expect(planReminder(base)).toBe("reminder");
    expect(planReminder({ ...base, localHour: 19 })).toBeNull();
    expect(planReminder({ ...base, reminderTime: "20:45" })).toBe("reminder");
  });
  it("is never early: 20:45 waits for the 20:45 run", () => {
    expect(planReminder({ ...base, reminderTime: "20:45", localMinute: 0 })).toBeNull();
    expect(planReminder({ ...base, reminderTime: "20:45", localMinute: 30 })).toBeNull();
    expect(planReminder({ ...base, reminderTime: "20:45", localMinute: 45 })).toBe("reminder");
    expect(planReminder({ ...base, reminderTime: "20:15", localMinute: 16 })).toBe("reminder");
  });
  it("never when reminders are off, the goal is met, or one was sent today", () => {
    expect(planReminder({ ...base, reminderTime: null })).toBeNull();
    expect(planReminder({ ...base, lessonsToday: 2 })).toBeNull();
    expect(planReminder({ ...base, sentToday: true })).toBeNull();
    expect(planReminder({ ...base, deleting: true })).toBeNull();
  });
  it("uses the goal-still-open copy only with a streak of 3 days or more, as the same single email", () => {
    expect(planDue({ ...base, streak: 2 })).toBe("reminder");
    expect(planDue({ ...base, streak: 3 })).toBe("goal");
    expect(planDue({ ...base, streak: 3, lessonsToday: 1 })).toBe("goal");
    expect(planDue({ ...base, streak: 9, sentToday: true })).toBeNull();
  });
});

describe("dates", () => {
  it("removal is 30 days after the request", () => {
    expect(deleteAfter(new Date("2026-11-02T10:00:00Z")).toISOString()).toBe("2026-12-02T10:00:00.000Z");
  });
  it("writes the undo date in each language with Western digits", () => {
    expect(longDate("2026-12-02T10:00:00Z", "en")).toBe("2 December 2026");
    expect(longDate("2026-12-02T10:00:00Z", "ar")).toMatch(/^2 ديسمبر 2026$/);
  });
  it("reads the local hour and day in the learner's zone", () => {
    const at = new Date("2026-11-05T22:30:00Z");
    expect(localClock(at, "Africa/Cairo")).toEqual({ hour: 0, day: "2026-11-06" });
    expect(localClock(at, "Not/AZone")).toEqual({ hour: 22, day: "2026-11-05" });
  });
});
