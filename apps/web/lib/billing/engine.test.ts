import { beforeEach, describe, expect, it } from "vitest";
import { applyEvent, cancelPlan, changePlan, resumePlan, syncEntitlement, type Engine, type Session } from "./engine";
import { runDaily, type Charger } from "./daily";
import { MemoryStore } from "./memory-store";
import { makeMailer, type Transport } from "./mailer";
import { hmacHex } from "./crypto";
import { confirmTransaction, signedString, TOKEN_FIELDS, TRANSACTION_FIELDS, verifyPaymob, transactionEvent } from "./paymob";
import { mockAllowed, PRODUCTION_HOSTS } from "./hosts";
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

/** Paymob's own copy of each transaction, as its API would answer (by default the same as the callback). */
let paymobCopies: Map<string, Record<string, unknown>>;
const fetchTx = async (id: string) => paymobCopies.get(id) ?? null;

async function deliverPaymob(obj: Record<string, unknown>, copy?: Record<string, unknown>) {
  const { body, hmac } = await paymobCallback(obj);
  const signed = JSON.parse(body).obj;
  paymobCopies.set(String(signed.id), copy ? { ...signed, ...copy } : signed);
  const v = await verifyPaymob(body, hmac, PAYMOB_SECRET, fetchTx);
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
  paymobCopies = new Map();
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
    const r = session({ kind: "renewal", subscriptionId: sub().id!, providerRef: "9002" });
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

// ───────── QA round 1 fixes (issues #128, #132, #133, #134, #135) ─────────

describe("test payments never give real Pro (#128)", () => {
  const mockPay = async () => {
    const s = session({ provider: "mock", providerRef: null });
    const obj = { id: `mock-${s.id}`, amount_cents: 24900, currency: "EGP", created_at: clock, success: true, pending: false, order: { id: s.id, merchant_order_id: `s_${s.id}` }, source_data: { pan: "4242", sub_type: "Visa", type: "card" } };
    await applyEvent(engine, transactionEvent(obj, "mock"));
    return s;
  };

  it("Pro from the test payment page is stored as test-mode Pro, and counts only where test payments are allowed", async () => {
    await mockPay();
    expect(ent()).toMatchObject({ plan: "pro", source: "mock" });
    expect(isPro(ent(), new Date(clock))).toBe(false);       // production: uxgate.org, the production workers.dev host
    expect(isPro(ent(), new Date(clock), true)).toBe(true);  // a preview host with BILLING_MOCK=1
  });

  it("test payments are off without BILLING_MOCK=1, and always off on production hosts", () => {
    expect(mockAllowed("claude-x-uxgate-web.uxgate-web.workers.dev", {})).toBe(false);
    expect(mockAllowed("claude-x-uxgate-web.uxgate-web.workers.dev", { BILLING_MOCK: "1" })).toBe(true);
    for (const h of [...PRODUCTION_HOSTS, "UXGATE.ORG", "uxgate.org:443", "uxgate.org."]) expect(mockAllowed(h, { BILLING_MOCK: "1" })).toBe(false);
    expect(mockAllowed(null, { BILLING_MOCK: "1" })).toBe(false);
  });

  it("the daily job in production never renews, charges or emails a test-mode plan", async () => {
    await mockPay();
    sent = [];
    let charged = 0;
    at("2026-12-03T02:00:00Z");
    const r = await runDaily(engine, async () => { charged++; return null; });
    expect(charged).toBe(0);
    expect(r).toMatchObject({ renewed: 0, failed: 0, settled: 0, reminders: 0 });
    expect(sent).toHaveLength(0);
    // Where test payments are on, it is renewed like any plan.
    await runDaily(engine, async () => { charged++; return null; }, clock, { includeMock: true });
    expect(charged).toBe(1);
  });

  it("a real payment replaces a live test-mode plan", async () => {
    await mockPay();
    const s = session({ providerRef: "9001" });
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    const subs = [...store.subs.values()];
    expect(subs.find((x) => x.provider === "mock")?.status).toBe("ended");
    expect(sub()).toMatchObject({ provider: "paymob", status: "active" });
    expect(ent()).toMatchObject({ plan: "pro", source: "live" });
    expect(isPro(ent(), new Date(clock))).toBe(true);
  });

  it("test-mode Pro ending does not open the welcome-back discount", async () => {
    await mockPay();
    await cancelPlan(engine, U, null);
    at("2027-03-01T09:00:00Z");
    await runDaily(engine, async () => null, clock, { includeMock: true });
    expect(ent()).toMatchObject({ plan: "free", proEndedAt: null });
  });
});

describe("Paymob: only signed fields count (#132)", () => {
  const B = "22222222-2222-4222-8222-222222222222";

  it("a callback whose unsigned order reference was changed still pays the order it really paid", async () => {
    const victim = session({ providerRef: "9001" });
    const theirs = session({ userId: B, providerRef: "9100" });
    // The attacker forwards a real, signed callback with merchant_order_id pointing at their own checkout.
    await deliverPaymob({ id: 801, order: { id: 9001, merchant_order_id: `s_${theirs.id}` } }, { order: { id: 9001, merchant_order_id: `s_${victim.id}` } });
    expect(store.sessions.get(theirs.id)?.status).toBe("open");
    expect(store.entitlements.get(B)).toBeUndefined();
    expect(store.sessions.get(victim.id)?.status).toBe("paid");
  });

  it("a payment for another order is refused even if Paymob's copy named our checkout", async () => {
    const s = session({ providerRef: "9001" });
    const r = await deliverPaymob({ id: 802, order: { id: 9555, merchant_order_id: `s_${s.id}` } });
    expect(r[0]).toMatchObject({ status: "ignored", note: "order mismatch" });
    expect(pro()).toBe(false);
  });

  it("a payment below our price is refused and buys nothing", async () => {
    const s = session({ providerRef: "9001" });
    const r = await deliverPaymob({ id: 803, amount_cents: 100, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(r[0]).toMatchObject({ status: "ignored", note: "amount mismatch" });
    expect(pro()).toBe(false);
    expect(store.payments.size).toBe(0);
    expect(store.sessions.get(s.id)?.status).toBe("failed");
  });

  it("a refund callback cannot point at someone else's payment: the parent comes from Paymob's copy", async () => {
    const s = session({ providerRef: "9001" });
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    // A signed refund of transaction 900 (someone else's), with parent_transaction (unsigned) changed to 501.
    const r = await deliverPaymob({ id: 901, is_refund: true, has_parent_transaction: true, parent_transaction: 501, order: { id: 7777 } }, { parent_transaction: 900 });
    expect(r[0]).toMatchObject({ status: "ignored", note: "refund for an unknown payment" });
    expect(pro()).toBe(true);
    expect([...store.payments.values()][0].status).toBe("paid");
  });

  it("refuses when Paymob cannot be asked, or when its copy disagrees with the signed fields", async () => {
    const s = session({ providerRef: "9001" });
    const { body, hmac } = await paymobCallback({ id: 804, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(await verifyPaymob(body, hmac, PAYMOB_SECRET)).toEqual({ ok: false, reason: "lookup" });
    expect(await verifyPaymob(body, hmac, PAYMOB_SECRET, async () => { throw new Error("down"); })).toEqual({ ok: false, reason: "lookup" });
    expect(await verifyPaymob(body, hmac, PAYMOB_SECRET, async () => ({ ...JSON.parse(body).obj, amount_cents: 100 }))).toEqual({ ok: false, reason: "payload" });
    expect(confirmTransaction({ id: 1, amount_cents: 5, currency: "EGP", order: { id: 2 } }, { id: 1, amount_cents: 5, currency: "EGP", order: { id: 3 } })).toBeNull();
    expect(pro()).toBe(false);
  });
});

describe("Paddle: one subscription, one charge (#133, #134)", () => {
  let calls: string[];
  let payerCountry: string | null;
  const paddleTxn = (id: string, subId: string, sessionId: string, total = "7200") => ({
    event_id: `evt_${id}`, event_type: "transaction.completed", occurred_at: clock,
    data: {
      id, status: "completed", origin: "web", subscription_id: subId, currency_code: "USD", custom_data: { session_id: sessionId, user_id: U },
      customer_id: "ctm_1", address_id: "add_1", billing_period: { starts_at: "2026-11-03T09:00:00Z", ends_at: "2027-11-03T09:00:00Z" }, details: { totals: { grand_total: total } },
    },
  });
  const paddleSession = (over: Partial<Session> = {}) => session({ provider: "paddle", region: "gulf", country: "SA", period: "year", currency: "USD", amountMinor: 7200, renewAmountMinor: 7200, locale: "en", providerRef: null, ...over });

  beforeEach(() => {
    calls = [];
    payerCountry = null;
    engine.actions = {
      refund: async (p, id) => { calls.push(`refund ${p} ${id}`); },
      cancelNow: async (p, id) => { calls.push(`cancel ${p} ${id}`); },
      payerCountry: async () => payerCountry,
      reprice: async (s, region) => { calls.push(`reprice ${s.providerSubId} ${region}`); },
    };
  });

  it("two checkouts paid one after the other: the second Paddle subscription is ended and refunded", async () => {
    const a = paddleSession(), b = paddleSession();
    await deliverPaddle(paddleTxn("txn_a", "sub_a", a.id));
    const r = await deliverPaddle(paddleTxn("txn_b", "sub_b", b.id));
    expect(r[0].status).toBe("ignored");
    expect(calls).toEqual(["cancel paddle sub_b", "refund paddle txn_b"]);
    expect([...store.subs.values()].filter((x) => ["active", "grace", "cancelled"].includes(x.status))).toHaveLength(1);
    expect(sub()).toMatchObject({ providerSubId: "sub_a", currentPeriodEnd: "2027-11-03T09:00:00Z" });
    expect([...store.payments.values()].find((p) => p.providerPaymentId === "txn_b")?.subscriptionId).toBeNull();
    // Its refund then comes back from Paddle and does not touch the plan.
    await deliverPaddle({ event_id: "evt_adj_b", event_type: "adjustment.updated", occurred_at: clock, data: { action: "refund", status: "approved", transaction_id: "txn_b" } });
    expect(pro()).toBe(true);
    expect(sub().status).toBe("active");
  });

  it("a checkout for more than one plan (Paddle's quantity picker) buys nothing and is refunded whole", async () => {
    const a = paddleSession();
    const txn = paddleTxn("txn_q", "sub_q", a.id, "14400");
    const r = await deliverPaddle({ ...txn, data: { ...txn.data, items: [{ price_id: "pri_1", quantity: 2 }] } });
    expect(r[0]).toMatchObject({ status: "ignored", note: expect.stringContaining("quantity 2") });
    expect(calls).toEqual(["cancel paddle sub_q", "refund paddle txn_q"]);
    expect(pro()).toBe(false);
    expect(store.sessions.get(a.id)?.status).toBe("failed");
    expect([...store.payments.values()].find((p) => p.providerPaymentId === "txn_q")?.subscriptionId).toBeNull();
  });

  it("a renewal for more than one plan is refunded too; a quantity of 1 (or none) renews as usual", async () => {
    const a = paddleSession();
    const first = paddleTxn("txn_a", "sub_a", a.id);
    await deliverPaddle({ ...first, data: { ...first.data, items: [{ price_id: "pri_1", quantity: 1 }] } });
    expect(sub()).toMatchObject({ providerSubId: "sub_a", status: "active" });
    const renew = { origin: "subscription_recurring", subscription_id: "sub_a", currency_code: "USD", custom_data: { user_id: U }, details: { totals: { grand_total: "21600" } } };
    const r = await deliverPaddle({ event_id: "evt_r3", event_type: "transaction.completed", occurred_at: clock, data: { id: "txn_r3", ...renew, items: [{ quantity: 3 }] } });
    expect(r[0].status).toBe("ignored");
    expect(calls).toEqual(["cancel paddle sub_a", "refund paddle txn_r3"]);
    expect(sub().currentPeriodEnd).toBe("2027-11-03T09:00:00Z");
  });

  it("cancel in the grace period ends the plan now and asks Paddle to cancel now; a late charge is refunded", async () => {
    const a = paddleSession();
    await deliverPaddle(paddleTxn("txn_a", "sub_a", a.id));
    at("2027-11-03T09:05:00Z");
    await deliverPaddle({ event_id: "evt_pd", event_type: "subscription.past_due", occurred_at: clock, data: { id: "sub_a", status: "past_due" } });
    const told: string[] = [];
    await cancelPlan(engine, U, null, { cancel: async (s) => { told.push(s.status); } });
    expect(told).toEqual(["grace"]); // paddle-api cancels "immediately" for a plan in grace
    expect(sub().status).toBe("ended");
    expect(pro()).toBe(false);
    // Paddle's dunning still got through before the cancel landed: the money goes back, the plan stays ended.
    const r = await deliverPaddle({ event_id: "evt_late", event_type: "transaction.completed", occurred_at: clock, data: { id: "txn_late", origin: "subscription_recurring", subscription_id: "sub_a", currency_code: "USD", custom_data: { user_id: U }, details: { totals: { grand_total: "7200" } } } });
    expect(r[0].status).toBe("ignored");
    expect(calls).toEqual(["cancel paddle sub_a", "refund paddle txn_late"]);
    expect(sub().status).toBe("ended");
    expect(pro()).toBe(false);
  });

  it("subscribing again after that is one new plan; the old Paddle subscription never renews it", async () => {
    const a = paddleSession();
    await deliverPaddle(paddleTxn("txn_a", "sub_a", a.id));
    at("2027-11-03T09:05:00Z");
    await deliverPaddle({ event_id: "evt_pd", event_type: "subscription.past_due", occurred_at: clock, data: { id: "sub_a", status: "past_due" } });
    await cancelPlan(engine, U, null, { cancel: async () => {} });
    const b = paddleSession();
    await deliverPaddle(paddleTxn("txn_b", "sub_b", b.id));
    expect(sub()).toMatchObject({ providerSubId: "sub_b", status: "active" });
    await deliverPaddle({ event_id: "evt_old", event_type: "transaction.completed", occurred_at: clock, data: { id: "txn_old", origin: "subscription_recurring", subscription_id: "sub_a", currency_code: "USD", custom_data: { user_id: U }, details: { totals: { grand_total: "7200" } } } });
    expect(calls).toEqual(["cancel paddle sub_a", "refund paddle txn_old"]);
    expect(sub()).toMatchObject({ providerSubId: "sub_b", status: "active" });
  });

  it("paying Paddle's overdue charge from the grace period renews the plan and marks that checkout paid", async () => {
    const a = paddleSession();
    await deliverPaddle(paddleTxn("txn_a", "sub_a", a.id));
    at("2027-11-03T09:05:00Z");
    await deliverPaddle({ event_id: "evt_pd", event_type: "subscription.past_due", occurred_at: clock, data: { id: "sub_a", status: "past_due" } });
    const again = paddleSession({ kind: "renewal", subscriptionId: sub().id!, providerRef: "txn_due" });
    await deliverPaddle({ event_id: "evt_due", event_type: "transaction.completed", occurred_at: clock, data: { id: "txn_due", origin: "subscription_recurring", subscription_id: "sub_a", currency_code: "USD", billing_period: { starts_at: "2027-11-03T09:00:00Z", ends_at: "2028-11-03T09:00:00Z" }, details: { totals: { grand_total: "7200" } } } });
    expect(sub()).toMatchObject({ providerSubId: "sub_a", status: "active", currentPeriodEnd: "2028-11-03T09:00:00Z" });
    expect(store.sessions.get(again.id)?.status).toBe("paid");
    expect(calls).toEqual([]);
  });

  it("a billing country in Paddle's checkout from a dearer region moves renewals to the Gulf price", async () => {
    payerCountry = "US";
    const s = paddleSession({ region: "arab", country: "JO", amountMinor: 4500, renewAmountMinor: 4500 });
    await deliverPaddle(paddleTxn("txn_a", "sub_a", s.id, "4500"));
    expect(sub()).toMatchObject({ region: "gulf", country: "US", renewAmountMinor: 7200 });
    expect(calls).toEqual(["reprice sub_a gulf"]);
    expect([...store.payments.values()][0].amountMinor).toBe(4500); // the first year keeps the price paid
  });

  it("the same region's country keeps the price", async () => {
    payerCountry = "TN";
    const s = paddleSession({ region: "arab", country: "JO", amountMinor: 4500, renewAmountMinor: 4500 });
    await deliverPaddle(paddleTxn("txn_a", "sub_a", s.id, "4500"));
    expect(sub()).toMatchObject({ region: "arab", country: "JO", renewAmountMinor: 4500 });
    expect(calls).toEqual([]);
  });
});

describe("hardening (#135)", () => {
  it("a Paddle signature whose time is not a whole number of seconds is refused", async () => {
    const body = JSON.stringify({ event_id: "e", event_type: "transaction.completed", data: {} });
    for (const ts of ["abc", "1e9", "", "-5", "1.5"]) {
      const sig = `ts=${ts};h1=${await hmacHex("SHA-256", PADDLE_SECRET, `${ts}:${body}`)}`;
      expect(await verifyPaddle(body, sig, PADDLE_SECRET, new Date(clock))).toEqual({ ok: false, reason: "signature" });
    }
  });

  it("two identical webhooks at the same moment apply once", async () => {
    const s = session({ providerRef: "9001" });
    const { body, hmac } = await paymobCallback({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    paymobCopies.set("501", JSON.parse(body).obj);
    const v = await verifyPaymob(body, hmac, PAYMOB_SECRET, fetchTx);
    if (!v.ok) throw new Error(v.reason);
    const r = await Promise.all([applyEvent(engine, v.events[0]), applyEvent(engine, v.events[0])]);
    expect(r.map((x) => x.status).sort()).toEqual(["applied", "duplicate"]);
    expect(store.payments.size).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("a failed renewal delivered twice at once counts one retry", async () => {
    const s = session({ providerRef: "9001" });
    await deliverPaymob({ id: 501, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    at("2026-12-03T09:30:00Z");
    const ev = transactionEvent({ id: "d0", success: false, pending: false, created_at: clock, order: { merchant_order_id: `r_${sub().id}_x_0` } });
    await Promise.all([applyEvent(engine, ev), applyEvent(engine, ev)]);
    expect(sub()).toMatchObject({ status: "grace", retries: 0 });
  });
});

describe("Paymob: Egypt's price needs a card issued in Egypt (PAYMOB_EG_CARDS_ONLY)", () => {
  let refunds: string[];
  const foreign = (id: number, s: Session, country = "DE") => deliverPaymob({ id, source_data: { pan: "4242", sub_type: "Visa", type: "card", issuer_country: country }, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
  beforeEach(() => {
    refunds = [];
    engine.actions = { refund: async (provider, id, amount) => { refunds.push(`${provider}:${id}:${amount}`); } };
    engine.egCardsOnly = true;
  });

  it("off by default: a card issued abroad still starts Pro", async () => {
    engine.egCardsOnly = undefined;
    const s = session();
    await foreign(1500, s);
    expect(pro()).toBe(true);
    expect(refunds).toEqual([]);
  });

  it("on: a card issued abroad (a VPN user) is refused and refunded, with no Pro, and the learner is told why", async () => {
    const s = session();
    const r = await foreign(1501, s);
    expect(r[0]).toMatchObject({ status: "ignored" });
    expect(pro()).toBe(false);
    expect([...store.subs.values()]).toHaveLength(0);
    expect(store.sessions.get(s.id)?.status).toBe("refused");
    expect(refunds).toEqual(["paymob:1501:24900"]);
    expect([...store.payments.values()][0]).toMatchObject({ subscriptionId: null, amountMinor: 24900, status: "paid" });
    expect(subjects()).toEqual(["لم نتمكن من قبول هذه الدفعة: المبلغ في طريقه إليك"]);
    // The refund webhook then marks it refunded, and its email does not talk about Pro ending.
    sent = [];
    await deliverPaymob({ id: 1501, is_refunded: true, source_data: { pan: "4242", sub_type: "Visa", type: "card", issuer_country: "DE" }, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect([...store.payments.values()][0].status).toBe("refunded");
    expect(sent[0].text).not.toContain("انتهى Pro");
  });

  it("refused, then offered Paddle: the email links to the international checkout with the same plan and code, and paying there starts Pro", async () => {
    const s = session({ code: "FOUNDING", period: "month" });
    await foreign(1520, s, "SA");
    expect(store.sessions.get(s.id)?.status).toBe("refused");
    expect(sent[0].html).toContain("https://uxgate.org/ar/app/checkout?period=month&amp;intl=1&amp;code=FOUNDING");
    expect(sent[0].text).toContain("ادفع ببطاقة دولية");
    // The learner opens Paddle's checkout at the world price and pays.
    const p = session({ provider: "paddle", region: "world", country: "ZZ", period: "month", currency: "USD", amountMinor: 800, renewAmountMinor: 800, providerRef: null, code: "FOUNDING" });
    await deliverPaddle({
      event_id: "evt_intl", event_type: "transaction.completed", occurred_at: clock,
      data: { id: "txn_intl", status: "completed", origin: "web", subscription_id: "sub_intl", currency_code: "USD", custom_data: { session_id: p.id, user_id: U },
        billing_period: { starts_at: clock, ends_at: "2026-12-03T09:00:00Z" }, details: { totals: { grand_total: "800" } } },
    });
    expect(pro()).toBe(true);
    expect(sub()).toMatchObject({ provider: "paddle", region: "world", currency: "USD", status: "active" });
    // The Paymob charge is still refunded.
    expect(refunds).toEqual(["paymob:1520:24900"]);
  });

  it("an Egyptian card (EG, EGY) starts Pro as usual", async () => {
    const s = session();
    await deliverPaymob({ id: 1502, data: { card_issuer_country: "EGY" }, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(pro()).toBe(true);
    expect(refunds).toEqual([]);
  });

  it("placeholders (NA, XX, ZZ, UNK, a bank name) never refuse a payment", async () => {
    for (const [i, c] of ["NA", "XX", "ZZ", "UNK", "Banque Misr"].entries()) {
      const uid = `00000000-0000-4000-8000-00000000c00${i}`;
      store.learners.set(uid, { email: `${i}@example.com`, locale: "en", name: "C" });
      const s = session({ userId: uid, providerRef: String(9100 + i) });
      await deliverPaymob({ id: 1510 + i, source_data: { pan: "4242", sub_type: "Visa", type: "card", issuer_country: c }, order: { id: 9100 + i, merchant_order_id: `s_${s.id}` } });
      expect(store.sessions.get(s.id)?.status, c).toBe("paid");
    }
    expect(refunds).toEqual([]);
  });

  it("a wallet, or a card whose country Paymob does not report, is not refused", async () => {
    const s = session();
    await deliverPaymob({ id: 1503, source_data: { pan: "01012344521", sub_type: "wallet", type: "wallet", issuer_country: "DE" }, order: { id: 9001, merchant_order_id: `s_${s.id}` } });
    expect(pro()).toBe(true);
    const u2 = session({ userId: "00000000-0000-4000-8000-0000000000b2", providerRef: "9002" });
    store.learners.set(u2.userId, { email: "b@example.com", locale: "en", name: "B" });
    await deliverPaymob({ id: 1504, order: { id: 9002, merchant_order_id: `s_${u2.id}` } });
    expect(store.sessions.get(u2.id)?.status).toBe("paid");
    expect(refunds).toEqual([]);
  });

  it("the check reads Paymob's own copy, not the callback", async () => {
    const s = session();
    await deliverPaymob({ id: 1505, order: { id: 9001, merchant_order_id: `s_${s.id}` } }, { source_data: { pan: "4242", sub_type: "Visa", type: "card", issuer_country: "US" } });
    expect(pro()).toBe(false);
    expect(refunds).toEqual(["paymob:1505:24900"]);
  });
});
