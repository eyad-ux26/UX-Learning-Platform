import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPROVAL_REMIND_SECONDS } from "@/lib/admin/rules";
import { sendSurvey } from "@/lib/admin/data/support";
import { emailLayout, siteOrigin } from "@/lib/server/email/layout";
import { sendEmail } from "@/lib/server/email/send";
import { jobJson } from "@/lib/server/job-run";
import { sendCampaignBatch } from "@/lib/server/campaign-send";

export const dynamic = "force-dynamic";

/**
 * Admin panel housekeeping, every 15 minutes (cf-worker.ts): one reminder for approvals still waiting after 4 hours,
 * and tickets waiting on the learner that close by themselves (Support settings, 3 days by default). Safe to repeat.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = createAdminClient();
  const now = Date.now();
  let reminded = 0;
  let closed = 0;

  const { data: waiting, error } = await db.from("admin_approvals").select("id, title, permission, requested_by, created_at").eq("status", "waiting").is("reminded_at", null)
    .lt("created_at", new Date(now - APPROVAL_REMIND_SECONDS * 1000).toISOString()).limit(20);
  if (error) return jobJson("admin", { error: "read_failed", reminded, closed }, { status: 500 });
  if (waiting?.length) {
    const { data: members } = await db.from("admin_members").select("user_id, email").eq("status", "active");
    const perms = new Map<string, string[]>();
    for (const m of members ?? []) {
      const { data: p } = await db.rpc("admin_perms", { p_user: m.user_id });
      perms.set(m.user_id, (p ?? []) as string[]);
    }
    for (const a of waiting) {
      const { data: claimed } = await db.from("admin_approvals").update({ reminded_at: new Date().toISOString() }).eq("id", a.id).is("reminded_at", null).select("id");
      if (!claimed?.length) continue;
      const to = (members ?? []).filter((m) => m.user_id !== a.requested_by && perms.get(m.user_id)?.includes(a.permission)).map((m) => m.email);
      const l = emailLayout({
        locale: "en", preheader: `Waiting for a second person: ${a.title}`, heading: "An approval is still waiting",
        paragraphs: [`“${a.title}” has waited more than 4 hours for someone with the right role to approve or decline it.`],
        button: { label: "Open Approvals", href: `${siteOrigin()}/admin/team/approvals` }, footer: "transactional",
      });
      for (const email of to) await sendEmail({ to: email, subject: `Waiting for approval: ${a.title}`, html: l.html, text: l.text, kind: "admin_approval_reminder" });
      reminded++;
    }
  }

  const { data: cfg } = await db.from("support_settings").select("auto_close_days").eq("id", 1).maybeSingle();
  const days = cfg?.auto_close_days ?? 3;
  const { data: idle } = await db.from("support_tickets").select("id").eq("status", "waiting_learner").lt("last_message_at", new Date(now - days * 86_400_000).toISOString()).limit(50);
  for (const t of idle ?? []) {
    const at = new Date().toISOString();
    const { data: done } = await db.from("support_tickets").update({ status: "resolved", resolved_at: at, updated_at: at }).eq("id", t.id).eq("status", "waiting_learner").select("id");
    if (!done?.length) continue;
    await db.from("support_messages").insert({ ticket_id: t.id, kind: "event", body: `Resolved by itself after ${days} days without a reply from the learner.` });
    await sendSurvey(t.id).catch(() => null);
    closed++;
  }
  // Communications (0063): the next batch of a campaign whose time has come. No-op before 0063 or without email.
  const campaign = await sendCampaignBatch(db).catch(() => null);
  return jobJson("admin", { reminded, closed, campaign });
}
