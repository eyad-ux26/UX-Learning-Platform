// Issue #184: a cap on the Supabase calls each signed-in page makes, for a learner with a long history (300+ attempts).
// The real supabase-js client and the real read code run against a fake Supabase that answers from memory; every HTTP
// call is counted by the same tracer the Worker uses.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const settle = vi.fn(async () => ({ ok: true as const }));
vi.mock("@/lib/server/settle", () => ({ settleLearner: (...a: unknown[]) => settle(...(a as [])) }));

import { content } from "@uxgate/content";
import { tracedFetch, withTrace, RETRY_PAUSE_MS } from "./db-trace";
import { readLearner, resetLearnerState, type Learner } from "./learner-state";
import { loadProfileData } from "./profile";
import { paidReplayStarts } from "./replays";
import { unreadCount } from "./inbox";
import { localDay, lastDays } from "@/lib/progress";
import { shiftDay } from "@/lib/freeze";

/** The most Supabase calls each page may make for a signed-in learner whose days are settled. */
const BUDGET = { home: 1, path: 1, lesson: 2, profile: 1 };

const URL_ = "https://fake.supabase.co";
const USER = "00000000-0000-4000-8000-0000000000aa";
const now = new Date("2026-11-06T09:00:00Z");
const today = localDay(now, "Africa/Cairo");

// A heavy learner: 8 joined paths, every lesson of them started (most finished), 300+ attempts, 4 months of activity.
const paths = content.paths.slice(0, 8).map((p) => p.id);
const lessons = content.lessons.filter((l) =>
  paths.includes(content.units.find((u) => u.id === l.unitId)?.pathId ?? ""),
);
const lessonRows = lessons.map((l, i) => ({ lesson_id: l.lessonId, finished: i % 7 !== 0, xp: 40 + (i % 5) * 10 }));
const skillRows = content.units
  .filter((u) => paths.includes(u.pathId))
  .flatMap((u) => u.skills)
  .map((s, i) => ({
    skill_id: s.id,
    state: i % 3 ? "practiced" : "shown",
    shown_at: i % 3 ? null : "2026-10-20T10:00:00+00:00",
    kept_at: null,
    next_review_at: i % 3 ? null : "2026-10-23T10:00:00+00:00",
  }));
const activityRows = lastDays(today, 121).map((day, i) => ({
  day,
  lessons_done: i % 4 ? 3 : 0,
  goal_met: i % 4 !== 0,
  freeze_used: false,
}));
const enrollmentRows = paths.map((p, i) => ({
  path_id: p,
  started_at: `2026-07-0${1 + i}T08:00:00+00:00`,
  last_active_at: `2026-11-0${1 + (i % 5)}T08:00:00+00:00`,
}));
const profileRow = {
  display_name: "Heavy",
  daily_goal: 3,
  time_zone: "Africa/Cairo",
  locale: "ar",
  week_start: 6,
  current_path_id: paths[2],
  handle: "heavy",
  share_enabled: true,
  leaderboard_joined_at: "2026-10-01T00:00:00+00:00",
  reminder_time: "20:30:00",
  created_at: "2026-07-01T07:00:00+00:00",
};
const streakRow = { longest: 40, freezes_available: 2, settled_through: shiftDay(today, -1) };
const entitlementRow = {
  plan: "pro",
  valid_until: "2027-11-01T00:00:00+00:00",
  pro_since: "2026-11-01T00:00:00+00:00",
  pro_ended_at: null,
  source: "manual",
};
const attemptCount = lessonRows.length * 3;

type Mode = {
  rpc: "ok" | "missing" | "flaky";
  streak: typeof streakRow;
  certificates: { path_id: string; issued_at: string; code: string }[];
};
let mode: Mode;

/** The fake Supabase: PostgREST-shaped answers from the rows above. */
async function fakeSupabase(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = init?.method ?? "GET";
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
  const route = url.pathname.replace("/rest/v1/", "");
  if (route === "rpc/my_learner_state") {
    if (mode.rpc === "missing")
      return json({ code: "PGRST202", message: "Could not find the function public.my_learner_state" }, 404);
    if (mode.rpc === "flaky") {
      mode.rpc = "ok";
      return json({ message: "schema cache" }, 503);
    }
    return json({
      profile: profileRow,
      lessons: lessonRows,
      activity: activityRows.filter((d) => d.day >= (url.searchParams.get("p_since") ?? "")),
      onboarding: { completed_at: "2026-07-01T07:05:00+00:00", recommended_path_id: paths[0] },
      skills: skillRows,
      enrollments: enrollmentRows,
      streak: mode.streak,
      freeze_note: null,
      entitlement: entitlementRow,
      unread: 3,
      certificates: mode.certificates,
      leaderboard_open: true,
    });
  }
  const tables: Record<string, unknown[]> = {
    "rpc/my_lesson_progress": lessonRows,
    profiles: [profileRow],
    daily_activity: activityRows.filter((d) => d.day >= (url.searchParams.get("day")?.replace("gte.", "") ?? "")),
    onboarding: [{ completed_at: "2026-07-01T07:05:00+00:00", recommended_path_id: paths[0] }],
    skill_states: skillRows,
    enrollments: enrollmentRows,
    streaks: [mode.streak],
    freeze_events: [],
    entitlements: [entitlementRow],
    certificates: mode.certificates,
    app_flags: [{ enabled: true }],
    attempts: [{ started_at: "2026-11-06T07:00:00+00:00" }],
  };
  if (route === "notifications" && method === "HEAD")
    return new Response(null, { status: 200, headers: { "content-range": "*/3" } });
  if (route in tables) return json(tables[route]);
  return json({ message: `no fake for ${method} ${route}` }, 500);
}

const learnerDb = () =>
  createClient(URL_, "anon", {
    global: { fetch: tracedFetch },
    db: { retry: false },
    auth: { persistSession: false, autoRefreshToken: false },
  });
const read = () => readLearner(learnerDb(), USER, { email: "heavy@example.com", host: "uxgate.org", now });
/** Counts the Supabase calls fn makes. */
async function count<T>(fn: () => Promise<T>) {
  const { trace, result } = withTrace(fn);
  const value = await result;
  return { value, calls: trace.calls };
}

beforeEach(() => {
  resetLearnerState();
  settle.mockClear();
  mode = { rpc: "ok", streak: { ...streakRow }, certificates: [] };
  vi.stubGlobal("fetch", vi.fn(fakeSupabase));
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
});
afterEach(() => vi.unstubAllGlobals());

describe("the heavy learner used for these caps", () => {
  it("has 300+ attempts' worth of history across 8 paths", () => {
    expect(attemptCount).toBeGreaterThanOrEqual(300);
    expect(enrollmentRows).toHaveLength(8);
  });
});

describe("Supabase calls per signed-in page (issue #184)", () => {
  it("the learner and the whole app shell come in one call", async () => {
    const { value: me, calls } = await count(read);
    expect(calls.map((c) => c.label)).toEqual(["rpc:my_learner_state"]);
    expect(me.joined).toHaveLength(8);
    expect(me.pro).toBe(true);
    expect(me.unread).toBe(3);
  });
  it(`Home: at most ${BUDGET.home}`, async () => {
    const { calls } = await count(async () => {
      const me = await read();
      return me.unread ?? (await unreadCount(me.db, me.userId)); // BellLink
    });
    expect(calls.length).toBeLessThanOrEqual(BUDGET.home);
  });
  it(`path page: at most ${BUDGET.path}`, async () => {
    const { calls } = await count(read);
    expect(calls.length).toBeLessThanOrEqual(BUDGET.path);
  });
  it(`lesson page, playing a finished lesson again: at most ${BUDGET.lesson}`, async () => {
    const { calls } = await count(async () => {
      const me = await read();
      return paidReplayStarts(me.db, me.progress.finishedLessons[0]);
    });
    expect(calls.length).toBeLessThanOrEqual(BUDGET.lesson);
  });
  it(`Profile: at most ${BUDGET.profile}, with the email from the session token and no extra reads`, async () => {
    const { value, calls } = await count(async () => loadProfileData(await read()));
    expect(calls.length).toBeLessThanOrEqual(BUDGET.profile);
    expect(value).toMatchObject({
      email: "heavy@example.com",
      reminder: "20:30",
      since: profileRow.created_at,
      boardOpen: true,
    });
  });
  it("Profile issues a new certificate when a path was just earned (and only then)", async () => {
    const pathId = paths[0];
    const units = content.units.filter((u) => u.pathId === pathId);
    const all = new Set(units.flatMap((u) => u.skills.map((s) => s.id)));
    const { value, calls } = await count(async () => {
      const me = await read();
      for (const id of all) me.skillStates.set(id, { state: "shown", shownAt: now, keptAt: null, nextReviewAt: now });
      return loadProfileData(me);
    });
    expect(calls.map((c) => c.label)).toEqual(["rpc:my_learner_state", "rest:certificates", "rest:certificates"]);
    expect(value.certificates).toEqual([]);
  });
  it("pages do not read the database themselves: new reads go through the helpers above, inside the caps", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const app = path.join(here, "../../app/[locale]/app");
    for (const f of [
      "(shell)/page.tsx",
      "(shell)/path/[pathId]/page.tsx",
      "(shell)/profile/page.tsx",
      "lesson/[lessonId]/page.tsx",
    ]) {
      const src = fs.readFileSync(path.join(app, f), "utf8");
      expect(src, f).not.toMatch(/\.from\(|\.rpc\(|auth\.getUser\(/);
    }
  });
});

describe("before migration 0039, and when a call fails", () => {
  it("falls back to one round of separate reads that give the same learner, then stops asking for the missing function", async () => {
    const { value: fast } = await count(read);
    mode.rpc = "missing";
    const first = await count(read);
    expect(first.calls[0].label).toBe("rpc:my_learner_state");
    expect(first.calls.length).toBeLessThanOrEqual(13);
    const second = await count(read);
    expect(second.calls.map((c) => c.label)).not.toContain("rpc:my_learner_state");
    const strip = (m: Learner) => ({ ...m, db: null, unread: null, profileExtra: null });
    expect(strip(first.value)).toEqual(strip(fast));
  });
  it("a failed read is tried again once after a short pause, not after supabase-js's 1 s, 2 s, 4 s", async () => {
    mode.rpc = "flaky";
    const t0 = Date.now();
    const { calls } = await count(read);
    expect(Date.now() - t0).toBeLessThan(RETRY_PAUSE_MS + 500);
    expect(calls).toMatchObject([{ label: "rpc:my_learner_state", status: 200, retried: true }]);
  });
  it("settles yesterday once and reads again when it is not settled yet (two calls, once a day)", async () => {
    mode.streak = { ...streakRow, settled_through: shiftDay(today, -3) };
    const { calls } = await count(read);
    expect(settle).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.label)).toEqual(["rpc:my_learner_state", "rpc:my_learner_state"]);
  });
});
