import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { campaignEmail } from "./email/campaign";
import { sendEmail } from "./email/send";
import { siteOrigin, unsubHref } from "@/lib/email-token";

/**
 * The 15-minute job: sends the next batch of a scheduled campaign (0063) whose time has come, in each person's
 * language, with a one-click "turn off news emails" link. Each person is marked in campaign_sends before their email
 * goes, so nobody gets a campaign twice. About 100 a run (a Worker request has a subrequest budget). No-op before 0063
 * or without email.
 */
export async function sendCampaignBatch(db: SupabaseClient, limit = 100, now = new Date()): Promise<{ campaign: string | null; sent: number; failed: number; done: boolean }> {
  const none = { campaign: null, sent: 0, failed: 0, done: false };
  if (!process.env.RESEND_API_KEY) return none;
  const { data: c, error } = await db.from("campaigns").select("id, subject, body, button, sent_count, failed_count, status")
    .in("status", ["scheduled", "sending"]).lte("send_at", now.toISOString()).order("send_at").limit(1).maybeSingle();
  if (error || !c) return none;
  if (c.status === "scheduled") {
    // Counted again at send time: if the audience grew past what was allowed or approved, it goes back to draft.
    const { data: st, error: se } = await db.rpc("campaign_start", { p_campaign: c.id });
    if (se || st !== "sending") return { ...none, campaign: c.id as string };
  }
  const { data: next, error: ne } = await db.rpc("campaign_next", { p_campaign: c.id, p_limit: limit });
  if (ne) return none;
  const people = (next ?? []) as { user_id: string; email: string; locale: string }[];
  let sent = 0;
  let failed = 0;
  for (const p of people) {
    const { error: me } = await db.from("campaign_sends").insert({ campaign_id: c.id, user_id: p.user_id });
    if (me) continue; // already sent by another run
    const locale = p.locale === "ar" ? "ar" : "en";
    const b = c.button as { en: string; ar: string; href: string } | null;
    let unsub = `${siteOrigin()}/${locale}/app/settings/notifications`;
    try { unsub = await unsubHref(p.user_id, "news", locale); } catch { /* no link secret: the settings link stays */ }
    const mail = campaignEmail({ locale, subject: (c.subject as Record<string, string>)[locale], body: (c.body as Record<string, string>)[locale], button: b ? { label: b[locale], href: `${siteOrigin()}/${locale}${b.href}` } : null, unsubscribeHref: unsub });
    const r = await sendEmail({ to: p.email, ...mail, kind: "news", userId: p.user_id, locale, headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
    if (r.ok) {
      sent++;
      if (r.id) await db.from("campaign_sends").update({ provider_id: r.id }).eq("campaign_id", c.id).eq("user_id", p.user_id);
      await db.from("email_log").insert({ user_id: p.user_id, kind: "news", day: now.toISOString().slice(0, 10), provider_id: r.id ?? null });
    } else failed++;
  }
  const done = people.length < limit;
  await db.from("campaigns").update({ sent_count: Number(c.sent_count) + sent, failed_count: Number(c.failed_count) + failed, ...(done ? { status: "sent" } : {}) }).eq("id", c.id).neq("status", "cancelled");
  return { campaign: c.id as string, sent, failed, done };
}
