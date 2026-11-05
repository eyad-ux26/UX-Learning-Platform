import { beforeEach, describe, expect, it } from "vitest";
import { applyEvent, cancelPlan, changePlan, resumePlan, syncEntitlement, type Engine, type Session } from "./engine";
import { runDaily, type Charger } from "./daily";
import { MemoryStore } from "./memory-store";
import { makeMailer, type Transport } from "./mailer";
import { hmacHex } from "./crypto";
import { signedString, TOKEN_FIELDS, TRANSACTION_FIELDS, verifyPaymob, transactionEvent } from "./paymob";
import { verifyPaddle } from "./paddle";
import { isPro, welcomeBackEligible } from "./subscription";
import type { BillingEvent } from "./events";

// Acceptance check 2 and 3: subscribe, renew, failed renewal (grace, retries, pause), cancel (access to the period
// end, resume) and refund each change the entitlement only through verified events, send the right email in the
// learner's language, and a repeated event changes nothing.

const U = "11111111-1111-4111-8111-111111111111";
const PAYMOB_SECRET = "paymob-hmac-test";
const PADDLE_SECRET = "pdl_ntfset_test";

let store: MemoryStore;
let sent: { to: string; subject: string; html: string; text: string }[];
let clock: string;
let engine: Engine;

const at = (iso: string) => { clock = new Date(iso).toISOString(); };
const transport: Transport = async (m) => { sent.push(m); return { id: `re_${sent.length}` }; };

function session(over: Partial<Session> = {}): Session {
  const s: Session = {
    id: `5e55${String(store.sessions.size).padStart(4, "0")}-0000-4000-8000-000000000000`, userId: U, kind: "new", subscriptionId: null,
    provider: "paymob", region: "eg", country: "EG", period: "month", discount: null, discountUntil: null, code: null,
    amountMinor: 24900, renewAmountMinor: 24900, currency: "EGP", locale: "ar", status: "open", providerRef: "9001", createdAt: clock, ...over,
  };
  store.sessions.set(s.id, s);
  return s;
}

/** A Paymob transaction callback signed the way Paymob signs it. */
async function paymobCallback(obj: Record<string, unknown>, secret = PAYMOB_SECRET) {
  const full = {
    amount_cents: 24900, created_at: clock, currency: "EGP", error_occured: false, has_parent_transaction: false, id: 1, integration_id: 4100,
    is_3d_secure: true, is_auth: false, is_capture: false, is_refunded: false, is_standalone_payment: true, is_voided: false, order: { id: 9001, merchant_order_id: "" },
    owner: 77, pending: false, source_data: { pan: "4242", sub_type: "Visa", type: "card" }, success: true, ...obj,
  };
  const body = JSON.stringify({ type: "TRANSACTION", obj: full });
  return { body, hmac: await hmacHex("SHA-512", secret, signedString(full, TRANSACTION_FIELDS)) };
}

async function deliverPaymob(obj: Record<string, unknown>) {
  const { body, hmac } = await paymobCallback(obj);
  const v = await verifyPaymob(body, hmac, PAYMOB_SECRET);
  if (!v.ok) throw new Error(v.reason);
  return Promise.all(v.events.map((ev) => applyEvent(engine, ev)));
}

async function deliverPaddle(json: Record<string, unknown>) {
  const body = JSON.stringify(json);
  const ts = String(Math.floor(new Date(clock).getTime() / 1000));
  const sig = `ts=${ts};h1=${await hmacHex("SHA-256", PADDLE_SECRET, `${ts}:${body}`)}`;
  const v = await verifyPaddle(body, sig, PADDLE_SECRET, new Date(clock));
  if (!v.ok) throw new Error(v.reason);
  return Promise.all(v.events.map((ev) => applyEvent(engine, ev)));
}

const ent = () => store.entitlements.get(U) ?? null;
const pro = () => isPro(ent(), new Date(clock));
const sub = () => [...store.subs.values()].find((s) => s.userId === U && ["active", "grace", "cancelled"].includes(s.status)) ?? [...store.subs.values()].at(-1)!;
const subjects = () => sent.map((m) => m.subject);

beforeEach(() => {
  store = new MemoryStore();
  sent = [];
  at("2026-11-03T09:00:00Z");
  store.learners.set(U, { email: "yasmin@example.com", locale: "ar", name: "ياسمين" });
  engine = { store, mail: makeMailer(store, transport, "https://uxgate.org"), seal: async (t) => `sealed:${t}`, now: () => clock };
});

describe("Paymob: subscribe", () => {
  it("a signed payment starts Pro at once and sends the receipt in the learner's language", async () => {
    const s = session();
    expect(pro()).toBe(false);
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(pro()).toBe(true);
    expect(ent()?.validUntil).toBe("2026-12-03T09:00:00.000Z");
    expect(sub()).toMatchObject({ status: "active", period: "month", payMethod: "card", cardLast4: "4242", cardBrand: "Visa", renewAmountMinor: 24900 });
    expect(store.sessions.get(s.id)?.status).toBe("paid");
    expect(subjects()).toEqual(["إيصال UXGate · 249 ج.م"]);
    expect(sent[0].html).toContain('dir="rtl"');
    expect(sent[0].html).toContain("UXG-2026-000001");
  });

  it("the same webhook again changes nothing and sends nothing", async () => {
    const s = session();
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    const before = JSON.stringify([...store.subs.values(), ...store.payments.values(), ent()]);
    const again = await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(again[0].status).toBe("duplicate");
    expect(JSON.stringify([...store.subs.values(), ...store.payments.values(), ent()])).toBe(before);
    expect(sent).toHaveLength(1);
  });

  it("a callback with a bad signature is refused before anything is read", async () => {
    const s = session();
    const { body } = await paymobCallback({ id: 502, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(await verifyPaymob(body, "00".repeat(64), PAYMOB_SECRET)).toEqual({ ok: false, reason: "signature" });
    const forged = await paymobCallback({ id: 502, order: { id: 9001, merchant_order_id: `s_${s.id}` } }, "someone-else");
    expect((await verifyPaymob(forged.body, forged.hmac, PAYMOB_SECRET)).ok).toBe(false);
    // Changing the amount after signing breaks the signature.
    const real = await paymobCallback({ id: 503, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect((await verifyPaymob(real.body.replace("24900", "100"), real.hmac, PAYMOB_SECRET)).ok).toBe(false);
    expect(pro()).toBe(false);
  });

  it("a wallet waiting for approval is pending, then paid; a declined card is failed", async () => {
    const s = session();
    await deliverPaymob({ id: 601, success: false, pending: true, source_data: { pan: "01012344521", sub_type: "wallet", type: "wallet" }, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(store.sessions.get(s.id)?.status).toBe("pending");
    expect(pro()).toBe(false);
    await deliverPaymob({ id: 601, success: true, pending: false, source_data: { pan: "01012344521", sub_type: "wallet", type: "wallet" }, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(pro()).toBe(true);
    expect(sub()).toMatchObject({ payMethod: "wallet", cardLast4: "4521" });
    const s2 = session({ userId: "22222222-2222-4222-8222-222222222222" });
    await deliverPaymob({ id: 602, success: false, order: { id: 9002, merchant_order_id: `s_${s2.id}` } });
    expect(store.sessions.get(s2.id)?.status).toBe("failed");
  });

  it("the saved card token is stored encrypted, never as sent", async () => {
    session({ providerRef: "9001" });
    const obj = { id: 77, token: "card_tok_abc", masked_pan: "xxxx-xxxx-xxxx-4242", merchant_id: 1, card_subtype: "Visa", created_at: clock, email: "y@example.com", order_id: 9001 };
    const body = JSON.stringify({ type: "TOKEN", obj });
    const v = await verifyPaymob(body, await hmacHex("SHA-512", PAYMOB_SECRET, signedString(obj, TOKEN_FIELDS)), PAYMOB_SECRET);
    expect(v.ok).toBe(true);
    if (v.ok) await applyEvent(engine, v.events[0]);
    expect(store.tokens.get(`${U}:paymob`)).toEqual({ token: "sealed:card_tok_abc", card: { method: "card", brand: "Visa", last4: "4242", expiry: null } });
  });
});

describe("renewals, failed renewals and the grace period", () => {
  const ok: Charger = async (s, attempt) => transactionEvent({ id: `r${attempt}-${s.currentPeriodEnd}`, success: true, pending: false, amount_cents: s.renewAmountMinor, currency: "EGP", created_at: clock, order: { merchant_order_id: `r_${s.id}_x_${attempt}` }, source_data: { pan: "4242", sub_type: "Visa", type: "card" } });
  const declined: Charger = async (s, attempt) => transactionEvent({ id: `d${attempt}-${s.currentPeriodEnd}`, success: false, pending: false, created_at: clock, order: { merchant_order_id: `r_${s.id}_x_${attempt}` } });

  beforeEach(async () => {
    const s = session();
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    sent = [];
  });

  it("the daily job renews with the saved card on the charge date and sends a receipt", async () => {
    at("2026-12-03T02:00:00Z");
    const r = await runDaily(engine, ok);
    expect(r.renewed).toBe(1);
    expect(sub()).toMatchObject({ status: "active", currentPeriodStart: "2026-12-03T09:00:00.000Z", currentPeriodEnd: "2027-01-03T09:00:00.000Z" });
    expect(ent()?.validUntil).toBe("2027-01-03T09:00:00.000Z");
    expect(subjects()).toEqual(["إيصال UXGate · 249 ج.م"]);
    // Running the job again the same day does nothing more.
    expect((await runDaily(engine, ok)).renewed).toBe(0);
  });

  it("a declined renewal keeps Pro for 7 days, retries on day 2 and day 5, then pauses Pro and keeps everything", async () => {
    store.learners.set(U, { email: "yasmin@example.com", locale: "en", name: "Yasmin" });
    at("2026-12-03T09:30:00Z");
    await runDaily(engine, declined);
    expect(sub()).toMatchObject({ status: "grace", graceUntil: "2026-12-10T09:00:00.000Z", nextRetryAt: "2026-12-05T09:00:00.000Z" });
    expect(pro()).toBe(true);
    expect(subjects()).toEqual(["We couldn’t take your UXGate payment"]);
    expect(sent[0].text).toContain("we will try again on 5 December and 8 December");

    at("2026-12-04T10:00:00Z"); await runDaily(engine, declined); // not a retry day
    expect(sub().retries).toBe(0);
    at("2026-12-05T10:00:00Z"); await runDaily(engine, declined);
    expect(sub()).toMatchObject({ retries: 1, nextRetryAt: "2026-12-08T09:00:00.000Z" });
    at("2026-12-08T10:00:00Z"); await runDaily(engine, declined);
    expect(sub()).toMatchObject({ retries: 2, nextRetryAt: null });
    expect(pro()).toBe(true);
    expect(sent).toHaveLength(1); // one email for the failed month, not one per retry

    at("2026-12-10T09:00:00Z"); await runDaily(engine, declined);
    expect(sub().status).toBe("paused");
    expect(pro()).toBe(false);
    expect(ent()?.proEndedAt).toBe("2026-12-10T09:00:00.000Z");
  });

  it("a retry that goes through ends the grace period; the billing date does not move", async () => {
    at("2026-12-03T09:30:00Z"); await runDaily(engine, declined);
    at("2026-12-05T10:00:00Z"); await runDaily(engine, ok);
    expect(sub()).toMatchObject({ status: "active", graceUntil: null, currentPeriodStart: "2026-12-03T09:00:00.000Z", currentPeriodEnd: "2027-01-03T09:00:00.000Z" });
    expect(pro()).toBe(true);
  });

  it("a plan change to annual starts at the period end, with the annual price", async () => {
    await changePlan(engine, U, "year");
    expect(sub()).toMatchObject({ period: "month", pendingPeriod: "year", renewAmountMinor: 224900 });
    expect(store.payments.size).toBe(1); // nothing charged today
    at("2026-12-03T10:00:00Z"); await runDaily(engine, ok);
    expect(sub()).toMatchObject({ period: "year", pendingPeriod: null, currentPeriodEnd: "2027-12-03T09:00:00.000Z" });
  });
});

describe("cancel and resume", () => {
  beforeEach(async () => {
    const s = session();
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    sent = [];
  });

  it("cancelling keeps Pro to the end of the paid period, stops renewals, and Pro ends then", async () => {
    at("2026-11-10T12:00:00Z");
    await cancelPlan(engine, U, "It costs too much for me");
    expect(sub()).toMatchObject({ status: "cancelled", cancelReason: "It costs too much for me" });
    expect(pro()).toBe(true);
    expect(subjects()).toEqual(["أُلغيت خطة UXGate Pro"]);
    let charged = 0;
    at("2026-12-03T09:00:00Z");
    await runDaily(engine, async () => { charged++; return null; });
    expect(charged).toBe(0);
    expect(sub().status).toBe("ended");
    expect(pro()).toBe(false);
  });

  it("resuming before the end date changes nothing else", async () => {
    await cancelPlan(engine, U, null);
    await resumePlan(engine, U);
    expect(sub()).toMatchObject({ status: "active", cancelledAt: null, currentPeriodEnd: "2026-12-03T09:00:00.000Z" });
    expect(pro()).toBe(true);
  });
});

describe("refunds", () => {
  it("a refund ends Pro when it is made, answers the request and emails the learner", async () => {
    const s = session();
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    const pay = [...store.payments.values()][0];
    store.requests.set("rq1", { id: "rq1", userId: U, paymentId: pay.id, amountMinor: 24900, currency: "EGP", reason: "wrong plan", status: "waiting", createdAt: clock, answeredAt: null });
    sent = [];
    at("2026-11-05T10:00:00Z");
    await deliverPaymob({ id: 501, is_refunded: true, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(pro()).toBe(false);
    expect(sub().status).toBe("refunded");
    expect(store.payments.get(pay.id)?.status).toBe("refunded");
    expect(store.requests.get("rq1")?.status).toBe("approved");
    expect(subjects()).toEqual(["قُبل طلب استرداد المبلغ"]);
  });
});

describe("Paddle", () => {
  const txn = (over: Record<string, unknown> = {}) => ({
    event_id: "evt_1", event_type: "transaction.completed", occurred_at: clock,
    data: {
      id: "txn_1", status: "completed", origin: "web", subscription_id: "sub_1", currency_code: "USD", custom_data: { session_id: "", user_id: U },
      billing_period: { starts_at: "2026-11-03T09:00:00Z", ends_at: "2027-11-03T09:00:00Z" }, details: { totals: { grand_total: "7200" } },
      payments: [{ status: "captured", method_details: { type: "card", card: { type: "mastercard", last4: "5100", expiry_month: 8, expiry_year: 2028 } } }], ...over,
    },
  });

  it("subscribe, cancel in Paddle, and the end of the plan, all through signed notifications", async () => {
    store.learners.set(U, { email: "y@example.com", locale: "en", name: "Yasmin" });
    const s = session({ provider: "paddle", region: "gulf", country: "SA", period: "year", currency: "USD", amountMinor: 7200, renewAmountMinor: 7200, locale: "en" });
    const t = txn();
    (t.data.custom_data as Record<string, string>).session_id = s.id;
    await deliverPaddle(t);
    expect(sub()).toMatchObject({ provider: "paddle", providerSubId: "sub_1", period: "year", cardExpiry: "08/28", currentPeriodEnd: "2027-11-03T09:00:00Z" });
    expect(pro()).toBe(true);
    expect(subjects()).toEqual(["Your UXGate receipt · $72"]);

    await deliverPaddle({ event_id: "evt_2", event_type: "subscription.updated", occurred_at: clock, data: { id: "sub_1", status: "active", scheduled_change: { action: "cancel", effective_at: "2027-11-03T09:00:00Z" } } });
    expect(sub().status).toBe("cancelled");
    expect(pro()).toBe(true);
    expect(subjects()).toContain("Your UXGate Pro plan is cancelled");

    await deliverPaddle({ event_id: "evt_3", event_type: "subscription.updated", occurred_at: clock, data: { id: "sub_1", status: "active", scheduled_change: null } });
    expect(sub().status).toBe("active");

    at("2027-11-03T09:00:01Z");
    await deliverPaddle({ event_id: "evt_4", event_type: "subscription.canceled", occurred_at: clock, data: { id: "sub_1", status: "canceled" } });
    expect(sub().status).toBe("ended");
    expect(pro()).toBe(false);
  });

  it("a renewal comes from Paddle; a failed one starts the grace period", async () => {
    const s = session({ provider: "paddle", region: "arab", country: "JO", period: "month", currency: "USD", amountMinor: 500, renewAmountMinor: 500 });
    const t = txn({ billing_period: { starts_at: "2026-11-03T09:00:00Z", ends_at: "2026-12-03T09:00:00Z" }, details: { totals: { grand_total: "500" } } });
    (t.data.custom_data as Record<string, string>).session_id = s.id;
    await deliverPaddle(t);
    at("2026-12-03T09:05:00Z");
    await deliverPaddle({ event_id: "evt_r1", event_type: "transaction.completed", occurred_at: clock, data: { id: "txn_2", origin: "subscription_recurring", subscription_id: "sub_1", currency_code: "USD", billing_period: { starts_at: "2026-12-03T09:00:00Z", ends_at: "2027-01-03T09:00:00Z" }, details: { totals: { grand_total: "500" } } } });
    expect(sub()).toMatchObject({ status: "active", currentPeriodEnd: "2027-01-03T09:00:00Z" });
    at("2027-01-03T09:05:00Z");
    await deliverPaddle({ event_id: "evt_pd", event_type: "subscription.past_due", occurred_at: clock, data: { id: "sub_1", status: "past_due" } });
    expect(sub()).toMatchObject({ status: "grace", nextRetryAt: null }); // Paddle retries by itself
    expect(pro()).toBe(true);
  });

  it("refuses an old or forged signature", async () => {
    const body = JSON.stringify(txn());
    const ts = String(Math.floor(new Date(clock).getTime() / 1000) - 3600);
    const sig = `ts=${ts};h1=${await hmacHex("SHA-256", PADDLE_SECRET, `${ts}:${body}`)}`;
    expect(await verifyPaddle(body, sig, PADDLE_SECRET, new Date(clock))).toEqual({ ok: false, reason: "signature" });
    const now = String(Math.floor(new Date(clock).getTime() / 1000));
    expect((await verifyPaddle(body, `ts=${now};h1=${"ab".repeat(32)}`, PADDLE_SECRET, new Date(clock))).ok).toBe(false);
    expect((await verifyPaddle(body, null, PADDLE_SECRET, new Date(clock))).ok).toBe(false);
  });

  it("an approved refund adjustment ends Pro", async () => {
    const s = session({ provider: "paddle", region: "gulf", country: "SA", period: "year", currency: "USD" });
    const t = txn();
    (t.data.custom_data as Record<string, string>).session_id = s.id;
    await deliverPaddle(t);
    await deliverPaddle({ event_id: "evt_adj", event_type: "adjustment.updated", occurred_at: clock, data: { id: "adj_1", action: "refund", status: "approved", transaction_id: "txn_1" } });
    expect(pro()).toBe(false);
  });
});

describe("wallet payers (Paymob cannot renew wallets)", () => {
  it("get a reminder 3 days before, a week of grace after the date, and paying extends from the old end date", async () => {
    store.learners.set(U, { email: "y@example.com", locale: "en", name: "Yasmin" });
    const s = session();
    await deliverPaymob({ id: 700, source_data: { pan: "01012344521", sub_type: "wallet", type: "wallet" }, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    sent = [];
    at("2026-11-30T10:00:00Z"); await runDaily(engine, async () => { throw new Error("wallets are never charged"); });
    expect(subjects()).toEqual(["Your plan renews on 3 December · pay with your wallet"]);
    at("2026-12-03T10:00:00Z"); await runDaily(engine, async () => { throw new Error("wallets are never charged"); });
    expect(sub()).toMatchObject({ status: "grace", graceUntil: "2026-12-10T09:00:00.000Z", nextRetryAt: null });
    expect(pro()).toBe(true);
    const r = session({ kind: "renewal", subscriptionId: sub().id! });
    at("2026-12-06T10:00:00Z");
    await deliverPaymob({ id: 701, source_data: { pan: "01012344521", sub_type: "wallet", type: "wallet" }, order: { id: 9002, merchant_order_id: `s_${r.id}` } });
    expect(sub()).toMatchObject({ status: "active", currentPeriodStart: "2026-12-03T09:00:00.000Z", currentPeriodEnd: "2027-01-03T09:00:00.000Z" });
  });
});

describe("discount renewals", () => {
  it("founding member: the first year is discounted, the renewal is the full price", async () => {
    const s = session({ period: "year", discount: "founding", code: "FOUNDING", amountMinor: 157400, renewAmountMinor: 224900 });
    await deliverPaymob({ id: 900, amount_cents: 157400, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(sub()).toMatchObject({ discount: "founding", renewAmountMinor: 224900 });
  });
  it("welcome back applies again only after 60 days without Pro", async () => {
    const s = session();
    await deliverPaymob({ id: 901, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    await cancelPlan(engine, U, null);
    at("2026-12-03T09:00:00Z"); await runDaily(engine, async () => null);
    expect(welcomeBackEligible(ent(), new Date("2027-01-15T00:00:00Z"))).toBe(false);
    expect(welcomeBackEligible(ent(), new Date("2027-02-02T09:00:00Z"))).toBe(true);
  });
});

describe("entitlement", () => {
  it("a learner with no plan is free", async () => {
    expect((await syncEntitlement(engine, U)).plan).toBe("free");
  });
  it("events for unknown checkouts are recorded with an error, not applied", async () => {
    const ev: BillingEvent = { provider: "paymob", type: "paid", eventId: "x:paid", at: clock, paymentId: "x", sessionId: "nope", providerSubId: null, userId: null, amountMinor: 1, currency: "EGP", recurring: false, periodStart: null, periodEnd: null, card: null };
    await expect(applyEvent(engine, ev)).rejects.toThrow(/unknown checkout/);
    expect(store.events.get("paymob:x:paid")?.error).toMatch(/unknown checkout/);
    expect(pro()).toBe(false);
  });
});
