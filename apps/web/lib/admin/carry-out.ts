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
    if (a.kind === "email") {
      // Phase 2: an announcement or a campaign for more than 500 people waits for this approval, then is scheduled.
      const d = a.detail as { type?: string; id?: string };
      const table = d.type === "announcement" ? "announcements" : d.type === "campaign" ? "campaigns" : null;
      if (!table || !d.id) throw new AdminError("failed", "This request does not name an announcement or a campaign.");
      const { data, error } = await createAdminClient().from(table).update({ status: "scheduled" }).eq("id", d.id).eq("approval_id", a.id).eq("status", "waiting_approval").select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new AdminError("failed", "It changed since it was sent for approval (cancelled or edited).");
      await audit(ctx, `${d.type}.scheduled`, "grow", { type: d.type as string, id: d.id, label: a.title }, { after: { approval: a.id } });
      return;
    }
    if (a.kind === "price") {
      // Phase 2: an approved price change is the record the Prices page shows until the new provider price is in place.
      await audit(ctx, "price.change_approved", "billing", { type: "price", id: a.target_id ?? a.id, label: a.title }, { after: a.detail });
      return;
    }
    throw new AdminError("failed", `Nothing to carry out for a ${a.kind} request.`);
  } catch (e) {
    await createAdminClient().from("admin_approvals").update({ status: "failed", note: `${a.note ?? ""} · Failed: ${(e as Error).message}`.slice(0, 1000) }).eq("id", a.id);
    await audit(ctx, "approval.failed", "approvals", { type: a.target_type ?? "approval", id: a.target_id ?? a.id, label: a.title }, { after: { error: (e as Error).message } });
    throw e instanceof AdminError ? e : new AdminError("failed", `Approved, but it could not be carried out: ${(e as Error).message}`);
  }
}
