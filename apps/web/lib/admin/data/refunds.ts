import "server-only";
// Refunds from the panel (BIL-3). The rule: a full refund within 7 days of the charge. A support agent refunds up to the
// limit in Support settings (USD, other currencies at the panel's rate) inside the 7 days; anything else needs
// refunds.approve_any, or goes to Approvals for a second person. The money moves at Paddle or Paymob; their refund
// webhook then marks the payment refunded, ends the plan and sends the learner the refund email in their language.
import { createAdminClient } from "@/lib/supabase/admin";
import { applyEvent } from "@/lib/billing/engine";
import { billingEngine } from "@/lib/server/billing";
import { refundTransaction as refundPaddle } from "@/lib/server/billing/paddle-api";
import { refundTransaction as refundPaymob } from "@/lib/server/billing/paymob-api";
import { AdminError, allowed, audit, check, type AdminCtx } from "../guard";
import { toUsd } from "../format";
import { replyOnTicket, ticketFor } from "./support";

export const REFUND_DAYS = 7;

export type PaymentRow = {
  id: string; user_id: string; subscription_id: string | null; provider: "paymob" | "paddle" | "mock"; provider_payment_id: string; receipt_no: string;
  kind: string; period: string; amount_minor: number; currency: string; status: "paid" | "refunded"; pay_method: string | null; card_brand: string | null;
  card_last4: string | null; paid_at: string; period_end: string | null; refunded_at: string | null; refund_sent_at: string | null; refund_sent_by: string | null;
};

export const PAYMENT_COLS = "id, user_id, subscription_id, provider, provider_payment_id, receipt_no, kind, period, amount_minor, currency, status, pay_method, card_brand, card_last4, paid_at, period_end, refunded_at, refund_sent_at, refund_sent_by";

/** The 7-day rule for one charge, said plainly. */
export function refundRule(paidAt: string, now = Date.now()): { inside: boolean; days: number; text: string } {
  const days = Math.floor((now - new Date(paidAt).getTime()) / 86_400_000);
  const inside = days < REFUND_DAYS;
  const left = REFUND_DAYS - days;
  return { inside, days, text: inside ? `Inside 7 days · ${left === 1 ? "last day" : `${left} days left`}` : `Outside 7 days · charged ${days} days ago` };
}

export async function refundLimitUsdMinor(): Promise<number> {
  const { data } = await createAdminClient().from("support_settings").select("refund_limit_usd_minor").eq("id", 1).maybeSingle();
  return data?.refund_limit_usd_minor ?? 5000;
}

/** Why this admin cannot refund this payment alone, or null when they can. */
export function needsSecondPerson(ctx: AdminCtx, pay: Pick<PaymentRow, "amount_minor" | "currency" | "paid_at">, limitUsdMinor: number, now = Date.now()): string | null {
  if (allowed(ctx, "refunds.approve_any")) return null;
  const rule = refundRule(pay.paid_at, now);
  if (!rule.inside) return "outside the 7 days";
  const usd = toUsd(pay.amount_minor, pay.currency);
  if (!usd || usd.minor > limitUsdMinor) return "over your limit";
  return null;
}

/** Asks the provider for a full refund. Test-mode payments are refunded through the engine at once. */
export async function refundNow(ctx: AdminCtx, input: { requestId: string | null; paymentId: string; reply: string | null; approvedBy: string | null }): Promise<void> {
  const db = createAdminClient();
  const pay = check(await db.from("payments").select(PAYMENT_COLS).eq("id", input.paymentId).maybeSingle()) as PaymentRow | null;
  if (!pay) throw new AdminError("invalid", "That payment was not found.");
  if (pay.status === "refunded") throw new AdminError("conflict", "This payment is already refunded.");
  if (pay.refund_sent_at && Date.now() - new Date(pay.refund_sent_at).getTime() < 86_400_000) throw new AdminError("conflict", "A refund for this payment was already sent. Wait for the provider to confirm.");
  if (pay.provider === "paddle") await refundPaddle(pay.provider_payment_id, "Refund approved by UXGate support");
  else if (pay.provider === "paymob") await refundPaymob(pay.provider_payment_id, pay.amount_minor);
  check(await db.from("payments").update({ refund_sent_at: new Date().toISOString(), refund_sent_by: ctx.userId }).eq("id", pay.id));
  await audit(ctx, "billing.refund_sent", "billing", { type: "payment", id: pay.id, label: pay.receipt_no },
    { before: { status: pay.status }, after: { status: "processing", provider: pay.provider, approval: input.approvedBy }, reason: input.reply });
  if (pay.provider === "mock") {
    await applyEvent(billingEngine(), { type: "refunded", provider: "mock", eventId: `admin-refund-${pay.id}`, at: new Date().toISOString(), paymentId: pay.provider_payment_id });
  }
  const t = input.requestId ? await ticketFor("refund_request", input.requestId) : null;
  if (t) {
    await db.from("support_messages").insert({ ticket_id: t.id, kind: "event", author_id: ctx.userId, body: `Refund sent to ${pay.provider === "mock" ? "the test provider" : pay.provider === "paddle" ? "Paddle" : "Paymob"} by ${ctx.name}. The learner gets the refund email when the provider confirms.` });
    if (input.reply) await replyOnTicket(ctx, t.id, input.reply, { status: "resolved" });
    else await db.from("support_tickets").update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", t.id);
  }
}

/** Declines a refund request: with a reply it goes on the ticket; without one the learner gets the standard email. */
export async function declineRefund(ctx: AdminCtx, requestId: string, reason: string, reply: string | null): Promise<void> {
  const db = createAdminClient();
  const { data: req } = await db.from("refund_requests").select("id, user_id, payment_id, status").eq("id", requestId).maybeSingle();
  if (!req) throw new AdminError("invalid", "That request was not found.");
  if (req.status !== "waiting") throw new AdminError("conflict", "This request was already answered.");
  const e = billingEngine();
  const at = new Date().toISOString();
  await e.store.answerRefundRequest(req.id, "declined", at);
  await audit(ctx, "billing.refund_declined", "billing", { type: "refund_request", id: req.id, label: null }, { before: { status: "waiting" }, after: { status: "declined" }, reason });
  const t = await ticketFor("refund_request", req.id);
  if (reply && t) {
    await replyOnTicket(ctx, t.id, reply, { status: "resolved" });
    return;
  }
  const request = await e.store.refundRequestFor(req.payment_id);
  const { data: p } = await db.from("payments").select("provider, provider_payment_id, subscription_id").eq("id", req.payment_id).maybeSingle();
  const payment = p ? await e.store.paymentByProviderId(p.provider, p.provider_payment_id) : null;
  const sub = p?.subscription_id ? await e.store.subById(p.subscription_id) : null;
  await e.mail(req.user_id, "refundNo", req.id, { request, payment, sub });
  if (t) await db.from("support_tickets").update({ status: "resolved", resolved_at: at, updated_at: at }).eq("id", t.id);
}
