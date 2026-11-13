import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { longDate } from "@/lib/reminder-plan";
import { sendEmail } from "./email/send";
import { trialEmail } from "./email/templates";
import { siteOrigin } from "@/lib/email-token";

/**
 * Daily job (0062): "your trial ends in 2 days" and "your trial ended", once each. Both are about the learner's plan,
 * so they arrive whatever the notification choices are (like billing emails). The mark comes first, so two runs at
 * once never send twice; an email that fails is not retried (the learner still sees the trial on Plan and billing).
 * Does nothing before 0062 or while email cannot go out.
 */
export async function sendTrialEmails(db: SupabaseClient, limit = 50): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0 };
  const { data, error } = await db.rpc("trials_due", { p_limit: limit });
  if (error || !Array.isArray(data)) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (const row of data as {
    user_id: string;
    kind: "reminder" | "ended";
    ends_at: string;
    email: string | null;
    locale: string;
  }[]) {
    const { error: me } = await db.rpc("trial_mark", { p_user: row.user_id, p_kind: row.kind });
    if (me || !row.email) continue;
    const locale = row.locale === "ar" ? "ar" : "en";
    const mail = trialEmail({
      locale,
      kind: row.kind,
      endsOn: longDate(row.ends_at, locale),
      plansHref: `${siteOrigin()}/${locale}/app/plans`,
    });
    const r = await sendEmail({ to: row.email, ...mail, kind: "billing", userId: row.user_id, locale });
    if (r.ok) {
      sent++;
      await db.from("email_log").insert({
        user_id: row.user_id,
        kind: "trial",
        day: new Date().toISOString().slice(0, 10),
        provider_id: r.id ?? null,
      });
    } else failed++;
  }
  return { sent, failed };
}
