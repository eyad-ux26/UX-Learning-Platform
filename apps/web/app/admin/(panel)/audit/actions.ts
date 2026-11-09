"use server";

import { actionAdmin, audit, requireFresh, run, AdminError, type ActionResult } from "@/lib/admin/guard";
import { reasonOf } from "@/lib/admin/rules";
import { auditPage, type AuditFilter } from "@/lib/admin/data/audit";
import { toCsv } from "@/lib/admin/csv";

/** CSV of the filtered log (up to 10,000 entries). Super admin only (audit.export), with a fresh code. */
export async function exportAudit(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await actionAdmin("audit.export");
    const reason = reasonOf(f.get("reason"));
    if (!reason) throw new AdminError("invalid", "Write a reason of at least 3 characters.");
    await requireFresh(ctx, f.get("code") as string | null);
    const filter: AuditFilter = JSON.parse(String(f.get("filter") ?? "{}"));
    const { rows } = await auditPage(filter, "all", 1, 10000);
    await audit(ctx, "audit.exported", "audit", null, { after: { filter, rows: rows.length }, reason });
    const cols = ["id", "at", "actor_email", "actor_roles", "action", "area", "target_type", "target_id", "target_label", "before", "after", "reason", "ip", "user_agent", "session_id"];
    return { csv: toCsv(rows as unknown as Record<string, unknown>[], cols, `UXGate audit log exported by ${ctx.email} on ${new Date().toISOString()}`), name: `uxgate-audit-${new Date().toISOString().slice(0, 10)}.csv` };
  });
}
