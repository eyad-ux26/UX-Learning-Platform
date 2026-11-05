import type { SupabaseClient } from "@supabase/supabase-js";
import { lastDays, localDay, streakDays, type Progress } from "../progress";

/** Everything Home and the path map need, read with the learner's own session (RLS lets them read only their rows). */
export async function loadProgress(db: SupabaseClient, userId: string, now = new Date()): Promise<Progress> {
  return (await loadProgressAndZone(db, userId, now)).progress;
}

/** One started lesson: did any play of it finish, and how much XP it earned. */
type LessonRow = { lesson_id: string; finished: boolean; xp: number };

/**
 * Per-lesson totals, summed in the database (migration 0008) so a page never pulls the learner's whole attempt and
 * XP history. Until 0008 is applied it falls back to reading the rows.
 */
async function lessonRows(db: SupabaseClient, userId: string): Promise<LessonRow[]> {
  const summary = await db.rpc("my_lesson_progress", { p_user: userId });
  if (!summary.error) return (summary.data ?? []) as LessonRow[];
  const [attempts, xp] = await Promise.all([
    db.from("attempts").select("id, lesson_id, finished_at").eq("user_id", userId),
    db.from("xp_events").select("attempt_id, amount").eq("user_id", userId),
  ]);
  const rows = new Map<string, LessonRow>();
  const lessonOf = new Map<string, string>();
  for (const a of attempts.data ?? []) {
    lessonOf.set(a.id, a.lesson_id);
    const r = rows.get(a.lesson_id) ?? { lesson_id: a.lesson_id, finished: false, xp: 0 };
    r.finished ||= !!a.finished_at;
    rows.set(a.lesson_id, r);
  }
  for (const e of xp.data ?? []) { const r = rows.get(lessonOf.get(e.attempt_id) ?? ""); if (r) r.xp += e.amount; }
  return [...rows.values()];
}

/** loadProgress plus the learner's time zone. All reads go out at once: one round trip to the database. */
export async function loadProgressAndZone(db: SupabaseClient, userId: string, now = new Date()): Promise<{ progress: Progress; timeZone: string | null }> {
  // The learner's own day is known only after the profile arrives, so ask for one extra day of activity and trim below.
  const roughSince = lastDays(localDay(now, "UTC"), 122)[0];
  const [{ data: profile }, lessons, activityRaw] = await Promise.all([
    db.from("profiles").select("display_name, daily_goal, time_zone").eq("user_id", userId).maybeSingle(),
    lessonRows(db, userId),
    db.from("daily_activity").select("day, lessons_done, goal_met, freeze_used").eq("user_id", userId).gte("day", roughSince),
  ]);
  const today = localDay(now, profile?.time_zone);
  const since = lastDays(today, 120)[0];
  const activity = { data: (activityRaw.data ?? []).filter((d) => (d.day as string) >= since) };

  const finished = lessons.filter((l) => l.finished).map((l) => l.lesson_id);
  const started = lessons.map((l) => l.lesson_id);
  const xpByLesson: Record<string, number> = {};
  let xpTotal = 0;
  for (const l of lessons) { xpTotal += l.xp; if (l.xp) xpByLesson[l.lesson_id] = l.xp; }
  const days = (activity.data ?? []).filter((d) => d.lessons_done > 0).map((d) => d.day as string);
  const frozenDays = (activity.data ?? []).filter((d) => d.freeze_used).map((d) => d.day as string);
  const week: Record<string, { lessons: number; goalMet: boolean }> = {};
  for (const d of activity.data ?? []) if (d.day >= lastDays(today, 14)[0]) week[d.day as string] = { lessons: d.lessons_done, goalMet: !!d.goal_met };

  const progress: Progress = {
    displayName: profile?.display_name ?? null,
    dailyGoal: profile?.daily_goal ?? 1,
    xpTotal,
    lessonsToday: (activity.data ?? []).find((d) => d.day === today)?.lessons_done ?? 0,
    streak: streakDays(days, today, frozenDays),
    activeDays: days.filter((d) => lastDays(today).includes(d)),
    frozenDays: frozenDays.filter((d) => lastDays(today).includes(d)),
    recentActivity: week,
    today,
    finishedLessons: finished,
    startedLessons: started,
    xpByLesson,
  };
  return { progress, timeZone: profile?.time_zone ?? null };
}
