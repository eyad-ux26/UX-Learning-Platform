import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { requestHost } from "@/lib/server/billing/account";
import { readLearner, type Learner } from "@/lib/server/learner-state";
import { comingSoonOn, isAdmin } from "@/lib/coming-soon";

export type { Learner } from "@/lib/server/learner-state";

const fixture = (): Learner => ({
  db: null, weekStart: 1, userId: "fixture", email: "nour@example.com", unread: null, profileExtra: null, hour: 20, onboarded: true, recommendedPathId: "P01", currentPathId: "P01", timeZone: "UTC", pro: process.env.UG_DEV_PRO === "1", entitlement: null, locale: process.env.UG_DEV_LOCALE ?? null, teamView: process.env.UG_DEV_TEAM === "1",
  practicedSkills: new Set(["SK-P01-U01-01"]),
  // UG_DEV_JOINED="P01,P14" joins more paths, to check screens that change with several paths.
  joined: (process.env.UG_DEV_JOINED ?? "P01").split(",").map((pathId) => ({ pathId, startedAt: "2026-10-01T00:00:00Z", lastActiveAt: "2026-10-30T09:00:00Z" })), activePathId: "P01",
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
  // One database call for the whole shell (my_learner_state, issue #184), or one round of separate reads before 0039.
  const me = await readLearner(db, userId, { email: typeof auth.claims.email === "string" ? auth.claims.email : null, host: await requestHost() });
  return { ...me, teamView: comingSoonOn() && isAdmin(auth.claims as { app_metadata?: Record<string, unknown> }) };
}

/** A page that needs a signed-in learner who has finished (or skipped) onboarding. */
export async function requireLearner(locale: string): Promise<Learner> {
  const learner = await getLearner();
  if (!learner) return redirect({ href: "/signin", locale }) as never;
  if (!learner.onboarded) return redirect({ href: "/onboarding", locale }) as never;
  return learner;
}
