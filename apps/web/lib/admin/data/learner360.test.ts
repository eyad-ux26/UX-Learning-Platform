// QA F11: Learner 360 (and "view as") showed an empty learner. The panel reads with the service-role client, where
// auth.uid() is null, so my_learner_state answered with empty lists and no error. The real supabase-js client and the
// real read code run here against a fake Supabase that answers the way the service role does.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const settle = vi.fn(async () => ({ ok: true as const }));
vi.mock("@/lib/server/settle", () => ({ settleLearner: (...a: unknown[]) => settle(...(a as [])) }));

import { content } from "@uxgate/content";
import { learner360 } from "./learners";
import { resetLearnerState } from "@/lib/server/learner-state";
import { localDay } from "@/lib/progress";
import { shiftDay } from "@/lib/freeze";

const URL_ = "https://fake.supabase.co";
const USER = "00000000-0000-4000-8000-0000000000bb";
const pathIds = content.paths.slice(0, 2).map((p) => p.id);
const unitIds = new Set(content.units.filter((u) => pathIds.includes(u.pathId)).map((u) => u.id));
const lessons = content.lessons.filter((l) => unitIds.has(l.unitId)).slice(0, 3);
const today = localDay(new Date(), "Africa/Cairo");

/** Rows that belong to the learner, by table. Only answered when the query asks for this learner's user_id. */
const rows: Record<string, unknown[]> = {
  profiles: [{ display_name: "Sara", locale: "ar", week_start: 6, time_zone: "Africa/Cairo", created_at: "2026-10-01T08:00:00+00:00", current_path_id: pathIds[1], daily_goal: 3 }],
  enrollments: pathIds.map((p, i) => ({ path_id: p, started_at: `2026-10-0${1 + i}T08:00:00+00:00`, last_active_at: `2026-11-1${i}T08:00:00+00:00` })),
  entitlements: [{ plan: "pro", valid_until: "2027-11-01T00:00:00+00:00", pro_since: "2026-11-01T00:00:00+00:00", pro_ended_at: null, source: "manual" }],
  // Not settled for days: the learner's own visit would settle them; an admin looking must not.
  streaks: [{ longest: 12, freezes_available: 1, settled_through: shiftDay(today, -5) }],
  onboarding: [{ completed_at: "2026-10-01T08:05:00+00:00", recommended_path_id: pathIds[0] }],
  skill_states: [], daily_activity: [], freeze_events: [],
};
const lessonRows = lessons.map((l, i) => ({ lesson_id: l.lessonId, finished: i < 2, xp: 50 }));

let calls: string[] = [];
async function fakeServiceRole(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const route = url.pathname.replace("/rest/v1/", "");
  calls.push(route);
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
  // auth.uid() is null for the service role: the one-call read finds nobody and says so with empty lists, not an error.
  if (route === "rpc/my_learner_state") return json({ profile: null, lessons: [], activity: [], onboarding: null, skills: [], enrollments: [], streak: null, entitlement: null, unread: 0, certificates: [] });
  // 0008: coalesce(auth.uid(), p_user), so it works for the service role when given the learner.
  if (route === "rpc/my_lesson_progress") return json(body.p_user === USER ? lessonRows : []);
  if (route === "rpc/admin_auth_facts") return json([{ email: "sara@example.com", email_confirmed_at: null, last_sign_in_at: null, banned_until: null, created_at: "2026-10-01T08:00:00+00:00", methods: ["email"] }]);
  if (route.startsWith("rpc/")) return json([]);
  return json(url.searchParams.get("user_id") === `eq.${USER}` ? (rows[route] ?? []) : []);
}

beforeEach(() => {
  resetLearnerState();
  settle.mockClear();
  calls = [];
  vi.stubGlobal("fetch", vi.fn(fakeServiceRole));
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
});
afterEach(() => vi.unstubAllGlobals());

describe("Learner 360 on a learner with data (QA F11)", () => {
  it("shows the learner's own paths, progress and Pro, read by their id", async () => {
    const d = await learner360(USER);
    expect(d?.learner).not.toBeNull();
    expect(d!.learner!.joined.map((j) => j.pathId).sort()).toEqual([...pathIds].sort());
    expect(d!.paths.map((p) => p.id).sort()).toEqual([...pathIds].sort());
    expect(d!.paths.reduce((n, p) => n + p.done, 0)).toBe(2);
    expect(d!.learner!.pro).toBe(true);
    expect(d!.learner!.entitlement).toMatchObject({ plan: "pro", source: "manual" });
    expect(d!.learner!.longestStreak).toBe(12);
    expect(d!.learner!.onboarded).toBe(true);
  });
  it("never asks my_learner_state, which reads the signed-in user (nobody, for the service role)", async () => {
    await learner360(USER);
    expect(calls).not.toContain("rpc/my_learner_state");
  });
  it("only reads: an admin looking does not settle the learner's days", async () => {
    await learner360(USER);
    expect(settle).not.toHaveBeenCalled();
  });
});
