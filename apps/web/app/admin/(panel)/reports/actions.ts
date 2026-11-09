"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, allowed, audit, check, requireFresh, run, type ActionResult } from "@/lib/admin/guard";
import { reasonFrom, textFrom, uuidFrom } from "@/lib/admin/form";
import { RANGES, REPORTS, report, reportReaders, tableCsv, type ReportId } from "@/lib/admin/data/reports";

type R = ActionResult;
const idFrom = (f: FormData): ReportId => {
  const id = String(f.get("report") ?? "") as ReportId;
  if (!REPORTS[id]) throw new AdminError("invalid", "Pick a report.");
  return id;
};
const rangeFrom = (f: FormData): number => {
  const n = Number(f.get("range"));
  if (!(RANGES as readonly number[]).includes(n)) throw new AdminError("invalid", "Pick a range.");
  return n;
};

/** A report as CSV. Counts only, no names or emails, but still logged with a reason like every export. */
export async function exportReport(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("reports.view");
    const id = idFrom(f);
    if (!allowed(ctx, REPORTS[id].needs)) throw new AdminError("forbidden", "Your roles do not allow this report.");
    const days = rangeFrom(f);
    await requireFresh(ctx, f.get("code") as string | null);
    const t = await report(id, days);
    await audit(ctx, "report.exported", "grow", { type: "report", id, label: `${REPORTS[id].label}, last ${days} days` }, { reason: reasonFrom(f) });
    return { csv: tableCsv(t), name: `uxgate-${id}-${days}d-${new Date().toISOString().slice(0, 10)}.csv` };
  });
}

/** Saves a report view; a weekly one is emailed on Mondays to the team members picked. */
export async function saveReport(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("reports.schedule");
    const id = idFrom(f);
    if (!allowed(ctx, REPORTS[id].needs)) throw new AdminError("forbidden", "Your roles do not allow this report.");
    const days = rangeFrom(f);
    const name = textFrom(f, "name", 80, true, "a name")!;
    if (name.length < 3) throw new AdminError("invalid", "Write a name of at least 3 characters.");
    const weekly = f.get("weekly") === "1";
    const picked = [...new Set(f.getAll("to").map(String))].slice(0, 20);
    // Weekly reports only go to active team members whose roles allow this report (never to an address typed in).
    const readers = picked.length ? await reportReaders(id) : [];
    const recipients = readers.filter((m) => picked.includes(m.email)).map((m) => m.email);
    if (recipients.length < picked.length) throw new AdminError("invalid", `Some people you picked cannot see the ${REPORTS[id].label} report, so they cannot get it. Untick them.`);
    if (weekly && !recipients.length) throw new AdminError("invalid", "Pick at least one team member to email it to.");
    const row = check(await createAdminClient().from("admin_saved_reports").insert({ name, report: id, range_days: days, weekly, recipients, created_by: ctx.userId }).select("id").single());
    await audit(ctx, "report.saved", "grow", { type: "saved_report", id: (row as { id: string }).id, label: name }, { after: { report: id, days, weekly, recipients } });
  }, "Report saved.");
}

export async function deleteSavedReport(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("reports.schedule");
    const id = uuidFrom(f.get("id"));
    const db = createAdminClient();
    const { data: before } = await db.from("admin_saved_reports").select("name, report, weekly, recipients, created_by").eq("id", id).maybeSingle();
    if (!before) throw new AdminError("conflict", "That report is gone. Reload the page.");
    // Only the person who saved it, or an admin, removes a saved report.
    if (before.created_by !== ctx.userId && !ctx.roles.some((r) => r === "admin" || r === "super_admin")) throw new AdminError("forbidden", "Only the person who saved this report, or an admin, can remove it.");
    check(await db.from("admin_saved_reports").delete().eq("id", id));
    await audit(ctx, "report.deleted", "grow", { type: "saved_report", id, label: before.name as string }, { before });
  }, "Saved report removed.");
}
