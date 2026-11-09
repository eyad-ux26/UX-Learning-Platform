"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, check, requireFresh, run, who, type ActionResult } from "@/lib/admin/guard";
import { carryOut } from "@/lib/admin/carry-out";
import type { Approval } from "@/lib/admin/approvals";

export async function decideApproval(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await actionAdmin();
    const id = z.string().uuid().parse(f.get("id"));
    const decision = String(f.get("decision"));
    if (!["approved", "declined", "cancelled"].includes(decision)) throw new AdminError("invalid", "Choose approve or decline.");
    const note = String(f.get("reason") ?? "").trim().slice(0, 1000) || null;
    if (decision === "declined" && !note) throw new AdminError("invalid", "Say why you decline, so the person who asked knows.");
    if (decision === "approved") await requireFresh(ctx, f.get("code") as string | null);
    const a = check(await createAdminClient().rpc("admin_decide_approval", { ...who(ctx), p_id: id, p_decision: decision, p_note: note })) as unknown as Approval;
    if (decision === "approved") await carryOut(ctx, a);
  }, "Done.");
}
