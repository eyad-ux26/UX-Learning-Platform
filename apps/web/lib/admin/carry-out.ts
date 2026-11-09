import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminError, audit, type AdminCtx } from "./guard";
import type { Approval } from "./approvals";
import { refundNow } from "./data/refunds";

/** Carries out an approved request. If the provider refuses, the approval is marked failed and the error is shown. */
export async function carryOut(ctx: AdminCtx, a: Approval): Promise<void> {
  try {
    if (a.kind === "refund") {
      const d = a.detail as { requestId?: string; paymentId?: string; reply?: string };
      await refundNow(ctx, { requestId: d.requestId ?? null, paymentId: String(d.paymentId), reply: d.reply ?? null, approvedBy: a.id });
      return;
    }
    throw new AdminError("failed", `Nothing to carry out for a ${a.kind} request in Phase 1.`);
  } catch (e) {
    await createAdminClient().from("admin_approvals").update({ status: "failed", note: `${a.note ?? ""} · Failed: ${(e as Error).message}`.slice(0, 1000) }).eq("id", a.id);
    await audit(ctx, "approval.failed", "approvals", { type: a.target_type ?? "approval", id: a.target_id ?? a.id, label: a.title }, { after: { error: (e as Error).message } });
    throw e instanceof AdminError ? e : new AdminError("failed", `Approved, but it could not be carried out: ${(e as Error).message}`);
  }
}
