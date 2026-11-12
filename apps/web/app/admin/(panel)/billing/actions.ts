"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, allowed, audit, check, requireFresh, run, who, type ActionResult } from "@/lib/admin/guard";
import { dateFrom, intFrom, reasonFrom, textFrom, uuidFrom } from "@/lib/admin/form";
import { AGENT_COMP_DAYS } from "@/lib/admin/rules";
import { fmtMoney, toUsd } from "@/lib/admin/format";
import { toCsv } from "@/lib/admin/csv";
import { declineRefund, needsSecondPerson, PAYMENT_COLS, refundLimitUsdMinor, refundNow, refundRule, type PaymentRow } from "@/lib/admin/data/refunds";
import { accountantRows, people, waitingRefundApproval } from "@/lib/admin/data/billing";
import { applyEvent } from "@/lib/billing/engine";
import { paddleEvents } from "@/lib/billing/paddle";
import { confirmTransaction, transactionEvent } from "@/lib/billing/paymob";
import { fetchTransaction } from "@/lib/server/billing/paymob-api";
import { billingEngine } from "@/lib/server/billing";
import { STUDENT_VALID_DAYS } from "@/lib/billing/student";

type R = ActionResult;

// ───────── comp access ─────────

export async function grantComp(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comp.grant", "learners.act");
    const user = uuidFrom(f.get("user"));
    const until = dateFrom(f, "until");
    if (!until) throw new AdminError("invalid", "Pick the day free Pro ends.");
    if (!allowed(ctx, "comp.grant") && until.getTime() > Date.now() + (AGENT_COMP_DAYS + 1) * 86_400_000) {
      throw new AdminError("forbidden", `Support can give Pro for up to ${AGENT_COMP_DAYS} days. Ask a support lead or billing manager for longer.`);
    }
    const why = textFrom(f, "kind", 40) ?? "Other";
    const reason = `${why}: ${reasonFrom(f)}`.slice(0, 500);
    check(await createAdminClient().rpc("admin_grant_comp", { ...who(ctx), p_user: user, p_until: until.toISOString(), p_reason: reason }));
  }, "Free Pro granted.");
}

export async function endComp(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comp.grant", "learners.act");
    check(await createAdminClient().rpc("admin_end_comp", { ...who(ctx), p_user: uuidFrom(f.get("user")), p_reason: reasonFrom(f) }));
  }, "Free Pro ended.");
}

// ───────── refunds ─────────

async function loadPayment(id: string): Promise<PaymentRow> {
  const { data } = await createAdminClient().from("payments").select(PAYMENT_COLS).eq("id", id).maybeSingle();
  if (!data) throw new AdminError("invalid", "That payment was not found.");
  return data as PaymentRow;
}

/**
 * Refund a payment, from a learner's request or from the payment itself. Inside the 7 days and the agent limit it is
 * sent at once; otherwise someone with refunds.approve_any sends it (with a fresh code over the limit) or it goes to
 * Approvals for a second person.
 */
export async function approveRefund(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("refunds.approve", "refunds.approve_any");
    const reason = reasonFrom(f);
    const reply = textFrom(f, "reply", 5000);
    const requestId = f.get("request") ? uuidFrom(f.get("request")) : null;
    const pay = await loadPayment(uuidFrom(f.get("payment")));
    if (pay.status === "refunded") throw new AdminError("conflict", "This payment is already refunded.");
    const limit = await refundLimitUsdMinor();
    const blocked = needsSecondPerson(ctx, pay, limit);
    const db = createAdminClient();
    if (blocked) {
      if (await waitingRefundApproval(pay.id, requestId)) throw new AdminError("conflict", "A refund for this payment is already waiting for approval. See it in Approvals.");
      const p = (await people([pay.user_id])).get(pay.user_id);
      check(await db.rpc("admin_request_approval", {
        ...who(ctx), p_kind: "refund", p_permission: "refunds.approve_any", p_title: `Refund ${fmtMoney(pay.amount_minor, pay.currency)} to ${p?.email ?? "a learner"}`,
        p_detail: { requestId, paymentId: pay.id, reply, amountMinor: pay.amount_minor, currency: pay.currency, receipt: pay.receipt_no, why: blocked, rule: refundRule(pay.paid_at).text },
        p_target_type: requestId ? "refund_request" : "payment", p_target_id: requestId ?? pay.id, p_reason: reason,
      }));
      return { message: `Sent for approval (${blocked}). A second person with the right role decides in Approvals.` };
    }
    const usd = toUsd(pay.amount_minor, pay.currency)?.minor ?? Number.MAX_SAFE_INTEGER;
    if (usd > limit || !refundRule(pay.paid_at).inside) await requireFresh(ctx, f.get("code") as string | null);
    await refundNow(ctx, { requestId, paymentId: pay.id, reply, approvedBy: null });
    return { message: pay.provider === "mock" ? "Refunded (test provider)." : "Refund sent. It shows Refunded when the provider confirms." };
  });
}

export async function rejectRefund(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("refunds.approve", "refunds.approve_any");
    await declineRefund(ctx, uuidFrom(f.get("request")), reasonFrom(f), textFrom(f, "reply", 5000));
  }, "Request declined. The learner was told.");
}

// ───────── billing problems ─────────

/** Runs one failed webhook event through the same handler again. It never edits a payment by hand. */
export async function retryEvent(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("problems.retry");
    const db = createAdminClient();
    const ev = check(await db.rpc("admin_reset_billing_event", { ...who(ctx), p_event: uuidFrom(f.get("event")) })) as { provider: string; event_id: string; payload: Record<string, unknown> } | null;
    if (!ev) throw new AdminError("invalid", "That event was not found.");
    const engine = billingEngine();
    let events;
    if (ev.provider === "paddle") events = paddleEvents(ev.payload);
    else {
      const obj = (ev.payload.obj ?? ev.payload) as Record<string, unknown>;
      const type = String(ev.payload.type ?? "TRANSACTION").toUpperCase();
      if (type !== "TRANSACTION") throw new AdminError("invalid", "Only payment events can be retried from here. Ask Paymob to resend this callback.");
      const tx = ev.provider === "paymob" ? confirmTransaction(obj, await fetchTransaction(String(obj.id))) : obj;
      if (!tx) throw new AdminError("failed", "Paymob does not confirm this transaction. Nothing was changed.");
      events = [transactionEvent(tx, ev.provider === "mock" ? "mock" : "paymob")];
    }
    for (const e of events) {
      if (e.eventId !== ev.event_id) continue;
      await applyEvent(engine, e, ev.payload);
    }
    const { data: after } = await db.from("billing_events").select("processed_at, error").eq("provider", ev.provider).eq("event_id", ev.event_id).maybeSingle();
    if (!after?.processed_at) throw new AdminError("failed", `It failed again: ${after?.error ?? "unknown error"}. Nothing else was changed.`);
  }, "Applied. The payment now shows its new state.");
}

// ───────── discount codes ─────────

const CODE = /^[A-Z0-9]{3,24}$/;

/** A new code for the FOUNDING offer (30% off the first annual year), with its own limits, so campaigns can be compared. */
export async function createCode(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("discounts.create");
    const code = String(f.get("code") ?? "").trim().toUpperCase();
    if (!CODE.test(code)) throw new AdminError("invalid", "Use 3 to 24 letters and numbers, no spaces.");
    const region = textFrom(f, "region", 10);
    if (region && !["eg", "gulf", "arab", "world"].includes(region)) throw new AdminError("invalid", "Pick a region.");
    const ends = dateFrom(f, "ends");
    if (ends && ends.getTime() < Date.now()) throw new AdminError("invalid", "Pick an end date in the future.");
    const row = {
      code, kind: "founding", percent: 30, period: "year", region: region || null, first_period_only: true, active: true,
      max_uses: intFrom(f, "max_uses", 1, 100000, "max uses"), ends_at: ends?.toISOString() ?? null, note: textFrom(f, "note", 300), created_by: ctx.userId,
    };
    const r = await createAdminClient().from("discount_codes").insert(row);
    if (r.error?.code === "23505") throw new AdminError("conflict", `${code} already exists. Pick another name.`);
    check(r);
    await audit(ctx, "discounts.created", "billing", { type: "discount_code", id: code, label: code }, { after: row, reason: row.note });
  }, "Code created. Learners can use it now.");
}

export async function setCodeState(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("discounts.edit");
    const code = String(f.get("code") ?? "").toUpperCase();
    const to = String(f.get("to"));
    if (!CODE.test(code) || !["pause", "resume", "end"].includes(to)) throw new AdminError("invalid", "Reload the page and try again.");
    const reason = reasonFrom(f);
    const db = createAdminClient();
    const { data: before } = await db.from("discount_codes").select("active, ends_at").eq("code", code).maybeSingle();
    if (!before) throw new AdminError("invalid", "That code was not found.");
    const patch = to === "end" ? { active: false, ends_at: new Date().toISOString() } : { active: to === "resume" };
    check(await db.from("discount_codes").update(patch).eq("code", code));
    await audit(ctx, `discounts.${to === "end" ? "ended" : to === "pause" ? "paused" : "resumed"}`, "billing", { type: "discount_code", id: code, label: code }, { before, after: patch, reason });
  }, "Saved.");
}

// ───────── student checks ─────────

/** Turns the student price on for a year, for a learner whose proof the team checked (for example a card sent to support). */
export async function approveStudent(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("students.review");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    const db = createAdminClient();
    const { data: u } = await db.auth.admin.getUserById(user);
    if (!u?.user?.email) throw new AdminError("invalid", "That learner was not found.");
    const now = new Date();
    const row = { user_id: user, email: u.user.email.toLowerCase(), token_hash: null, verified_at: now.toISOString(), valid_until: new Date(now.getTime() + STUDENT_VALID_DAYS * 86_400_000).toISOString() };
    check(await db.from("student_checks").upsert(row, { onConflict: "user_id" }));
    await audit(ctx, "students.approved", "billing", { type: "learner", id: user, label: u.user.email }, { after: { valid_until: row.valid_until }, reason });
  }, "Student price is on for a year.");
}

export async function endStudent(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("students.review");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    const db = createAdminClient();
    const { data: before } = await db.from("student_checks").select("valid_until").eq("user_id", user).maybeSingle();
    check(await db.from("student_checks").update({ valid_until: new Date().toISOString() }).eq("user_id", user));
    await audit(ctx, "students.ended", "billing", { type: "learner", id: user, label: null }, { before, after: { valid_until: "now" }, reason });
  }, "Student price ended. Plans already paid keep their price until renewal.");
}

// ───────── revenue export ─────────

export async function exportMonth(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("billing.export");
    const reason = reasonFrom(f);
    await requireFresh(ctx, f.get("code") as string | null);
    const m = String(f.get("month") ?? "");
    if (!/^\d{4}-\d{2}$/.test(m)) throw new AdminError("invalid", "Pick a month.");
    const start = new Date(`${m}-01T00:00:00Z`);
    const rows = await accountantRows(start);
    await audit(ctx, "billing.exported", "billing", null, { after: { month: m, rows: rows.length }, reason });
    const cols = ["date", "type", "receipt", "provider", "provider_id", "plan", "currency", "amount", "usd", "usd_rate_date"];
    return { csv: toCsv(rows, cols, `UXGate payments ${m} exported by ${ctx.email} on ${new Date().toISOString()}. Fees are in the Paddle and Paymob statements.`), name: `uxgate-payments-${m}.csv` };
  });
}
