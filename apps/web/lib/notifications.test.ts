import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, allowed, countChanges, isLocked, prefsToStore, readPrefs } from "./notifications";

describe("notification choices", () => {
  it("fills missing kinds and channels with the defaults", () => {
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(readPrefs({ review: { email: true } }).review).toEqual({ in_app: true, email: true, push: true });
  });
  it("ignores junk values", () => {
    expect(readPrefs({ reminder: { email: "no" }, nonsense: 1 }).reminder.email).toBe(true);
  });
  it("billing email is always on, even when stored off", () => {
    expect(isLocked("billing", "email")).toBe(true);
    expect(readPrefs({ billing: { email: false } }).billing.email).toBe(true);
    expect(allowed(readPrefs({ billing: { email: false } }), "billing", "email")).toBe(true);
  });
  it("every other kind can be turned off on every channel", () => {
    const off = readPrefs({
      reminder: { in_app: false, email: false, push: false },
      review: { in_app: false, email: false, push: false },
      badge: { in_app: false, email: false, push: false },
      answer: { in_app: false, email: false, push: false },
    });
    for (const k of ["reminder", "review", "badge", "answer"] as const)
      for (const c of ["in_app", "email", "push"] as const) expect(allowed(off, k, c)).toBe(false);
  });
  it("the goal-still-open message follows the daily reminder choice", () => {
    const p = readPrefs({ reminder: { email: false } });
    expect(allowed(p, "goal", "email")).toBe(false);
    expect(allowed(p, "goal", "in_app")).toBe(true);
  });
  it("counts unsaved changes cell by cell", () => {
    const b = readPrefs({ review: { email: true }, badge: { push: true } });
    expect(countChanges(DEFAULT_PREFS, DEFAULT_PREFS)).toBe(0);
    expect(countChanges(DEFAULT_PREFS, b)).toBe(2);
  });
});

describe("saving the Notifications screen", () => {
  it("keeps the news opt-out from a campaign email", () => {
    const stored = { news: { email: false }, reminder: { email: true } };
    const saved = prefsToStore(stored, { ...DEFAULT_PREFS, reminder: { in_app: true, email: false, push: true } });
    expect(saved.news).toEqual({ email: false });
    expect((saved.reminder as Record<string, boolean>).email).toBe(false);
  });
  it("stores every screen kind when nothing was stored", () => {
    const saved = prefsToStore(null, DEFAULT_PREFS);
    expect(Object.keys(saved).sort()).toEqual(["answer", "badge", "billing", "reminder", "review"]);
  });
});
