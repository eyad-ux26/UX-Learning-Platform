import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPath } from "@uxgate/content";
import { buildPathView, pickPath } from "@/lib/learning";
import { streakDays } from "@/lib/progress";
import { allowed } from "@/lib/notifications";
import { planDue } from "@/lib/reminder-plan";
import { loadPrefs, notify } from "./notify";
import { sendReminderEmail } from "./account-email";

type Candidate = {
  user_id: string;
  email: string | null;
  locale: string;
  display_name: string | null;
  daily_goal: number;
  current_path_id: string | null;
  local_day: string;
  lessons_today: number;
  active_days: string[];
  reminder_time: string | null;
};

/** The next lesson in the learner's current path, from what they have finished. */
async function nextLesson(db: SupabaseClient, c: Candidate) {
  const { data: onb } = await db
    .from("onboarding")
    .select("recommended_path_id")
    .eq("user_id", c.user_id)
    .maybeSingle();
  const path = pickPath(c.current_path_id ?? (onb?.recommended_path_id as string | null) ?? null);
  if (!path) return null;
  const { data: att } = await db
    .from("attempts")
    .select("lesson_id, finished_at")
    .eq("user_id", c.user_id)
    .not("finished_at", "is", null)
    .limit(1000);
  const finished = (att ?? []).map((a) => a.lesson_id as string);
  const view = buildPathView(
    path.id,
    { finishedLessons: finished, startedLessons: finished, xpByLesson: {} },
    new Set(),
  );
  const next = view?.next;
  if (!next) return null;
  return {
    id: next.lesson.lessonId,
    title: next.lesson.body.title,
    minutes: next.lesson.minutes || 5,
    path: getPath(path.id)?.title.en ?? path.title.en,
  };
}

/**
 * One run (every 15 minutes): everyone whose reminder time is this quarter hour gets at most one reminder that local day. The email_log
 * unique index makes a second email for the same day impossible even if two runs overlap.
 */
export async function runReminders(
  db: SupabaseClient,
  batch = 25,
): Promise<{ sent: number; skipped: number; failed: number; more: boolean }> {
  const { data, error } = await db.rpc("reminder_candidates", { p_limit: batch });
  if (error) throw new Error(`reminder_candidates: ${error.message}`);
  const list = (data ?? []) as Candidate[];
  let sent = 0,
    skipped = 0,
    failed = 0;
  for (const c of list) {
    try {
      const kind = planDue({
        dailyGoal: c.daily_goal,
        lessonsToday: c.lessons_today,
        streak: streakDays(c.active_days ?? [], c.local_day),
        sentToday: false,
      });
      const locale = c.locale === "ar" ? "ar" : "en";
      // Claim the day first: if this insert fails, someone else already sent today's reminder.
      const { error: claim } = await db.from("email_log").insert({
        user_id: c.user_id,
        kind: kind ?? "reminder",
        day: c.local_day,
        provider_id: kind ? null : "skipped",
      });
      if (claim) {
        skipped++;
        continue;
      }
      if (!kind) {
        skipped++;
        continue;
      }
      const prefs = await loadPrefs(db, c.user_id);
      const lesson = await nextLesson(db, c);
      const href = lesson ? `/app/lesson/${lesson.id}` : "/app";
      await notify(
        c.user_id,
        kind,
        lesson && kind === "reminder" ? { lesson: lesson.title, minutes: lesson.minutes, path: lesson.path } : {},
        href,
        { db, prefs, locale },
      );
      if (c.email && allowed(prefs, kind, "email")) {
        const id = await sendReminderEmail({
          userId: c.user_id,
          to: c.email,
          locale,
          name: c.display_name ?? "",
          kind,
          lesson,
          streak: streakDays(c.active_days ?? [], c.local_day),
          lessonsToday: c.lessons_today,
          dailyGoal: c.daily_goal,
          reminderTime: c.reminder_time ?? "20:00",
        });
        if (id)
          await db
            .from("email_log")
            .update({ provider_id: id })
            .eq("user_id", c.user_id)
            .eq("day", c.local_day)
            .in("kind", ["reminder", "goal"]);
      }
      sent++;
    } catch (e) {
      failed++;
      console.warn(`WARN reminders: ${c.user_id}: ${(e as Error).message}`);
      if (/subrequest/i.test((e as Error).message)) break;
    }
  }
  return { sent, skipped, failed, more: list.length === batch };
}

/** Accounts whose 30 days have passed are removed; every learner table cascades from auth.users. */
export async function purgeDeleted(db: SupabaseClient, now = new Date(), batch = 20): Promise<number> {
  const { data } = await db.from("profiles").select("user_id").lt("delete_after", now.toISOString()).limit(batch);
  let n = 0;
  for (const r of data ?? []) {
    const { error } = await db.auth.admin.deleteUser(r.user_id as string);
    if (!error) n++;
    else console.warn(`WARN purge: ${r.user_id}: ${error.message}`);
  }
  return n;
}
