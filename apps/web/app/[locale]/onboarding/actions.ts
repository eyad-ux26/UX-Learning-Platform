"use server";

import { createClient } from "@/lib/supabase/server";
import { pickPath } from "@/lib/learning";
import { FOCUS_PATH, onboardingSchema, type OnboardingInput } from "@/lib/onboarding";

/** Saves the answers (even a skipped, partial set) and enrols the learner in their first path. */
export async function saveOnboarding(input: OnboardingInput): Promise<{ ok: boolean }> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const a = parsed.data;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return { ok: false };
  const userId = data.user.id;

  const path = pickPath(a.focus ? FOCUS_PATH[a.focus] : null);
  const now = new Date().toISOString();
  const [onb, prof] = await Promise.all([
    db.from("onboarding").upsert({ user_id: userId, goal: a.goal, focus: a.focus, weekly_time: a.weeklyTime, recommended_path_id: path?.id ?? null, skipped: a.skipped, completed_at: now }, { onConflict: "user_id" }),
    db.from("profiles").update({ daily_goal: a.dailyGoal, reminder_time: a.reminder, time_zone: a.timeZone, updated_at: now }).eq("user_id", userId),
  ]);
  if (onb.error || prof.error) return { ok: false };
  if (path) await db.from("enrollments").upsert({ user_id: userId, path_id: path.id }, { onConflict: "user_id,path_id", ignoreDuplicates: true });
  return { ok: true };
}
