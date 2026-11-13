import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, rulesFrom } from "./learning-rules";
import { accessFrom } from "./app-config";
import { settle, weekGoalProgress } from "./freeze";
import { applyReview, applyShown } from "./skill-state";

describe("learning rules from the panel's settings", () => {
  it("uses the defaults when nothing is set, and ignores values out of range", () => {
    expect(rulesFrom(null)).toEqual(DEFAULT_RULES);
    expect(
      rulesFrom({
        "learning.freeze_max": 3,
        "learning.freeze_goal_days": 9,
        "trial.days": 10,
        "learning.review_after_days": 2.5,
      }),
    ).toEqual({ ...DEFAULT_RULES, freezeMax: 3 });
    expect(rulesFrom({ "trial.days": 14 }).trialDays).toBe(14);
  });

  it("changes when freezes are earned and how many are held", () => {
    // A lesson every day of the week of Mon 2 Nov, the goal met on 4 of them.
    const days = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"];
    const activity = Object.fromEntries(days.map((d, i) => [d, { lessons: 1, goalMet: i < 4 }]));
    const base = { current: 0, longest: 0, freezes: 0 };
    expect(settle(base, "2026-11-01", "2026-11-08", activity, 1).earnedDays).toEqual([]);
    expect(
      settle(base, "2026-11-01", "2026-11-08", activity, 1, { freezeGoalDays: 4, freezeMax: 2 }).earnedDays,
    ).toEqual(["2026-11-08"]);
    expect(
      settle({ ...base, freezes: 2 }, "2026-11-01", "2026-11-08", activity, 1, { freezeGoalDays: 4, freezeMax: 3 })
        .freezes,
    ).toBe(3);
    expect(weekGoalProgress("2026-11-05", activity, 1, 4)).toMatchObject({ goalDays: 4, needed: 4, more: 0 });
  });

  it("changes review timing", () => {
    const now = new Date("2026-11-09T10:00:00Z");
    const shown = applyShown(undefined, now, { reviewAfterDays: 7, missRetryDays: 2 });
    expect(shown.nextReviewAt?.toISOString()).toBe("2026-11-16T10:00:00.000Z");
    const later = new Date("2026-11-17T10:00:00Z");
    expect(applyReview(shown, false, later, { reviewAfterDays: 7, missRetryDays: 2 }).nextReviewAt?.toISOString()).toBe(
      "2026-11-19T10:00:00.000Z",
    );
  });
});

describe("access settings", () => {
  it("follows Cloudflare unless an Admin set the gate, and needs both languages for the message", () => {
    expect(accessFrom({ flags: {}, settings: {}, teamPasswordSet: false })).toEqual({
      comingSoon: null,
      maintenance: false,
      maintenanceMessage: null,
    });
    expect(
      accessFrom({
        flags: {},
        settings: {
          "access.coming_soon": true,
          "access.maintenance": true,
          "access.maintenance_message": { en: "Back soon", ar: "نعود قريبًا" },
        },
        teamPasswordSet: false,
      }),
    ).toEqual({ comingSoon: true, maintenance: true, maintenanceMessage: { en: "Back soon", ar: "نعود قريبًا" } });
    expect(
      accessFrom({
        flags: {},
        settings: { "access.maintenance": "yes", "access.maintenance_message": { en: "x" } },
        teamPasswordSet: false,
      }),
    ).toMatchObject({ maintenance: false, maintenanceMessage: null });
  });
});
