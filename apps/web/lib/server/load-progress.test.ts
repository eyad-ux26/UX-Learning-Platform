import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadProgressAndZone } from "./load-progress";

// A stand-in for the Supabase client: each table answers with fixed rows; rpc answers with the summary or an error.
function fakeDb(tables: Record<string, unknown[]>, rpc: { data?: unknown[]; error?: { message: string } }) {
  const query = (rows: unknown[]) => {
    const q = {
      select: () => q,
      eq: () => q,
      gte: () => q,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok),
    };
    return q;
  };
  return {
    from: (t: string) => query(tables[t] ?? []),
    rpc: async () => ({ data: rpc.data ?? null, error: rpc.error ?? null }),
  } as unknown as SupabaseClient;
}
const now = new Date("2026-11-05T12:00:00Z");
const tables = {
  profiles: [{ display_name: "Nour", daily_goal: 2, time_zone: "Africa/Cairo" }],
  attempts: [
    { id: "a1", lesson_id: "L1", finished_at: "2026-11-04T10:00:00Z" },
    { id: "a2", lesson_id: "L1", finished_at: null },
    { id: "a3", lesson_id: "L2", finished_at: null },
  ],
  xp_events: [
    { attempt_id: "a1", amount: 10 },
    { attempt_id: "a2", amount: 5 },
    { attempt_id: "a3", amount: 0 },
  ],
  daily_activity: [
    { day: "2026-11-05", lessons_done: 1 },
    { day: "2026-11-04", lessons_done: 2 },
  ],
};

describe("loadProgress", () => {
  it("reads the per-lesson summary from the database when 0008 is applied", async () => {
    const db = fakeDb(
      { ...tables, attempts: [], xp_events: [] },
      {
        data: [
          { lesson_id: "L1", finished: true, xp: 15 },
          { lesson_id: "L2", finished: false, xp: 0 },
        ],
      },
    );
    const { progress, timeZone } = await loadProgressAndZone(db, "u", now);
    expect(timeZone).toBe("Africa/Cairo");
    expect(progress).toMatchObject({
      xpTotal: 15,
      xpByLesson: { L1: 15 },
      finishedLessons: ["L1"],
      startedLessons: ["L1", "L2"],
      streak: 2,
      lessonsToday: 1,
    });
  });
  it("gives the same result from the raw rows before 0008 is applied", async () => {
    const { progress } = await loadProgressAndZone(
      fakeDb(tables, { error: { message: "function not found" } }),
      "u",
      now,
    );
    expect(progress).toMatchObject({
      xpTotal: 15,
      xpByLesson: { L1: 15 },
      finishedLessons: ["L1"],
      startedLessons: ["L1", "L2"],
      streak: 2,
      lessonsToday: 1,
    });
  });
});
