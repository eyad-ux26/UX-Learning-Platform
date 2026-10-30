import { redirect } from "@/i18n/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { loadProgress } from "@/lib/server/load-progress";
import type { Progress } from "@/lib/progress";

export type Learner = {
  db: SupabaseClient | null;
  userId: string;
  progress: Progress;
  hour: number;
  onboarded: boolean;
  recommendedPathId: string | null;
  practicedSkills: Set<string>;
  timeZone: string | null;
};

const fixture = (): Learner => ({
  db: null, userId: "fixture", hour: 20, onboarded: true, recommendedPathId: "P01", timeZone: "UTC",
  practicedSkills: new Set(["SK-P01-U01-01"]),
  progress: {
    displayName: "Nour", dailyGoal: 2, xpTotal: 240, lessonsToday: 1, streak: 12, today: "2026-10-30",
    activeDays: ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-28", "2026-10-29", "2026-10-30"],
    finishedLessons: ["P01-U01-L01"], startedLessons: ["P01-U01-L01"], xpByLesson: { "P01-U01-L01": 60 },
  },
});

/**
 * The signed-in learner and everything the app shell shows about them.
 * UG_DEV_FIXTURE=1 swaps in a made-up learner so screens can be checked without a database; it is never set on Vercel.
 */
export async function getLearner(): Promise<Learner | null> {
  if (process.env.UG_DEV_FIXTURE === "1") return fixture();
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const userId = data.user.id;
  const progress = await loadProgress(db, userId);
  const [onb, skills, prof] = await Promise.all([
    db.from("onboarding").select("completed_at, recommended_path_id").eq("user_id", userId).maybeSingle(),
    db.from("skill_states").select("skill_id").eq("user_id", userId),
    db.from("profiles").select("time_zone").eq("user_id", userId).maybeSingle(),
  ]);
  const tz = prof.data?.time_zone ?? null;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: tz ?? "UTC" }).format(new Date()));
  return {
    db, userId, progress, hour, timeZone: tz,
    onboarded: !!onb.data?.completed_at,
    recommendedPathId: onb.data?.recommended_path_id ?? null,
    practicedSkills: new Set((skills.data ?? []).map((s) => s.skill_id)),
  };
}

/** A page that needs a signed-in learner who has finished (or skipped) onboarding. */
export async function requireLearner(locale: string): Promise<Learner> {
  const learner = await getLearner();
  if (!learner) return redirect({ href: "/signin", locale }) as never;
  if (!learner.onboarded) return redirect({ href: "/onboarding", locale }) as never;
  return learner;
}
