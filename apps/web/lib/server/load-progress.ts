import type { SupabaseClient } from "@supabase/supabase-js";
import { lastDays, localDay, streakDays, type Progress } from "@/lib/progress";

/** Everything Home and the path map need, read with the learner's own session (RLS lets them read only their rows). */
export async function loadProgress(db: SupabaseClient, userId: string, now = new Date()): Promise<Progress> {
  return (await loadProgressAndZone(db, userId, now)).progress;
}

/** loadProgress plus the learner's time zone. All four reads go out at once: one round trip to the database, not two. */
export async function loadProgressAndZone(db: SupabaseClient, userId: string, now = new Date()): Promise<{ progress: Progress; timeZone: string | null }> {
  // The learner's own day is known only after the profile arrives, so ask for one extra day of activity and trim below.
  const roughSince = lastDays(localDay(now, "UTC"), 122)[0];
  const [{ data: profile }, attempts, xp, activityRaw] = await Promise.all([
    db.from("profiles").select("display_name, daily_goal, time_zone").eq("user_id", userId).maybeSingle(),
    db.from("attempts").select("id, lesson_id, finished_at").eq("user_id", userId),
    db.from("xp_events").select("attempt_id, amount").eq("user_id", userId),
    db.from("daily_activity").select("day, lessons_done").eq("user_id", userId).gte("day", roughSince),
  ]);
  const today = localDay(now, profile?.time_zone);
  const since = lastDays(today, 120)[0];
  const activity = { data: (activityRaw.data ?? []).filter((d) => (d.day as string) >= since) };

  const lessonOfAttempt = new Map<string, string>();
  const finished = new Set<string>();
  const started = new Set<string>();
  for (const a of attempts.data ?? []) {
    lessonOfAttempt.set(a.id, a.lesson_id);
    started.add(a.lesson_id);
    if (a.finished_at) finished.add(a.lesson_id);
  }
  const xpByLesson: Record<string, number> = {};
  let xpTotal = 0;
  for (const e of xp.data ?? []) {
    xpTotal += e.amount;
    const lesson = lessonOfAttempt.get(e.attempt_id);
    if (lesson) xpByLesson[lesson] = (xpByLesson[lesson] ?? 0) + e.amount;
  }
  const days = (activity.data ?? []).filter((d) => d.lessons_done > 0).map((d) => d.day as string);

  const progress: Progress = {
    displayName: profile?.display_name ?? null,
    dailyGoal: profile?.daily_goal ?? 1,
    xpTotal,
    lessonsToday: (activity.data ?? []).find((d) => d.day === today)?.lessons_done ?? 0,
    streak: streakDays(days, today),
    activeDays: days.filter((d) => lastDays(today).includes(d)),
    today,
    finishedLessons: [...finished],
    startedLessons: [...started],
    xpByLesson,
  };
  return { progress, timeZone: profile?.time_zone ?? null };
}
