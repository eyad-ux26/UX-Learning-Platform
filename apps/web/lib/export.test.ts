import { describe, expect, it } from "vitest";
import { EXPORT_TABLES, buildExport } from "./export";

describe("download my data", () => {
  const me = { id: "u-1", email: "a@example.com", createdAt: "2026-10-01T00:00:00Z", provider: "google" };
  it("holds only this learner's rows", () => {
    const out = buildExport(
      me,
      {
        profiles: [
          { user_id: "u-1", display_name: "A" },
          { user_id: "u-2", display_name: "B" },
        ],
        attempts: [{ user_id: "u-2" }],
      },
      new Date("2026-11-05T00:00:00Z"),
    );
    expect(out.tables.profiles).toEqual([{ user_id: "u-1", display_name: "A" }]);
    expect(out.tables.attempts).toEqual([]);
    expect(out.account).toEqual({
      id: "u-1",
      email: "a@example.com",
      created_at: "2026-10-01T00:00:00Z",
      sign_in: "google",
    });
  });
  it("leaves out tables that could not be read", () => {
    expect(Object.keys(buildExport(me, { profiles: [] }, new Date()).tables)).toEqual(["profiles"]);
  });
  it("never exports push keys", () => {
    expect(EXPORT_TABLES.find((t) => t.table === "push_subscriptions")?.columns).not.toMatch(/p256dh|auth|endpoint|\*/);
  });
  it("covers what the screen promises: profile, progress, answers, XP, requests, notifications", () => {
    const names = EXPORT_TABLES.map((t) => t.table);
    for (const t of ["profiles", "enrollments", "step_results", "xp_events", "review_requests", "notifications"])
      expect(names).toContain(t);
  });
});
