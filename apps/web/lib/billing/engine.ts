// Applies verified billing events to a learner's plan, payments and entitlement, and sends the billing email for each.
// It talks to storage and email through two small interfaces, so tests run it on an in-memory store and a fake mailer,
// and the server runs it on Supabase (service role) and Resend.
import type { BillingEvent } from "./events";
import { PRICES, regionFor, type DiscountKind, type Period, type Region } from "./pricing";
import {
  cancelled, entitlementFor, planChanged, refunded, renewalFailed, renewalPrice, renewed, resumed, startSub,
  type BillingProvider, type Card, type Entitlement, type PayMethod, type Sub,
} from "./subscription";
import type { EmailKind } from "./emails";

export type Session = {
  id: string; userId: string; kind: "new" | "renewal"; subscriptionId: string | null; provider: BillingProvider; region: Region; country: string;
  period: Period; discount: DiscountKind | null; discountUntil: string | null; code: string | null; amountMinor: number; renewAmountMinor: number;
  currency: string; locale: "en" | "ar"; status: "open" | "pending" | "paid" | "failed" | "cancelled" | "refused"; providerRef: string | null; createdAt: string;
};

export type Payment = {
  id: string; userId: string; subscriptionId: string | null; provider: BillingProvider; providerPaymentId: string; receiptNo: string;
  kind: "first" | "renewal"; period: Period; amountMinor: number; currency: string; status: "paid" | "refunded";
  payMethod: PayMethod | null; cardBrand: string | null; cardLast4: string | null; paidAt: string; periodEnd: string | null; refundedAt: string | null;
};

export type RefundRequest = { id: string; userId: string; paymentId: string; amountMinor: number; currency: string; reason: string; status: "waiting" | "approved" | "declined"; createdAt: string; answeredAt: string | null };

export type Learner = { email: string; locale: "en" | "ar"; name: string | null };

export interface BillingStore {
  /** Stores a received event; false when this (provider, event id) was stored and applied before. */
  recordEvent(provider: string, eventId: string, eventType: string, payload: unknown): Promise<boolean>;
  markEvent(provider: string, eventId: string, error: string | null): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  sessionByRef(provider: BillingProvider, ref: string): Promise<Session | null>;
  updateSession(id: string, patch: Partial<Pick<Session, "status" | "providerRef">>): Promise<void>;
  /** The learner's live plan (active, grace or cancelled), if any. */
  liveSub(userId: string): Promise<Sub | null>;
  /** The learner's most recent plan of any status. */
  latestSub(userId: string): Promise<Sub | null>;
  subById(id: string): Promise<Sub | null>;
  /** Plans the daily job looks at: active, grace or cancelled. */
  dueSubs(now: string): Promise<Sub[]>;
  subByProviderId(provider: BillingProvider, providerSubId: string): Promise<Sub | null>;
  /** Inserts (no id) or updates a plan; returns it with its id. */
  saveSub(sub: Sub): Promise<Sub>;
  paymentByProviderId(provider: BillingProvider, providerPaymentId: string): Promise<Payment | null>;
  /** Inserts a payment; null when the provider payment id was recorded before. */
  insertPayment(p: Omit<Payment, "id" | "receiptNo" | "refundedAt" | "status">): Promise<Payment | null>;
  /** Ties a payment to the plan it paid for and the end of the period it bought. */
  linkPayment(id: string, subscriptionId: string, periodEnd: string): Promise<void>;
  markPaymentRefunded(id: string, at: string): Promise<void>;
  getEntitlement(userId: string): Promise<Entitlement | null>;
  saveEntitlement(userId: string, e: Entitlement): Promise<void>;
  saveToken(userId: string, provider: BillingProvider, sealedToken: string, card: Card): Promise<void>;
  refundRequestFor(paymentId: string): Promise<RefundRequest | null>;
  answerRefundRequest(id: string, status: "approved" | "declined", at: string): Promise<void>;
  learner(userId: string): Promise<Learner | null>;
  /** Claims one email (user, kind, ref); false when it was sent before. */
  claimEmail(userId: string, kind: EmailKind, ref: string, locale: string, to: string): Promise<boolean>;
  markEmail(userId: string, kind: EmailKind, ref: string, status: "sent" | "skipped" | "failed", providerId: string | null): Promise<void>;
}

/** Sends one billing email in the learner's language. */
export type BillingMailer = (userId: string, kind: EmailKind, ref: string, data: EmailData) => Promise<void>;
export type EmailData = { sub?: Sub | null; payment?: Payment | null; request?: RefundRequest | null; extra?: Record<string, string> };

export type ApplyResult = { status: "applied" | "duplicate" | "ignored"; note?: string };

type Paid = Extract<BillingEvent, { type: "paid" }>;

/** Calls back to the provider from a webhook: for money the engine refuses, and for Paddle's checkout country. */
export type WebhookActions = {
  /** Gives a payment back in full. */
  refund?: (provider: BillingProvider, providerPaymentId: string, amountMinor: number) => Promise<void>;
  /** Ends a provider subscription now (Paddle). */
  cancelNow?: (provider: BillingProvider, providerSubId: string) => Promise<void>;
  /** The billing country the payer entered at the provider (Paddle), or null when it is not known. */
  payerCountry?: (ev: Paid) => Promise<string | null>;
  /** Moves a plan's renewals to another region's price at the provider, from the next billing date (Paddle). */
  reprice?: (sub: Sub, region: Region) => Promise<void>;
};

export type Engine = {
  store: BillingStore;
  mail: BillingMailer;
  /** Encrypts a saved-card token before it is stored. */
  seal: (token: string) => Promise<string>;
  now?: () => string;
  actions?: WebhookActions;
  /** PAYMOB_EG_CARDS_ONLY=1: Egypt's EGP price needs a card issued in Egypt. Off by default (an admin decision). */
  egCardsOnly?: boolean;
};

const LIVE = ["active", "grace", "cancelled"];

/**
 * Money arrived that must not buy anything (a second Paddle subscription, or a charge on a plan that has ended):
 * it is recorded with no plan, the provider subscription is ended and the payment is given back. The refund webhook
 * then marks it refunded and emails the learner.
 */
async function refuse(e: Engine, ev: Paid, userId: string, period: Period, note: string): Promise<ApplyResult> {
  await e.store.insertPayment({
    userId, subscriptionId: null, provider: ev.provider, providerPaymentId: ev.paymentId, kind: ev.recurring ? "renewal" : "first", period,
    amountMinor: ev.amountMinor, currency: ev.currency, payMethod: ev.card?.method ?? null, cardBrand: ev.card?.brand ?? null, cardLast4: ev.card?.last4 ?? null,
    paidAt: ev.at, periodEnd: null,
  });
  const failed: string[] = [];
  if (ev.provider === "paddle" && ev.providerSubId) await e.actions?.cancelNow?.(ev.provider, ev.providerSubId).catch((err) => { failed.push(`cancel: ${String(err?.message ?? err)}`); });
  await e.actions?.refund?.(ev.provider, ev.paymentId, ev.amountMinor).catch((err) => { failed.push(`refund: ${String(err?.message ?? err)}`); });
  if (failed.length) console.error("billing: refused payment needs a hand", ev.provider, ev.paymentId, failed.join("; "));
  return { status: "ignored", note: failed.length ? `${note}; ${failed.join("; ")}` : `${note}; refunded` };
}

/** Paymob and the test provider charge exactly our price; Paddle adds tax in the payer's currency, so it is not compared. */
const amountOk = (ev: Paid, amountMinor: number, currency: string) =>
  ev.provider === "paddle" || (ev.amountMinor === amountMinor && ev.currency.toUpperCase() === currency.toUpperCase());

/** Recomputes the learner's entitlement from their plan. Returns the new value. */
export async function syncEntitlement(e: Engine, userId: string): Promise<Entitlement> {
  const now = e.now?.() ?? new Date().toISOString();
  const sub = (await e.store.liveSub(userId)) ?? (await e.store.latestSub(userId));
  const prev = await e.store.getEntitlement(userId);
  const next = entitlementFor(sub, prev, now);
  await e.store.saveEntitlement(userId, next);
  return next;
}

/** Applies one verified event exactly once. A repeated delivery (same provider and event id) changes nothing. */
export async function applyEvent(e: Engine, ev: BillingEvent, payload: unknown = ev): Promise<ApplyResult> {
  const fresh = await e.store.recordEvent(ev.provider, ev.eventId, ev.type === "ignored" ? ev.eventType : ev.type, payload);
  if (!fresh) return { status: "duplicate" };
  try {
    const r = await apply(e, ev);
    await e.store.markEvent(ev.provider, ev.eventId, null);
    return r;
  } catch (err) {
    await e.store.markEvent(ev.provider, ev.eventId, String((err as Error)?.message ?? err));
    throw err;
  }
}

async function subForEvent(e: Engine, provider: BillingProvider, ref: string | null): Promise<Sub | null> {
  if (!ref) return null;
  // Paymob and the test provider carry our own subscription id; Paddle carries its sub_... id.
  return provider === "paddle" ? e.store.subByProviderId(provider, ref) : e.store.subById(ref);
}

async function apply(e: Engine, ev: BillingEvent): Promise<ApplyResult> {
  const { store } = e;
  switch (ev.type) {
    case "ignored":
      return { status: "ignored", note: ev.eventType };

    case "paid": {
      if (ev.recurring) {
        const sub = await subForEvent(e, ev.provider, ev.providerSubId);
        if (!sub?.id) {
          // A Paddle subscription we do not know (or no longer keep) charged: end it and give the money back.
          if (ev.provider === "paddle" && ev.userId) return refuse(e, ev, ev.userId, "month", "renewal for an unknown subscription");
          console.error("billing: renewal for an unknown subscription", ev.provider, ev.paymentId);
          return { status: "ignored", note: "renewal for an unknown subscription" };
        }
        if (!amountOk(ev, sub.renewAmountMinor, sub.currency)) {
          console.error("billing: renewal amount differs", ev.provider, ev.paymentId, ev.amountMinor, ev.currency, sub.renewAmountMinor, sub.currency);
          return { status: "ignored", note: "amount mismatch" };
        }
        // A charge on a plan that is over (cancelled in the grace period, refunded, or replaced by a newer plan) buys nothing.
        const other = await store.liveSub(sub.userId);
        if (sub.status === "ended" || sub.status === "refunded" || (other?.id && other.id !== sub.id)) return refuse(e, ev, sub.userId, sub.pendingPeriod ?? sub.period, `renewal for a ${sub.status} plan`);
        const pay = await store.insertPayment({
          userId: sub.userId, subscriptionId: sub.id, provider: ev.provider, providerPaymentId: ev.paymentId, kind: "renewal",
          period: sub.pendingPeriod ?? sub.period, amountMinor: ev.amountMinor, currency: ev.currency, payMethod: ev.card?.method ?? sub.payMethod,
          cardBrand: ev.card?.brand ?? sub.cardBrand, cardLast4: ev.card?.last4 ?? sub.cardLast4, paidAt: ev.at, periodEnd: null,
        });
        if (!pay) return { status: "ignored", note: "payment already recorded" };
        const next = await store.saveSub(renewed(sub, { at: ev.at, periodStart: ev.periodStart, periodEnd: ev.periodEnd, card: ev.card }));
        await store.linkPayment(pay.id, sub.id, next.currentPeriodEnd);
        // Paying Paddle's overdue charge from the grace period: that checkout is now paid.
        const opened = await store.sessionByRef(ev.provider, ev.paymentId);
        if (opened && opened.userId === sub.userId && opened.status !== "paid") await store.updateSession(opened.id, { status: "paid" });
        await syncEntitlement(e, sub.userId);
        await e.mail(sub.userId, "receipt", pay.id, { sub: next, payment: { ...pay, periodEnd: next.currentPeriodEnd } });
        return { status: "applied", note: "renewed" };
      }
      const session = ev.sessionId ? await store.getSession(ev.sessionId) : null;
      if (!session) throw new Error("payment for an unknown checkout");
      // The payment must be for this checkout: same provider, the order we created (Paymob), our price and currency.
      if (session.provider !== ev.provider) return { status: "ignored", note: "provider mismatch" };
      if (ev.provider === "paymob" && (!session.providerRef || session.providerRef !== ev.orderRef)) {
        console.error("billing: payment for another order", ev.paymentId, ev.orderRef, session.id);
        return { status: "ignored", note: "order mismatch" };
      }
      if (!amountOk(ev, session.amountMinor, session.currency)) {
        console.error("billing: amount differs from the checkout", ev.provider, ev.paymentId, ev.amountMinor, ev.currency, session.amountMinor, session.currency);
        await store.updateSession(session.id, { status: "failed" });
        return { status: "ignored", note: "amount mismatch" };
      }
      // With PAYMOB_EG_CARDS_ONLY=1, Egypt's price is for cards issued in Egypt. Paymob charges only in EGP, so a card from
      // abroad (someone on a VPN) cannot be moved to a dollar price there: the payment is refused and refunded, and the
      // learner is told why. Wallets are Egyptian by nature.
      if (e.egCardsOnly && ev.provider === "paymob" && ev.card?.method !== "wallet" && ev.cardCountry && ev.cardCountry !== "EG") {
        console.error("billing: card issued outside Egypt", ev.paymentId, ev.cardCountry, session.id);
        await store.updateSession(session.id, { status: "refused" });
        const r = await refuse(e, ev, session.userId, session.period, `card issued in ${ev.cardCountry}`);
        const pay = await store.paymentByProviderId(ev.provider, ev.paymentId);
        if (pay) await e.mail(session.userId, "cardRefused", pay.id, { payment: pay });
        return r;
      }
      let live = session.kind === "renewal" && session.subscriptionId ? await store.subById(session.subscriptionId) : await store.liveSub(session.userId);
      // A test-mode plan (preview hosts) gives way to a real one.
      if (live?.id && live.provider === "mock" && ev.provider !== "mock" && LIVE.includes(live.status)) {
        await store.saveSub({ ...live, status: "ended", endedAt: ev.at, graceUntil: null, nextRetryAt: null });
        live = null;
      }
      // Paddle made a second subscription (two checkouts paid, or a new one next to a live plan): end it, refund it.
      if (ev.provider === "paddle" && live?.id && LIVE.includes(live.status) && ev.providerSubId && live.providerSubId !== ev.providerSubId) {
        await store.updateSession(session.id, { status: "cancelled" });
        return refuse(e, ev, session.userId, session.period, "second Paddle subscription");
      }
      const pay = await store.insertPayment({
        userId: session.userId, subscriptionId: live?.id ?? null, provider: ev.provider, providerPaymentId: ev.paymentId,
        kind: live ? "renewal" : "first", period: session.period, amountMinor: ev.amountMinor, currency: ev.currency,
        payMethod: ev.card?.method ?? null, cardBrand: ev.card?.brand ?? null, cardLast4: ev.card?.last4 ?? null, paidAt: ev.at, periodEnd: null,
      });
      await store.updateSession(session.id, { status: "paid" });
      if (!pay) return { status: "ignored", note: "payment already recorded" };
      let sub: Sub;
      if (live && live.status !== "paused" && live.status !== "ended" && live.status !== "refunded") {
        // Paying while a plan is live (a wallet payer's next month, or paying again after a failed renewal) extends it.
        sub = await store.saveSub(renewed({ ...live, pendingPeriod: session.period === live.period ? live.pendingPeriod : session.period }, { at: ev.at, card: ev.card }));
      } else {
        sub = await store.saveSub(startSub({
          userId: session.userId, provider: session.provider, providerSubId: ev.providerSubId, region: session.region, country: session.country,
          period: session.period, currency: session.currency, renewAmountMinor: session.renewAmountMinor, discount: session.discount,
          discountUntil: session.discountUntil ? new Date(session.discountUntil) : null, at: ev.at, periodEnd: ev.periodEnd, card: ev.card,
        }));
        if (ev.provider === "paddle") sub = await checkPayerCountry(e, ev, sub);
      }
      await store.linkPayment(pay.id, sub.id!, sub.currentPeriodEnd);
      await syncEntitlement(e, session.userId);
      await e.mail(session.userId, "receipt", pay.id, { sub, payment: { ...pay, subscriptionId: sub.id ?? null, periodEnd: sub.currentPeriodEnd } });
      return { status: "applied", note: live ? "extended" : "started" };
    }

    case "pending": {
      const session = await store.getSession(ev.sessionId);
      if (session && session.status === "open") await store.updateSession(session.id, { status: "pending" });
      return { status: "applied", note: "pending" };
    }

    case "failed": {
      if (ev.recurring) {
        const sub = await subForEvent(e, ev.provider, ev.providerSubId);
        if (!sub?.id) throw new Error("failed renewal for an unknown subscription");
        return failRenewal(e, sub);
      }
      const session = ev.sessionId ? await store.getSession(ev.sessionId) : null;
      if (session && session.status !== "paid") await store.updateSession(session.id, { status: "failed" });
      return { status: "applied", note: "checkout failed" };
    }

    case "past_due": {
      const sub = await store.subByProviderId(ev.provider, ev.providerSubId);
      if (!sub?.id || sub.status !== "active") return { status: "ignored", note: "not active" };
      return failRenewal(e, sub);
    }

    case "refunded": {
      const pay = await store.paymentByProviderId(ev.provider, ev.paymentId);
      // Not a payment of ours (or not one we kept): nothing to undo. Retrying would not change that.
      if (!pay) return { status: "ignored", note: "refund for an unknown payment" };
      if (pay.status === "refunded") return { status: "ignored", note: "already refunded" };
      await store.markPaymentRefunded(pay.id, ev.at);
      const sub = pay.subscriptionId ? await store.subById(pay.subscriptionId) : null;
      if (sub?.id && ["active", "grace", "cancelled"].includes(sub.status)) await store.saveSub(refunded(sub, ev.at));
      const req = await store.refundRequestFor(pay.id);
      if (req && req.status === "waiting") await store.answerRefundRequest(req.id, "approved", ev.at);
      await syncEntitlement(e, pay.userId);
      // A payment that never bought a plan (refused) ends no Pro; the email says only that the money is back.
      await e.mail(pay.userId, "refundYes", pay.id, { sub, payment: { ...pay, status: "refunded", refundedAt: ev.at }, request: req, extra: pay.subscriptionId ? undefined : { noPlan: "1" } });
      return { status: "applied", note: "refunded" };
    }

    case "cancel_scheduled": {
      const sub = await store.subByProviderId(ev.provider, ev.providerSubId);
      if (!sub?.id) return { status: "ignored", note: "unknown subscription" };
      if (sub.status !== "active") return { status: "ignored", note: sub.status };
      const next = await store.saveSub(cancelled(sub, ev.at, sub.cancelReason));
      await syncEntitlement(e, sub.userId);
      await e.mail(sub.userId, "cancelled", `${sub.id}:${sub.currentPeriodEnd}`, { sub: next });
      return { status: "applied", note: "cancel scheduled" };
    }

    case "resumed": {
      const sub = await store.subByProviderId(ev.provider, ev.providerSubId);
      if (!sub?.id || sub.status !== "cancelled") return { status: "ignored", note: "not cancelled" };
      await store.saveSub(resumed(sub));
      await syncEntitlement(e, sub.userId);
      return { status: "applied", note: "resumed" };
    }

    case "ended": {
      const sub = await store.subByProviderId(ev.provider, ev.providerSubId);
      if (!sub?.id || ["ended", "paused", "refunded"].includes(sub.status)) return { status: "ignored", note: "already over" };
      await store.saveSub({ ...sub, status: sub.status === "grace" ? "paused" : "ended", endedAt: ev.at, graceUntil: null, nextRetryAt: null });
      await syncEntitlement(e, sub.userId);
      return { status: "applied", note: "ended" };
    }

    case "sub_created": {
      // The first payment usually carries Paddle's subscription id already; this covers the case where it did not.
      const session = ev.sessionId ? await store.getSession(ev.sessionId) : null;
      const userId = session?.userId ?? ev.userId;
      if (!userId) return { status: "ignored", note: "no learner" };
      const live = await store.liveSub(userId);
      if (live?.id && !live.providerSubId && live.provider === ev.provider) await store.saveSub({ ...live, providerSubId: ev.providerSubId });
      return { status: "applied", note: "linked" };
    }

    case "token": {
      const session = ev.orderRef ? await store.sessionByRef(ev.provider, ev.orderRef) : null;
      if (!session) return { status: "ignored", note: "token for an unknown order" };
      await store.saveToken(session.userId, ev.provider, await e.seal(ev.token), ev.card);
      return { status: "applied", note: "card saved" };
    }
  }
}

/**
 * The price region comes from the country the learner was in when they opened the checkout. If the billing country
 * they then entered in Paddle's checkout belongs to a region with a higher price, renewals move to the Gulf price
 * (the highest Paddle price) from the next billing date. The first period keeps the price that was paid.
 */
async function checkPayerCountry(e: Engine, ev: Paid, sub: Sub): Promise<Sub> {
  const country = await e.actions?.payerCountry?.(ev).catch(() => null);
  if (!country) return sub;
  if (regionFor(country) === sub.region || PRICES[sub.region].year >= PRICES.gulf.year) return sub;
  const next = { ...sub, region: "gulf" as const, country: country.toUpperCase() };
  next.renewAmountMinor = renewalPrice(next, next.pendingPeriod ?? next.period, next.currentPeriodEnd);
  await e.actions?.reprice?.(next, "gulf");
  return e.store.saveSub(next);
}

/** A renewal failed: 7-day grace with retries, Pro stays on, one email per failed period. */
export async function failRenewal(e: Engine, sub: Sub): Promise<ApplyResult> {
  const first = sub.status !== "grace";
  const next = await e.store.saveSub(renewalFailed(sub));
  await syncEntitlement(e, sub.userId);
  // A wallet payer who has not paid yet sees the notice in Plan and billing; they already had the walletDue email.
  if (first && sub.payMethod !== "wallet") await e.mail(sub.userId, "payFailed", `${sub.id}:${sub.currentPeriodEnd}`, { sub: next });
  return { status: "applied", note: first ? "grace started" : "retry failed" };
}

/** Hooks that tell the provider about a learner's own change (Paddle runs its own renewals, so it must know). */
export type ProviderActions = {
  cancel?: (sub: Sub) => Promise<void>;
  resume?: (sub: Sub) => Promise<void>;
  changePeriod?: (sub: Sub, period: Sub["period"]) => Promise<void>;
};

/** The learner cancels: no more charges, Pro to the end of the paid period, one email. */
export async function cancelPlan(e: Engine, userId: string, reason: string | null, p: ProviderActions = {}): Promise<Sub | null> {
  const sub = await e.store.liveSub(userId);
  if (!sub?.id || (sub.status !== "active" && sub.status !== "grace")) return sub;
  if (sub.provider === "paddle") await p.cancel?.(sub);
  const at = e.now?.() ?? new Date().toISOString();
  const next = await e.store.saveSub(cancelled(sub, at, reason));
  await syncEntitlement(e, userId);
  if (next.status === "cancelled") await e.mail(userId, "cancelled", `${sub.id}:${sub.currentPeriodEnd}`, { sub: next });
  return next;
}

/** The learner resumes a cancelled plan before it ends. */
export async function resumePlan(e: Engine, userId: string, p: ProviderActions = {}): Promise<Sub | null> {
  const sub = await e.store.liveSub(userId);
  if (!sub?.id || sub.status !== "cancelled") return sub;
  if (sub.provider === "paddle") await p.resume?.(sub);
  const next = await e.store.saveSub(resumed(sub));
  await syncEntitlement(e, userId);
  return next;
}

/** The learner switches between monthly and annual; it starts at the end of the paid period, nothing is charged today. */
export async function changePlan(e: Engine, userId: string, period: Sub["period"], p: ProviderActions = {}): Promise<Sub | null> {
  const sub = await e.store.liveSub(userId);
  if (!sub?.id || sub.status !== "active") return sub;
  if (sub.provider === "paddle") await p.changePeriod?.(sub, period);
  return e.store.saveSub(planChanged(sub, period));
}
