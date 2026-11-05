"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickPath } from "@/lib/learning";
import { isPlayable } from "@/lib/catalog";
import { FOCUS_PATH, onboardingSchema, type OnboardingInput } from "@/lib/onboarding";
import { sendWelcomeOnce } from "@/lib/server/welcome";

/** Saves the answers (even a skipped, partial set) and enrols the learner in their first path. */
export async function saveOnboarding(input: OnboardingInput): Promise<{ ok: boolean }> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const a = parsed.data;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return { ok: false };
  const userId = data.user.id;

  const path = pickPath(a.pathId && isPlayable(a.pathId) ? a.pathId : a.focus ? FOCUS_PATH[a.focus] : null);
  const now = new Date().toISOString();
  const [onb, prof] = await Promise.all([
    db.from("onboarding").upsert({ user_id: userId, goal: a.goal, focus: a.focus, weekly_time: a.weeklyTime, recommended_path_id: path?.id ?? null, skipped: a.skipped, completed_at: now }, { onConflict: "user_id" }),
    db.from("profiles").update({ daily_goal: a.dailyGoal, reminder_time: a.reminder, time_zone: a.timeZone, updated_at: now }).eq("user_id", userId),
  ]);
  if (onb.error || prof.error) return { ok: false };
  if (path) {
    // Join the path, then make it the current one. A second sign-up pass must not move a learner who already chose another path.
    await db.from("enrollments").upsert({ user_id: userId, path_id: path.id }, { onConflict: "user_id,path_id", ignoreDuplicates: true });
    await db.from("enrollments").update({ last_active_at: now }).eq("user_id", userId).eq("path_id", path.id);
    await db.from("profiles").update({ current_path_id: path.id }).eq("user_id", userId).is("current_path_id", null);
    await createAdminClient().from("path_events").insert({ user_id: userId, kind: "started", path_id: path.id });
  }
  // Once per account: the welcome inbox item and email, now that the starting path is known.
  await sendWelcomeOnce(userId, data.user.email);
  return { ok: true };
}
