import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/server/email/send";
import { launchConfirmEmail } from "@/lib/server/email/launch";
import { siteOrigin } from "@/lib/email-token";
import { newToken } from "@/lib/waitlist";

/** Sends one launch-list confirmation email. On failure the row goes back to queued (waitlist_send_failed). */
export async function sendConfirmation(
  db: SupabaseClient,
  to: { email: string; locale: "en" | "ar" },
  token: string,
  hash: string,
  origin: string,
): Promise<boolean> {
  const mail = launchConfirmEmail({ locale: to.locale, href: `${origin}/${to.locale}/coming-soon/confirm?t=${token}` });
  const sent = await sendEmail({ to: to.email, ...mail, kind: "launch-confirm", locale: to.locale });
  if (sent.ok) return true;
  const { error } = await db.rpc("waitlist_send_failed", { p_token_hash: hash });
  if (error) console.error("waitlist: send failed mark", error.code);
  return false;
}

/**
 * Daily job: sends the confirmation link to addresses that joined while email could not go out. Does nothing until
 * RESEND_API_KEY is set. Links point at the site's own address (NEXT_PUBLIC_SITE_URL).
 */
export async function sendQueuedConfirmations(
  db: SupabaseClient,
  limit = 50,
): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0 };
  const { data, error } = await db.rpc("waitlist_queued", { p_limit: limit });
  if (error || !Array.isArray(data)) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (const row of data as { id: string; email: string; locale: string }[]) {
    const { token, hash } = await newToken();
    const { data: ok } = await db.rpc("waitlist_mark_sent", { p_id: row.id, p_token_hash: hash });
    if (ok !== true) continue;
    if (
      await sendConfirmation(
        db,
        { email: row.email, locale: row.locale === "ar" ? "ar" : "en" },
        token,
        hash,
        siteOrigin(),
      )
    )
      sent++;
    else failed++;
  }
  return { sent, failed };
}
