import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { loadProgressAndZone } from "@/lib/server/load-progress";
import type { Progress } from "@/lib/progress";
import { settleLearner } from "@/lib/server/settle";
import { resolveWeekStart, shiftDay } from "@/lib/freeze";
import { localDay } from "@/lib/progress";
import { pickCurrent } from "@/lib/learning";
import type { SkillRow, SkillStateName } from "@/lib/skill-state";
import { proFrom, readEntitlement, requestHost } from "@/lib/server/billing/account";
import type { Entitlement } from "@/lib/billing/subscription";

export type Learner = {
  db: SupabaseClient | null;
  /** First day of the learner's week: 0 = Sunday ... 6 = Saturday (see weekStartFor in freeze.ts). */
  weekStart: number;
  userId: string;
  progress: Progress;
  hour: number;
  onboarded: boolean;
  recommendedPathId: string | null;
  /** The path the learner chose to continue; falls back to the recommended one until they have one. */
  currentPathId: string | null;
  practicedSkills: Set<string>;
  timeZone: string | null;
  /** Paths the learner has joined, newest activity first. */
  joined: { pathId: string; startedAt: string; lastActiveAt: string | null }[];
  /** The path the app shows now: the current one if joined and playable, else the first joined one, else the recommended one. */
  activePathId: string;
  skillStates: Map<string, SkillRow>;
  freezes: number;
  longestStreak: number;
  /** A freeze covered a missed day and the learner has not seen the note yet. */
  freezeNote: { id: string; day: string } | null;
  leaderboardJoined: boolean;
  shareEnabled: boolean;
  handle: string | null;
  /** On UXGate Pro right now (slice 5). Free learners get Unit 1 of every path. */
  pro: boolean;
  /** The plan row behind `pro`, read once per request and reused by the plans and billing screens. */
  entitlement: Entitlement | null;
  /** The language the learner last signed in with (profiles.locale), or null. */
  locale: string | null;
};

const fixture = (): Learner => ({
  db: null, weekStart: 1, userId: "fixture", hour: 20, onboarded: true, recommendedPathId: "P01", currentPathId: "P01", timeZone: "UTC", pro: process.env.UG_DEV_PRO === "1", entitlement: null, locale: process.env.UG_DEV_LOCALE ?? null,
  practicedSkills: new Set(["SK-P01-U01-01"]),
  joined: [{ pathId: "P01", startedAt: "2026-10-01T00:00:00Z", lastActiveAt: "2026-10-30T09:00:00Z" }], activePathId: "P01",
  skillStates: new Map([["SK-P01-U01-01", { state: "shown", shownAt: new Date("2026-10-28T10:00:00Z"), keptAt: null, nextReviewAt: new Date("2026-10-31T10:00:00Z") }]]),
  freezes: 1, longestStreak: 12, freezeNote: null, leaderboardJoined: false, shareEnabled: false, handle: null,
  progress: {
    displayName: "Nour", dailyGoal: 2, xpTotal: 240, lessonsToday: 1, streak: 12, today: "2026-10-30",
    activeDays: ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-28", "2026-10-29", "2026-10-30"], frozenDays: [], recentActivity: {},
    finishedLessons: ["P01-U01-L01"], startedLessons: ["P01-U01-L01"], xpByLesson: { "P01-U01-L01": 60 },
  },
});

/**
 * The signed-in learner and everything the app shell shows about them.
 * UG_DEV_FIXTURE=1 swaps in a made-up learner so screens can be checked without a database; it is never set on a deployed host.
 */
export const getLearner = cache(loadLearner);

/** Cached per request (React cache): a page, its layout and its components share one sign-in check and one set of reads. */
async function loadLearner(): Promise<Learner | null> {
  if (process.env.UG_DEV_FIXTURE === "1") return fixture();
  if (!hasSupabase()) return null; // not connected to Supabase yet: everyone is signed out
  const db = await createClient();
  // getClaims checks the session token's signature here, with the project's public key (cached for 10 minutes), instead of
  // asking the Auth server on every page as getUser does. Writes (server actions, /api routes) still call getUser.
  const { data: auth } = await db.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  // Every read at once, so a page waits for one database round trip, not four in a row (tab switches felt slow).
  // The plan is one primary-key read in the same round (issue #131), with no retries and a fast exit before 0036 exists.
  const readAll = () => Promise.all([
    loadProgressAndZone(db, userId),
    db.from("onboarding").select("completed_at, recommended_path_id").eq("user_id", userId).maybeSingle(),
    db.from("skill_states").select("skill_id, state, shown_at, kept_at, next_review_at").eq("user_id", userId),
    // Its own query: if a column is missing the rest of the app still loads.
    db.from("profiles").select("current_path_id, handle, share_enabled, leaderboard_joined_at").eq("user_id", userId).maybeSingle(),
    db.from("enrollments").select("path_id, started_at, last_active_at").eq("user_id", userId),
    db.from("streaks").select("longest, freezes_available, settled_through").eq("user_id", userId).maybeSingle(),
    db.from("freeze_events").select("id, day").eq("user_id", userId).eq("kind", "used").is("seen_at", null).order("day", { ascending: false }).limit(1),
    readEntitlement(db, userId),
    requestHost(),
    db.from("profiles").select("time_zone, locale, week_start").eq("user_id", userId).maybeSingle(),
  ]);
  let reads = await readAll();
  const p0 = reads[9].data;
  const weekStart = resolveWeekStart(p0?.week_start, p0?.locale);
  // Finished days are settled (freezes earned or used) at most once a day. Only when yesterday is not settled yet does the
  // page settle them and read again, so the progress it shows already includes them.
  const s0 = reads[5];
  const through = (s0.data?.settled_through as string | null | undefined) ?? null;
  const yesterday = shiftDay(localDay(new Date(), p0?.time_zone ?? null), -1);
  if (s0.error || (s0.data && !(through && through >= yesterday))) {
    const settled = await settleLearner(userId, p0?.time_zone ?? null, new Date(), weekStart); // never throws
    if (settled.ok) reads = await readAll();
  }
  const [{ progress, timeZone: tz }, onb, skills, extra, enr, streak, note, entitlement, host] = reads;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz ?? "UTC" }).format(new Date()));
  const joined = (enr.data ?? []).map((e) => ({ pathId: e.path_id as string, startedAt: e.started_at as string, lastActiveAt: (e.last_active_at as string | null) ?? null }))
    .sort((a, b) => (b.lastActiveAt ?? b.startedAt).localeCompare(a.lastActiveAt ?? a.startedAt));
  const recommended = onb.data?.recommended_path_id ?? null;
  const currentPathId = extra.data?.current_path_id ?? null;
  const states = new Map<string, SkillRow>();
  for (const r of skills.data ?? []) states.set(r.skill_id as string, { state: r.state as SkillStateName, shownAt: r.shown_at ? new Date(r.shown_at as string) : null, keptAt: r.kept_at ? new Date(r.kept_at as string) : null, nextReviewAt: r.next_review_at ? new Date(r.next_review_at as string) : null });
  return {
    db, weekStart, userId, progress, hour, timeZone: tz,
    onboarded: !!onb.data?.completed_at,
    recommendedPathId: recommended,
    currentPathId,
    practicedSkills: new Set(states.keys()),
    joined,
    activePathId: pickCurrent(currentPathId, joined.map((j) => j.pathId), recommended)?.id ?? "P01",
    skillStates: states,
    freezes: streak.data?.freezes_available ?? 0,
    longestStreak: streak.data?.longest ?? 0,
    freezeNote: note.data?.[0] ? { id: note.data[0].id as string, day: note.data[0].day as string } : null,
    leaderboardJoined: !!extra.data?.leaderboard_joined_at,
    shareEnabled: !!extra.data?.share_enabled,
    handle: (extra.data?.handle as string | null) ?? null,
    pro: proFrom(entitlement, host),
    entitlement,
    locale: (p0?.locale as string | null) ?? null,
  };
}

/** A page that needs a signed-in learner who has finished (or skipped) onboarding. */
export async function requireLearner(locale: string): Promise<Learner> {
  const learner = await getLearner();
  if (!learner) return redirect({ href: "/signin", locale }) as never;
  if (!learner.onboarded) return redirect({ href: "/onboarding", locale }) as never;
  return learner;
}
