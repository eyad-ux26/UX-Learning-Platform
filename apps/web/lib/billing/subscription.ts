// The life of a UXGate Pro subscription, as pure functions: start, renew, a failed renewal and its 7-day grace,
// cancel at the period end, resume, pause, refund, plan change at the period end, and the one entitlement the
// rest of the app checks. The server runs provider webhooks and the daily job through these; tests run them directly.
import { addPeriod, DISCOUNTS, discounted, PRICES, type DiscountKind, type Period, type Region } from "./pricing";

export type SubStatus = "active" | "grace" | "cancelled" | "paused" | "ended" | "refunded";
export type BillingProvider = "paymob" | "paddle" | "mock";
export type PayMethod = "card" | "wallet";

export type Sub = {
  id?: string;
  userId: string;
  provider: BillingProvider;
  providerSubId: string | null;
  region: Region;
  country: string;
  period: Period;
  currency: string;
  renewAmountMinor: number;
  discount: DiscountKind | null;
  discountUntil: string | null;
  status: SubStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  graceUntil: string | null;
  nextRetryAt: string | null;
  retries: number;
  pendingPeriod: Period | null;
  payMethod: PayMethod | null;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpiry: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  endedAt: string | null;
};

export type Card = { method: PayMethod; brand?: string | null; last4?: string | null; expiry?: string | null };

/**
 * `source: "mock"` marks Pro that came from the test payment page on a preview host. Previews share the production
 * database, so production never counts it (isPro without allowMock, and has_pro() in SQL).
 * `source: "manual"` is Pro granted by admins with SQL (supabase/README.md), with no payment: it counts everywhere,
 * nothing renews it, and plan events leave it alone while it lasts longer than the plan.
 */
export type Entitlement = { plan: "free" | "pro"; validUntil: string | null; proSince: string | null; proEndedAt: string | null; source?: "live" | "mock" | "manual" };

export const GRACE_DAYS = 7;
/** Failed renewals are tried again this many days after the charge date. */
export const RETRY_DAYS = [2, 5];
export const REFUND_DAYS = 7;
export const WELCOME_BACK_DAYS = 60;
export const RENEW_REMINDER_DAYS = 7; // annual plans
export const WALLET_REMINDER_DAYS = 3;

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString();
const plusDays = (at: string | Date, days: number) => new Date(new Date(at).getTime() + days * DAY);

/** Renewals by saved token are ours to run for Paymob (and the test provider); Paddle renews by itself. */
export const renewsHere = (s: Pick<Sub, "provider">) => s.provider !== "paddle";

/** The amount of the next charge for `period`, starting at `at`, with the discount the plan still carries. */
export function renewalPrice(s: Pick<Sub, "region" | "discount" | "discountUntil">, period: Period, at: string): number {
  const p = PRICES[s.region];
  const base = p[period];
  if (!s.discount || s.discount === "founding") return base; // founding is the first year only
  if (s.discountUntil && new Date(at) >= new Date(s.discountUntil)) return base;
  const d = DISCOUNTS[s.discount];
  return d.periods.includes(period) ? discounted(base, d.percent, p.currency) : base;
}

/** A first payment went through: a new plan starts now. */
export function startSub(input: {
  userId: string; provider: BillingProvider; providerSubId?: string | null; region: Region; country: string; period: Period; currency: string;
  renewAmountMinor: number; discount: DiscountKind | null; discountUntil: Date | null; at: string; periodEnd?: string | null; card?: Card | null;
}): Sub {
  const end = input.periodEnd ?? iso(addPeriod(new Date(input.at), input.period));
  return {
    userId: input.userId, provider: input.provider, providerSubId: input.providerSubId ?? null, region: input.region, country: input.country,
    period: input.period, currency: input.currency, renewAmountMinor: input.renewAmountMinor, discount: input.discount,
    discountUntil: input.discountUntil ? iso(input.discountUntil) : null, status: "active", currentPeriodStart: input.at, currentPeriodEnd: end,
    graceUntil: null, nextRetryAt: null, retries: 0, pendingPeriod: null,
    payMethod: input.card?.method ?? null, cardBrand: input.card?.brand ?? null, cardLast4: input.card?.last4 ?? null, cardExpiry: input.card?.expiry ?? null,
    cancelReason: null, cancelledAt: null, endedAt: null,
  };
}

/**
 * A renewal was paid (by token, by the wallet payer, or by Paddle). The new period starts where the old one ended,
 * even after a late payment in the grace period, so the billing date does not drift. A plan change waiting for
 * this date takes effect now.
 */
export function renewed(s: Sub, p: { at: string; periodStart?: string | null; periodEnd?: string | null; card?: Card | null }): Sub {
  const period = s.pendingPeriod ?? s.period;
  const start = p.periodStart ?? s.currentPeriodEnd;
  const end = p.periodEnd ?? iso(addPeriod(new Date(start), period));
  return {
    ...s, status: "active", period, pendingPeriod: null, currentPeriodStart: start, currentPeriodEnd: end,
    graceUntil: null, nextRetryAt: null, retries: 0, cancelledAt: null, cancelReason: null,
    renewAmountMinor: renewalPrice(s, period, end),
    ...(p.card ? { payMethod: p.card.method, cardBrand: p.card.brand ?? s.cardBrand, cardLast4: p.card.last4 ?? s.cardLast4, cardExpiry: p.card.expiry ?? s.cardExpiry } : {}),
  };
}

/**
 * A renewal charge failed (or a wallet payer has not paid by the period end). Pro stays on for 7 days from the
 * charge date; cards are tried again on day 2 and day 5. Wallets cannot be charged, so they get no retries.
 */
export function renewalFailed(s: Sub): Sub {
  const first = s.status !== "grace";
  const graceUntil = first ? iso(plusDays(s.currentPeriodEnd, GRACE_DAYS)) : s.graceUntil;
  const retries = first ? 0 : s.retries + 1; // retries already made
  const day = s.payMethod === "wallet" || !renewsHere(s) ? undefined : RETRY_DAYS[retries];
  return { ...s, status: "grace", graceUntil, retries, nextRetryAt: day === undefined ? null : iso(plusDays(s.currentPeriodEnd, day)) };
}

/** Cancel: no more charges, Pro stays on to the end of the paid period. An optional reason is kept. */
export function cancelled(s: Sub, at: string, reason: string | null): Sub {
  if (s.status !== "active" && s.status !== "grace") return s;
  // In the grace period the period is unpaid, so cancelling ends Pro now instead of keeping it to the grace date.
  if (s.status === "grace") return { ...s, status: "ended", cancelledAt: at, cancelReason: reason, endedAt: at, graceUntil: null, nextRetryAt: null };
  return { ...s, status: "cancelled", cancelledAt: at, cancelReason: reason, pendingPeriod: null };
}

/** Resume a cancelled plan before its end date: renewals start again, nothing else changes. */
export function resumed(s: Sub): Sub {
  if (s.status !== "cancelled") return s;
  return { ...s, status: "active", cancelledAt: null, cancelReason: null };
}

/** Change between monthly and annual: it starts when the paid period ends, with no charge today and no proration. */
export function planChanged(s: Sub, period: Period): Sub {
  if (s.status !== "active") return s;
  const pendingPeriod = period === s.period ? null : period;
  return { ...s, pendingPeriod, renewAmountMinor: renewalPrice(s, pendingPeriod ?? s.period, s.currentPeriodEnd) };
}

/** The daily job: a cancelled plan past its end date ends; a grace period that ran out pauses Pro. */
export function settle(s: Sub, now: string): Sub {
  const t = new Date(now);
  if (s.status === "cancelled" && t >= new Date(s.currentPeriodEnd)) return { ...s, status: "ended", endedAt: s.currentPeriodEnd };
  if (s.status === "grace" && s.graceUntil && t >= new Date(s.graceUntil)) return { ...s, status: "paused", endedAt: s.graceUntil, nextRetryAt: null };
  return s;
}

/** A refund was made: Pro ends at once. */
export function refunded(s: Sub, at: string): Sub {
  return { ...s, status: "refunded", endedAt: at, graceUntil: null, nextRetryAt: null, pendingPeriod: null };
}

/** The calendar day in Cairo. The daily job runs early in the Cairo morning and charges everything due that day. */
export const cairoDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/** Is a renewal charge due today (Paymob and the test provider; Paddle charges by itself)? */
export function renewalDue(s: Sub, now: string): boolean {
  if (!renewsHere(s)) return false;
  const today = cairoDay(now);
  if (s.status === "active") return s.payMethod !== "wallet" && today >= cairoDay(s.currentPeriodEnd);
  if (s.status === "grace") return !!s.nextRetryAt && today >= cairoDay(s.nextRetryAt);
  return false;
}

/** A wallet payer whose period ended without a payment moves to the grace period (no retries: we cannot charge a wallet). */
export function walletLate(s: Sub, now: string): boolean {
  return s.provider !== "paddle" && s.payMethod === "wallet" && s.status === "active" && new Date(now) >= new Date(s.currentPeriodEnd);
}

/** Pro is on for this plan right now, and until when. */
export function proUntil(s: Sub | null, now: string): string | null {
  if (!s) return null;
  const t = new Date(now);
  if ((s.status === "active" || s.status === "cancelled") && t < new Date(s.currentPeriodEnd)) return s.currentPeriodEnd;
  // A renewal not yet run by the daily job still counts as paid until the grace date it would get.
  if (s.status === "active" && t < plusDays(s.currentPeriodEnd, GRACE_DAYS)) return iso(plusDays(s.currentPeriodEnd, GRACE_DAYS));
  if (s.status === "grace" && s.graceUntil && t < new Date(s.graceUntil)) return s.graceUntil;
  return null;
}

/** The one row the app checks, recomputed from the learner's current plan. */
export function entitlementFor(s: Sub | null, prev: Entitlement | null, now: string): Entitlement {
  const until = proUntil(s, now);
  // A grant from admins stands until it ends, unless a paid plan runs longer.
  if (prev?.source === "manual" && prev.plan === "pro" && prev.validUntil && new Date(prev.validUntil) > new Date(now) && (!until || prev.validUntil >= until)) return prev;
  const source = s?.provider === "mock" ? "mock" : "live";
  if (until) return { plan: "pro", validUntil: until, proSince: prev?.plan === "pro" && prev.source === source && prev.proSince ? prev.proSince : (s?.currentPeriodStart ?? now), proEndedAt: prev?.proEndedAt ?? null, source };
  // Test-mode Pro ending is not a real end of Pro (it must not open the welcome-back discount).
  const wasPro = prev?.plan === "pro" && prev.source !== "mock";
  const ended = s?.endedAt ?? (wasPro ? now : null);
  return { plan: "free", validUntil: null, proSince: null, proEndedAt: wasPro ? ended : (prev?.proEndedAt ?? null), source: "live" };
}

/** Pro is on right now. Test-mode Pro counts only where test payments are allowed (`allowMock`, preview hosts). */
export const isPro = (e: Pick<Entitlement, "plan" | "validUntil" | "source"> | null, now: Date = new Date(), allowMock = false) =>
  !!e && e.plan === "pro" && !!e.validUntil && new Date(e.validUntil) > now && (allowMock || e.source !== "mock");

/** Welcome back: 40% off annual, applied by itself for a learner whose Pro ended 60 or more days ago. */
export function welcomeBackEligible(e: Entitlement | null, now: Date = new Date()): boolean {
  if (!e || isPro(e, now) || !e.proEndedAt) return false;
  return now.getTime() - new Date(e.proEndedAt).getTime() >= WELCOME_BACK_DAYS * DAY;
}

/** A refund can be asked within 7 days of a charge, once per charge. */
export function refundWindow(p: { paidAt: string; status: string }, hasRequest: boolean, now: Date = new Date()): { ok: boolean; until: string; reason?: "late" | "asked" | "refunded" } {
  const until = iso(plusDays(p.paidAt, REFUND_DAYS));
  if (p.status === "refunded") return { ok: false, until, reason: "refunded" };
  if (hasRequest) return { ok: false, until, reason: "asked" };
  if (now >= new Date(until)) return { ok: false, until, reason: "late" };
  return { ok: true, until };
}

/** The card's last valid month ("MM/YY") is before the next charge date. */
export function cardExpiresBefore(expiry: string | null, date: string): boolean {
  const m = expiry?.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const firstDayAfter = Date.UTC(2000 + Number(m[2]), Number(m[1]), 1); // month index is already +1
  return firstDayAfter <= new Date(date).getTime();
}

/** Which reminder emails the daily job sends today for this plan. */
export function remindersDue(s: Sub, now: string): ("renewSoon" | "walletDue")[] {
  if (s.status !== "active") return [];
  const left = (new Date(s.currentPeriodEnd).getTime() - new Date(now).getTime()) / DAY;
  const out: ("renewSoon" | "walletDue")[] = [];
  if (s.period === "year" && s.payMethod !== "wallet" && left > 0 && left <= RENEW_REMINDER_DAYS) out.push("renewSoon");
  if (s.payMethod === "wallet" && s.provider !== "paddle" && left > 0 && left <= WALLET_REMINDER_DAYS) out.push("walletDue");
  return out;
}
