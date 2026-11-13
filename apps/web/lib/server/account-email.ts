import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteOrigin, unsubHref } from "@/lib/email-token";
import { deletedEmail, goalEmail, reminderEmail } from "./email/templates";
import { sendEmail } from "./email/send";

/** "8:00 PM" / "8:00 م" with Western digits, from the "HH:MM[:SS]" the learner set. */
export function reminderTimeLabel(hhmm: string, locale: "en" | "ar"): string {
  const [h, m] = hhmm.split(":").map((x) => Number(x) || 0);
  const at = new Date(Date.UTC(2026, 0, 1, h, m));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(at);
}

/** The "account set to be deleted" email, with the undo date. Logged in email_log; never blocks the delete. */
export async function sendDeletedEmail(input: {
  userId: string;
  to: string;
  name: string;
  locale: "en" | "ar";
  date: Date;
}): Promise<void> {
  const signinHref = `${siteOrigin()}/${input.locale}/signin`;
  const mail = deletedEmail({ locale: input.locale, deleteAfter: input.date, signinHref });
  const r = await sendEmail({ to: input.to, ...mail, kind: "deleted", userId: input.userId, locale: input.locale });
  if (r.ok) {
    await createAdminClient()
      .from("email_log")
      .insert({
        user_id: input.userId,
        kind: "deleted",
        day: new Date().toISOString().slice(0, 10),
        provider_id: r.id ?? null,
      });
  }
}

/** Today's one reminder email (the "goal still open" copy when kind is "goal"). Returns the provider's id when sent. */
export async function sendReminderEmail(input: {
  userId: string;
  to: string;
  locale: "en" | "ar";
  name: string;
  kind: "reminder" | "goal";
  lesson: { id: string; title: { en: string; ar: string }; minutes: number; path: string } | null;
  streak: number;
  lessonsToday: number;
  dailyGoal: number;
  reminderTime: string;
}): Promise<string | null> {
  const { locale } = input;
  const base = `${siteOrigin()}/${locale}`;
  const lessonHref = input.lesson ? `${base}/app/lesson/${input.lesson.id}` : `${base}/app`;
  const settingsHref = `${base}/app/settings`;
  const unsubscribeHref = await unsubHref(input.userId, input.kind, locale);
  const time = reminderTimeLabel(input.reminderTime, locale);
  const minutes = input.lesson?.minutes ?? 5;
  const mail =
    input.kind === "goal"
      ? goalEmail({
          locale,
          done: input.lessonsToday,
          goal: input.dailyGoal,
          minutes,
          lessonHref,
          time,
          settingsHref,
          unsubscribeHref,
          // The next lesson extends the run when nothing is done yet today.
          streak: input.lessonsToday > 0 ? input.streak : input.streak + 1,
        })
      : reminderEmail({
          locale,
          name: input.name,
          lessonTitle: input.lesson ? input.lesson.title[locale] : "UXGate",
          minutes,
          lessonHref,
          time,
          settingsHref,
          unsubscribeHref,
        });
  const r = await sendEmail({ to: input.to, ...mail, kind: input.kind, userId: input.userId, locale });
  return r.ok ? (r.id ?? "sent") : null;
}
