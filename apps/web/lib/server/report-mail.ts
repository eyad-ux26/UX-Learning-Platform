import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { report, REPORTS, type ReportId } from "@/lib/admin/data/reports";
import { emailLayout } from "./email/layout";
import { sendEmail } from "./email/send";
import { siteOrigin } from "@/lib/email-token";

/**
 * Daily job, Mondays only (Cairo): emails each weekly saved report (0063) to the team members it names. Counts only,
 * never learner names. Marked before sending, so a second run that day sends nothing. No-op before 0063 or without email.
 */
export async function sendWeeklyReports(db: SupabaseClient, now = new Date()): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) return { sent: 0, failed: 0 };
  const day = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "Africa/Cairo" }).format(now);
  if (day !== "Mon") return { sent: 0, failed: 0 };
  const cutoff = new Date(now.getTime() - 6 * 86_400_000).toISOString();
  const { data, error } = await db.from("admin_saved_reports").select("id, name, report, range_days, recipients, last_sent_at").eq("weekly", true).or(`last_sent_at.is.null,last_sent_at.lt.${cutoff}`).limit(20);
  if (error || !data) return { sent: 0, failed: 0 };
  const { data: team } = await db.from("admin_members").select("email").eq("status", "active");
  const active = new Set((team ?? []).map((m) => String(m.email).toLowerCase()));
  let sent = 0;
  let failed = 0;
  for (const s of data as { id: string; name: string; report: ReportId; range_days: number; recipients: string[] }[]) {
    await db.from("admin_saved_reports").update({ last_sent_at: now.toISOString() }).eq("id", s.id);
    const t = await report(s.report, s.range_days, db, now.getTime());
    const top = t.rows.slice(0, 12).map((r) => [String(r[0]), r.slice(1).map((v) => (typeof v === "number" ? v.toLocaleString("en") : v)).join(" · ")] as [string, string]);
    const total = t.total ? [[String(t.total[0]), t.total.slice(1).filter((v) => v !== "").map((v) => (typeof v === "number" ? v.toLocaleString("en") : v)).join(" · ")] as [string, string]] : [];
    const mail = emailLayout({
      locale: "en", preheader: `${REPORTS[s.report]?.label ?? s.report}, last ${s.range_days} days`, heading: s.name,
      paragraphs: [`${REPORTS[s.report]?.sub ?? ""} Columns: ${t.columns.slice(1).join(" · ")}.`],
      table: [...top, ...total], button: { label: "Open in the admin panel", href: `${siteOrigin()}/admin/reports?r=${s.report}&days=${s.range_days}` },
      footer: "transactional", why: "You get this because a team member added you to a weekly report in the UXGate admin panel.",
    });
    for (const to of s.recipients.filter((r) => active.has(r.toLowerCase()))) {
      const r = await sendEmail({ to, subject: `Weekly report: ${s.name}`, ...mail, kind: "admin_report" });
      if (r.ok) sent++; else failed++;
    }
  }
  return { sent, failed };
}
