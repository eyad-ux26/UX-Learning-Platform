// The signed-in learner, read from the database (issue #184). One call to my_learner_state (migration 0039) brings every
// row the app shell needs. Until that migration is applied, or if the call fails, the same rows come from separate reads
// sent together (the code before #184), so the app never depends on the migration.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activitySince, loadProgressAndZone, progressFrom, type ActivityRow, type LessonRow } from "@/lib/server/load-progress";
import type { Progress } from "@/lib/progress";
import { localDay } from "@/lib/progress";
import { settleLearner } from "@/lib/server/settle";
import { resolveWeekStart, shiftDay } from "@/lib/freeze";
import { pickCurrent } from "@/lib/learning";
import type { SkillRow, SkillStateName } from "@/lib/skill-state";
import { proFrom, readEntitlement } from "@/lib/server/billing/account";
import { entitlementFromRow } from "@/lib/server/billing/store";
import type { Entitlement } from "@/lib/billing/subscription";
import type { Certificate } from "@/lib/server/certificates";

export type Learner = {
  db: SupabaseClient | null;
  /** First day of the learner's week: 0 = Sunday ... 6 = Saturday (see weekStartFor in freeze.ts). */
  weekStart: number;
  userId: string;
  /** The sign-in email from the session token, or null (then pages that show it ask the Auth server). */
  email: string | null;
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
  /** Unread inbox items for the bell, or null when not read with the learner (the bell then counts them itself). */
  unread: number | null;
  /** What the Profile page shows beyond the shell, or null when not read with the learner (the page then reads it). */
  profileExtra: { reminderTime: string | null; createdAt: string | null; leaderboardOpen: boolean; certificates: Certificate[] } | null;
};

type ProfileRow = {
  display_name?: string | null; daily_goal?: number | null; time_zone?: string | null; locale?: string | null; week_start?: number | null;
  current_path_id?: string | null; handle?: string | null; share_enabled?: boolean | null; leaderboard_joined_at?: string | null;
  reminder_time?: string | null; created_at?: string | null;
};
type SkillDbRow = { skill_id: string; state: string; shown_at: string | null; kept_at: string | null; next_review_at: string | null };
type StreakRow = { longest: number; freezes_available: number; settled_through: string | null };

/** Every row the learner's pages read, however it arrived. */
export type LearnerRows = {
  progress: Progress;
  timeZone: string | null;
  profile: ProfileRow | null;
  onboarding: { completed_at: string | null; recommended_path_id: string | null } | null;
  skills: SkillDbRow[];
  enrollments: { path_id: string; started_at: string; last_active_at: string | null }[];
  streak: StreakRow | null;
  streakFailed: boolean;
  freezeNote: { id: string; day: string } | null;
  entitlement: Entitlement | null;
  unread: number | null;
  profileExtra: Learner["profileExtra"];
};

type StateJson = {
  profile: ProfileRow | null; lessons: LessonRow[]; activity: ActivityRow[]; onboarding: LearnerRows["onboarding"]; skills: SkillDbRow[];
  enrollments: LearnerRows["enrollments"]; streak: StreakRow | null; freeze_note: { id: string; day: string } | null;
  entitlement: Record<string, unknown> | null; unread: number; certificates: { path_id: string; issued_at: string; code: string }[]; leaderboard_open: boolean;
};

// PostgREST "function not found" and Postgres "undefined function": 0039 is not applied yet. Then this isolate stops
// asking for a minute, so pages do not pay a failed call before every fallback.
const MISSING = new Set(["PGRST202", "42883"]);
const QUIET_MS = 60_000;
let missingUntil = 0;
/** For tests. */
export const resetLearnerState = () => { missingUntil = 0; };

/** The one-call read. Null when it is not available or failed; the caller then reads the rows separately. */
async function readState(db: SupabaseClient, now: Date): Promise<LearnerRows | null> {
  if (Date.now() < missingUntil) return null;
  // GET, so a failed call can be tried again (lib/server/db-trace.ts); the function only reads.
  const { data, error } = await db.rpc("my_learner_state", { p_since: activitySince(now) }, { get: true });
  if (error || !data) {
    if (error?.code && MISSING.has(error.code)) missingUntil = Date.now() + QUIET_MS;
    return null;
  }
  const s = data as StateJson;
  const { progress, timeZone } = progressFrom(s.profile, s.lessons ?? [], s.activity ?? [], now);
  return {
    progress, timeZone, profile: s.profile, onboarding: s.onboarding, skills: s.skills ?? [], enrollments: s.enrollments ?? [],
    streak: s.streak, streakFailed: false, freezeNote: s.freeze_note, entitlement: entitlementFromRow(s.entitlement),
    unread: s.unread ?? 0,
    profileExtra: {
      reminderTime: s.profile?.reminder_time ?? null, createdAt: s.profile?.created_at ?? null, leaderboardOpen: !!s.leaderboard_open,
      certificates: (s.certificates ?? []).map((c) => ({ pathId: c.path_id, issuedAt: c.issued_at, code: c.code })),
    },
  };
}

/** The separate reads, all sent at once (one round of requests). Used until 0039 is applied. */
async function readRows(db: SupabaseClient, userId: string, now: Date): Promise<LearnerRows> {
  const [{ progress, timeZone }, onb, skills, extra, enr, streak, note, entitlement, prof] = await Promise.all([
    loadProgressAndZone(db, userId, now),
    db.from("onboarding").select("completed_at, recommended_path_id").eq("user_id", userId).maybeSingle(),
    db.from("skill_states").select("skill_id, state, shown_at, kept_at, next_review_at").eq("user_id", userId),
    // Its own query: if a column is missing the rest of the app still loads.
    db.from("profiles").select("current_path_id, handle, share_enabled, leaderboard_joined_at").eq("user_id", userId).maybeSingle(),
    db.from("enrollments").select("path_id, started_at, last_active_at").eq("user_id", userId),
    db.from("streaks").select("longest, freezes_available, settled_through").eq("user_id", userId).maybeSingle(),
    db.from("freeze_events").select("id, day").eq("user_id", userId).eq("kind", "used").is("seen_at", null).order("day", { ascending: false }).limit(1),
    readEntitlement(db, userId),
    db.from("profiles").select("time_zone, locale, week_start").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    progress, timeZone,
    profile: { ...(prof.data ?? {}), ...(extra.data ?? {}) } as ProfileRow,
    onboarding: onb.data, skills: (skills.data ?? []) as SkillDbRow[], enrollments: (enr.data ?? []) as LearnerRows["enrollments"],
    streak: streak.data as StreakRow | null, streakFailed: !!streak.error,
    freezeNote: (note.data?.[0] as { id: string; day: string } | undefined) ?? null,
    entitlement, unread: null, profileExtra: null,
  };
}

const readAll = async (db: SupabaseClient, userId: string, now: Date) => (await readState(db, now)) ?? (await readRows(db, userId, now));

/**
 * Everything the app shell shows about a signed-in learner. Finished days are settled (freezes earned or used) at most
 * once a day: only when yesterday is not settled yet does it settle them and read again, so the page already shows them.
 */
export async function readLearner(db: SupabaseClient, userId: string, opts: { email?: string | null; host: string | null; now?: Date }): Promise<Learner> {
  const now = opts.now ?? new Date();
  let rows = await readAll(db, userId, now);
  const weekStart0 = resolveWeekStart(rows.profile?.week_start, rows.profile?.locale);
  const through = rows.streak?.settled_through ?? null;
  const yesterday = shiftDay(localDay(now, rows.profile?.time_zone ?? null), -1);
  if (rows.streakFailed || (rows.streak && !(through && through >= yesterday))) {
    const settled = await settleLearner(userId, rows.profile?.time_zone ?? null, now, weekStart0); // never throws
    if (settled.ok) rows = await readAll(db, userId, now);
  }
  const { progress, timeZone: tz, profile, onboarding, skills, enrollments, streak, freezeNote, entitlement } = rows;
  const weekStart = resolveWeekStart(profile?.week_start, profile?.locale);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz ?? "UTC" }).format(now));
  const joined = enrollments.map((e) => ({ pathId: e.path_id, startedAt: e.started_at, lastActiveAt: e.last_active_at ?? null }))
    .sort((a, b) => (b.lastActiveAt ?? b.startedAt).localeCompare(a.lastActiveAt ?? a.startedAt));
  const recommended = onboarding?.recommended_path_id ?? null;
  const currentPathId = profile?.current_path_id ?? null;
  const d = (v: string | null) => (v ? new Date(v) : null);
  const states = new Map<string, SkillRow>(skills.map((r) => [r.skill_id, { state: r.state as SkillStateName, shownAt: d(r.shown_at), keptAt: d(r.kept_at), nextReviewAt: d(r.next_review_at) }]));
  return {
    db, weekStart, userId, email: opts.email ?? null, progress, hour, timeZone: tz,
    onboarded: !!onboarding?.completed_at,
    recommendedPathId: recommended,
    currentPathId,
    practicedSkills: new Set(states.keys()),
    joined,
    activePathId: pickCurrent(currentPathId, joined.map((j) => j.pathId), recommended)?.id ?? "P01",
    skillStates: states,
    freezes: streak?.freezes_available ?? 0,
    longestStreak: streak?.longest ?? 0,
    freezeNote,
    leaderboardJoined: !!profile?.leaderboard_joined_at,
    shareEnabled: !!profile?.share_enabled,
    handle: profile?.handle ?? null,
    pro: proFrom(entitlement, opts.host),
    entitlement,
    locale: profile?.locale ?? null,
    unread: rows.unread,
    profileExtra: rows.profileExtra,
  };
}
