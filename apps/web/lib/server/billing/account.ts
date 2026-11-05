import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { providerFor, regionFor, UNKNOWN_COUNTRY, type Period, type Region } from "@/lib/billing/pricing";
import { isPro, startSub, welcomeBackEligible, type Entitlement, type Sub } from "@/lib/billing/subscription";
import type { Payment, RefundRequest } from "@/lib/billing/engine";
import { entitlementFromRow, paymentFromRow, requestFromRow, subFromRow } from "./store";
import { ipCountry, mockAllowed, providerMode, type Mode } from "./config";
import { billingTablesMissing, noteBillingError } from "./tables";

// What the billing screens need about the signed-in learner, read with their own session (RLS: own rows only).

export type BillingView = {
  pro: boolean;
  entitlement: Entitlement | null;
  sub: Sub | null;
  payments: Payment[];
  requests: RefundRequest[];
  country: string;
  region: Region;
  provider: "paymob" | "paddle";
  mode: Mode;
  welcomeBack: boolean;
  student: { verified: boolean; validUntil: string | null };
};

/** The host this page request came to. Never x-forwarded-host: the sender sets it (see hostOf). */
export async function requestHost(): Promise<string | null> {
  return (await headers()).get("host");
}

export async function requestCountry(): Promise<string | null> {
  return ipCountry(await headers());
}

/**
 * The learner's entitlement row: one primary-key read with their own session (RLS), no retries. Any read error, or
 * billing tables that are not there yet, gives null, which counts as Free: locked is the safe side.
 */
export async function readEntitlement(db: SupabaseClient, userId: string): Promise<Entitlement | null> {
  if (billingTablesMissing()) return null;
  const { data, error } = await db.from("entitlements").select("plan, valid_until, pro_since, pro_ended_at, source").eq("user_id", userId).retry(false).maybeSingle();
  if (error) { noteBillingError(error); return null; }
  return entitlementFromRow(data);
}

/**
 * Is the learner on Pro right now? Pro from the test payment page counts only on a host where test payments are
 * allowed, never on uxgate.org or the production workers.dev host. Pages get this from getLearner (read once per
 * request); API routes call it once.
 */
export async function readPro(db: SupabaseClient | null, userId: string, host: string | null): Promise<boolean> {
  if (!db) return process.env.UG_DEV_PRO === "1";
  return proFrom(await readEntitlement(db, userId), host);
}

export const proFrom = (e: Entitlement | null, host: string | null): boolean => isPro(e, new Date(), mockAllowed(host));

/** The billing screens' view. The entitlement comes from getLearner, already read for this request. */
export async function loadBilling(me: { db: SupabaseClient | null; userId: string; entitlement: Entitlement | null }, fixtureState?: string): Promise<BillingView> {
  const { db, userId } = me;
  const host = await requestHost();
  if (!db) return fixtureBilling(fixtureState, host);
  // Test-mode plans and payments exist only on preview hosts; elsewhere they are left out as if they never happened.
  const allowMock = mockAllowed(host);
  const notMock = <Q extends { neq: (c: string, v: string) => Q }>(q: Q) => (allowMock ? q : q.neq("provider", "mock"));
  const none = { data: null, error: null };
  const skip = billingTablesMissing(); // 0036 not applied yet: no round trips, an empty Free view
  const [subs, pays, reqs, country0] = await Promise.all([
    skip ? none : notMock(db.from("subscriptions").select("*").eq("user_id", userId)).order("created_at", { ascending: false }).limit(1).retry(false),
    skip ? none : notMock(db.from("payments").select("*").eq("user_id", userId)).order("paid_at", { ascending: false }).limit(24).retry(false),
    skip ? none : db.from("refund_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).retry(false),
    requestCountry(),
  ]);
  noteBillingError(subs.error);
  const entitlement = me.entitlement;
  const sub = subs.data?.[0] ? subFromRow(subs.data[0]) : null;
  const payments = (pays.data ?? []).map(paymentFromRow);
  const shown = new Set(payments.map((p) => p.id));
  // A live plan keeps the country it was bought in; a new purchase is priced for the country the request comes from.
  const live = !!sub && ["active", "grace", "cancelled"].includes(sub.status);
  const country = (live ? sub!.country : null) ?? country0 ?? UNKNOWN_COUNTRY;
  const region = regionFor(country);
  const provider = providerFor(region);
  return {
    pro: isPro(entitlement, new Date(), allowMock), entitlement, sub, payments, requests: (reqs.data ?? []).map(requestFromRow).filter((r) => shown.has(r.paymentId)),
    country, region, provider, mode: providerMode(provider, host), welcomeBack: welcomeBackEligible(entitlement),
    // The student check is server-only; the plans page reads it through the admin client when it needs it.
    student: { verified: false, validUntil: null },
  };
}

/**
 * Made-up billing states for screens without a database (UG_DEV_FIXTURE=1, never on a deployed host), so every
 * designed state can be looked at and checked: free, active, failed, lapsed, cancelled, wallet, walletLate, expiring.
 */
export function fixtureBilling(state: string | undefined, host: string | null = null): BillingView {
  const now = Date.now();
  const iso = (days: number) => new Date(now + days * 86_400_000).toISOString();
  const region: Region = "eg";
  const base = startSub({ userId: "fixture", provider: "paymob", region, country: "EG", period: "month" as Period, currency: "EGP", renewAmountMinor: 24900, discount: null, discountUntil: null, at: iso(-2), card: { method: "card", brand: "Visa", last4: "4242", expiry: "08/28" } });
  let sub: Sub | null = { ...base, id: "fixture-sub", currentPeriodEnd: iso(28) };
  const pay = (days: number, status: Payment["status"] = "paid"): Payment => ({ id: `fixture-pay${days}`, userId: "fixture", subscriptionId: "fixture-sub", provider: "paymob", providerPaymentId: `fx${days}`, receiptNo: "UXG-2026-000214", kind: "first", period: "month", amountMinor: 24900, currency: "EGP", status, payMethod: "card", cardBrand: "Visa", cardLast4: "4242", paidAt: iso(days), periodEnd: iso(days + 30), refundedAt: null });
  let payments: Payment[] = [pay(-2)];
  let requests: RefundRequest[] = [];
  switch (state) {
    case "failed": sub = { ...sub, status: "grace", currentPeriodStart: iso(-31), currentPeriodEnd: iso(-1), graceUntil: iso(6), nextRetryAt: iso(1) }; payments = [pay(-31)]; break;
    case "lapsed": sub = { ...sub, status: "paused", currentPeriodStart: iso(-38), currentPeriodEnd: iso(-8), graceUntil: null, endedAt: iso(-1) }; payments = [pay(-38)]; break;
    case "cancelled": sub = { ...sub, status: "cancelled", cancelledAt: iso(0) }; break;
    case "wallet": sub = { ...sub, payMethod: "wallet", cardBrand: "wallet", cardLast4: "4521", cardExpiry: null, currentPeriodEnd: iso(3) }; break;
    case "walletLate": sub = { ...sub, payMethod: "wallet", cardBrand: "wallet", cardLast4: "4521", cardExpiry: null, status: "grace", currentPeriodStart: iso(-32), currentPeriodEnd: iso(-2), graceUntil: iso(5) }; payments = [pay(-32)]; break;
    case "expiring": sub = { ...sub, cardExpiry: new Date(now).toISOString().slice(5, 7) + "/" + new Date(now).toISOString().slice(2, 4) }; break;
    case "late": payments = [pay(-17)]; sub = { ...sub, currentPeriodStart: iso(-17), currentPeriodEnd: iso(13) }; break;
    case "requested": requests = [{ id: "fixture-rq", userId: "fixture", paymentId: "fixture-pay-2", amountMinor: 24900, currency: "EGP", reason: "I meant to choose the annual plan, not monthly.", status: "waiting", createdAt: iso(0), answeredAt: null }]; break;
    case "welcome": sub = null; payments = []; break;
    case undefined: case "": case "free": sub = null; payments = []; break;
  }
  const pro = !!sub && ["active", "grace", "cancelled"].includes(sub.status);
  const entitlement: Entitlement = pro ? { plan: "pro", validUntil: sub!.graceUntil ?? sub!.currentPeriodEnd, proSince: sub!.currentPeriodStart, proEndedAt: null } : { plan: "free", validUntil: null, proSince: null, proEndedAt: state === "welcome" ? iso(-90) : null };
  return { pro, entitlement, sub, payments, requests, country: "EG", region, provider: "paymob", mode: providerMode("paymob", host) === "live" ? "live" : "mock", welcomeBack: state === "welcome", student: { verified: false, validUntil: null } };
}
