import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtMoney, REGION_LABEL, toUsd } from "@/lib/admin/format";

// Reports (RPT-1 to RPT-5). Each report is a table of counts (never names or emails), so it can be shown, saved,
// downloaded as CSV and emailed to the team every week in the same shape.

export type ReportId = "learning" | "growth" | "money" | "certs";
export type Table = { columns: string[]; rows: (string | number)[][]; total?: (string | number)[]; note?: string };

export const REPORTS: Record<ReportId, { label: string; sub: string; needs: "reports.view" | "revenue.view" }> = {
  learning: { label: "Learning", sub: "Lessons finished, skills shown and kept, and paths finished, per path.", needs: "reports.view" },
  growth: { label: "Growth", sub: "Sign-ups per day and how many went on to learn, try Pro and pay.", needs: "reports.view" },
  money: { label: "Money", sub: "Live paid plans by region, provider and period, with what they renew at.", needs: "revenue.view" },
  certs: { label: "Certificates", sub: "Certificates issued per path, and how many learners share theirs.", needs: "reports.view" },
};
export const RANGES = [7, 30, 90, 365] as const;

const sum = (rows: (string | number)[][], i: number) => rows.reduce((a, r) => a + Number(r[i] || 0), 0);

export async function report(id: ReportId, days: number, db: SupabaseClient = createAdminClient(), now = Date.now()): Promise<Table & { ready: boolean }> {
  const to = new Date(now).toISOString();
  const from = new Date(now - days * 86_400_000).toISOString();
  if (id === "learning") {
    const { data, error } = await db.rpc("admin_report_learning", { p_from: from, p_to: to });
    const rows = ((data ?? []) as { path_id: string; lessons_finished: number; learners: number; skills_shown: number; skills_kept: number; paths_finished: number }[])
      .map((r) => [r.path_id, Number(r.learners), Number(r.lessons_finished), Number(r.skills_shown), Number(r.skills_kept), Number(r.paths_finished)]);
    return { ready: !error, columns: ["Path", "Learners who started a lesson", "Lessons finished", "Skills shown", "Skills kept", "Paths finished"], rows,
      total: ["All paths", "", sum(rows, 2), sum(rows, 3), sum(rows, 4), sum(rows, 5)], note: "Learners are counted once per path; one learner can be in several paths." };
  }
  if (id === "growth") {
    const { data, error } = await db.rpc("admin_report_growth", { p_from: from, p_to: to });
    const rows = ((data ?? []) as { day: string; signups: number; started: number; finished: number; trials: number; paid: number; waitlist: number }[])
      .map((r) => [String(r.day).slice(0, 10), Number(r.signups), Number(r.started), Number(r.finished), Number(r.trials), Number(r.paid), Number(r.waitlist)]);
    return { ready: !error, columns: ["Day", "Sign-ups", "First lesson started", "First lesson finished", "Trials started", "First payments", "Waitlist joins"], rows,
      total: ["Total", ...[1, 2, 3, 4, 5, 6].map((i) => sum(rows, i))], note: "Each learner counts once, on the day they first did it. Test payments are left out." };
  }
  if (id === "money") {
    const { data, error } = await db.rpc("admin_report_money");
    const list = (data ?? []) as { region: string; provider: string; period: string; currency: string; plans: number; renew_minor: number }[];
    const rows = list.map((r) => {
      const monthly = r.period === "year" ? Math.round(Number(r.renew_minor) / 12) : Number(r.renew_minor);
      const usd = toUsd(monthly, r.currency);
      return [REGION_LABEL[r.region] ?? r.region, r.provider, r.period === "year" ? "Annual" : "Monthly", Number(r.plans), fmtMoney(Number(r.renew_minor), r.currency), usd ? fmtMoney(usd.minor, "USD") : "—"];
    });
    return { ready: !error, columns: ["Region", "Provider", "Plan", "Live plans", "Renews at (own currency)", "≈ USD a month"], rows,
      total: ["All", "", "", sum(rows, 3), "", ""], note: "Live today, whatever the range. Comp and test plans are left out. Revenue has the month by month view." };
  }
  const { data, error } = await db.rpc("admin_report_certs", { p_from: from, p_to: to });
  const rows = ((data ?? []) as { path_id: string; issued: number; public: number }[]).map((r) => [r.path_id, Number(r.issued), Number(r.public)]);
  return { ready: !error, columns: ["Path", "Issued", "Shared publicly"], rows, total: ["All paths", sum(rows, 1), sum(rows, 2)] };
}

/** CSV with a BOM so spreadsheet apps read Arabic and symbols right. */
export function tableCsv(t: Table): string {
  const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [t.columns, ...t.rows, ...(t.total ? [t.total] : [])].map((r) => r.map(cell).join(",")).join("\n");
}

export type SavedReport = { id: string; name: string; report: ReportId; range_days: number; weekly: boolean; recipients: string[]; last_sent_at: string | null; created_by: string | null; created_at: string };

export async function savedReports(): Promise<{ rows: SavedReport[]; ready: boolean }> {
  const { data, error } = await createAdminClient().from("admin_saved_reports").select("*").order("created_at", { ascending: false }).limit(100);
  return { rows: (data ?? []) as SavedReport[], ready: !error };
}

/**
 * Active team members whose roles allow this report (reports.view, or revenue.view for Money), for the "Send to" list,
 * when saving and again on every send, so a member who loses the permission stops getting it.
 */
export async function reportReaders(id: ReportId, db: SupabaseClient = createAdminClient()): Promise<{ user_id: string; email: string; display_name: string | null }[]> {
  const { data: team } = await db.from("admin_members").select("user_id, email, display_name").eq("status", "active").order("email");
  const out: { user_id: string; email: string; display_name: string | null }[] = [];
  for (const m of (team ?? []) as { user_id: string; email: string; display_name: string | null }[]) {
    const { data: perms } = await db.rpc("admin_perms", { p_user: m.user_id });
    if (((perms ?? []) as string[]).includes(REPORTS[id].needs)) out.push(m);
  }
  return out;
}
