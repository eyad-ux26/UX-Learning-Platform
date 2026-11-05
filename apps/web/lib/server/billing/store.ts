import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingStore, Payment, RefundRequest, Session } from "@/lib/billing/engine";
import type { EmailKind } from "@/lib/billing/emails";
import type { BillingProvider, Card, Entitlement, Sub } from "@/lib/billing/subscription";

// The billing store on Supabase, used with the service-role client only (webhooks, the daily job, and server routes
// after they have checked who is asking). Column names map one to one onto the engine's types.

type Row = Record<string, unknown>;
const LIVE = ["active", "grace", "cancelled"];

export const subFromRow = (r: Row): Sub => ({
  id: r.id as string, userId: r.user_id as string, provider: r.provider as BillingProvider, providerSubId: (r.provider_sub_id as string) ?? null,
  region: r.region as Sub["region"], country: r.country as string, period: r.period as Sub["period"], currency: r.currency as string,
  renewAmountMinor: r.renew_amount_minor as number, discount: (r.discount as Sub["discount"]) ?? null, discountUntil: (r.discount_until as string) ?? null,
  status: r.status as Sub["status"], currentPeriodStart: r.current_period_start as string, currentPeriodEnd: r.current_period_end as string,
  graceUntil: (r.grace_until as string) ?? null, nextRetryAt: (r.next_retry_at as string) ?? null, retries: (r.retries as number) ?? 0,
  pendingPeriod: (r.pending_period as Sub["pendingPeriod"]) ?? null, payMethod: (r.pay_method as Sub["payMethod"]) ?? null,
  cardBrand: (r.card_brand as string) ?? null, cardLast4: (r.card_last4 as string) ?? null, cardExpiry: (r.card_expiry as string) ?? null,
  cancelReason: (r.cancel_reason as string) ?? null, cancelledAt: (r.cancelled_at as string) ?? null, endedAt: (r.ended_at as string) ?? null,
});

const subToRow = (s: Sub) => ({
  user_id: s.userId, provider: s.provider, provider_sub_id: s.providerSubId, region: s.region, country: s.country, period: s.period, currency: s.currency,
  renew_amount_minor: s.renewAmountMinor, discount: s.discount, discount_until: s.discountUntil, status: s.status,
  current_period_start: s.currentPeriodStart, current_period_end: s.currentPeriodEnd, grace_until: s.graceUntil, next_retry_at: s.nextRetryAt,
  retries: s.retries, pending_period: s.pendingPeriod, pay_method: s.payMethod, card_brand: s.cardBrand, card_last4: s.cardLast4,
  card_expiry: s.cardExpiry, cancel_reason: s.cancelReason, cancelled_at: s.cancelledAt, ended_at: s.endedAt, updated_at: new Date().toISOString(),
});

export const sessionFromRow = (r: Row): Session => ({
  id: r.id as string, userId: r.user_id as string, kind: r.kind as Session["kind"], subscriptionId: (r.subscription_id as string) ?? null,
  provider: r.provider as BillingProvider, region: r.region as Session["region"], country: r.country as string, period: r.period as Session["period"],
  discount: (r.discount as Session["discount"]) ?? null, discountUntil: (r.discount_until as string) ?? null, code: (r.code as string) ?? null,
  amountMinor: r.amount_minor as number, renewAmountMinor: r.renew_amount_minor as number, currency: r.currency as string,
  locale: r.locale as Session["locale"], status: r.status as Session["status"], providerRef: (r.provider_ref as string) ?? null, createdAt: r.created_at as string,
});

export const paymentFromRow = (r: Row): Payment => ({
  id: r.id as string, userId: r.user_id as string, subscriptionId: (r.subscription_id as string) ?? null, provider: r.provider as BillingProvider,
  providerPaymentId: r.provider_payment_id as string, receiptNo: r.receipt_no as string, kind: r.kind as Payment["kind"], period: r.period as Payment["period"],
  amountMinor: r.amount_minor as number, currency: r.currency as string, status: r.status as Payment["status"], payMethod: (r.pay_method as Payment["payMethod"]) ?? null,
  cardBrand: (r.card_brand as string) ?? null, cardLast4: (r.card_last4 as string) ?? null, paidAt: r.paid_at as string,
  periodEnd: (r.period_end as string) ?? null, refundedAt: (r.refunded_at as string) ?? null,
});

export const requestFromRow = (r: Row): RefundRequest => ({
  id: r.id as string, userId: r.user_id as string, paymentId: r.payment_id as string, amountMinor: r.amount_minor as number, currency: r.currency as string,
  reason: r.reason as string, status: r.status as RefundRequest["status"], createdAt: r.created_at as string, answeredAt: (r.answered_at as string) ?? null,
});

export const entitlementFromRow = (r: Row | null): Entitlement | null =>
  r ? { plan: r.plan as Entitlement["plan"], validUntil: (r.valid_until as string) ?? null, proSince: (r.pro_since as string) ?? null, proEndedAt: (r.pro_ended_at as string) ?? null, source: r.source === "mock" || r.source === "manual" ? r.source : "live" } : null;

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export class SupabaseBillingStore implements BillingStore {
  constructor(private db: SupabaseClient) {}

  async recordEvent(provider: string, eventId: string, eventType: string, payload: unknown) {
    const now = new Date().toISOString();
    const { data, error } = await this.db.from("billing_events").upsert({ provider, event_id: eventId, event_type: eventType, payload, claimed_at: now }, { onConflict: "provider,event_id", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(error.message);
    if ((data ?? []).length > 0) return true;
    // Seen before: only an event that failed half way (never processed) is tried again, and only by one request at a
    // time. The claim is one conditional update, so two deliveries at the same moment cannot both apply it. A claim
    // older than 5 minutes belongs to a request that died, and can be taken over.
    const stale = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: claimed, error: err } = await this.db.from("billing_events").update({ claimed_at: now })
      .eq("provider", provider).eq("event_id", eventId).is("processed_at", null).or(`claimed_at.is.null,claimed_at.lt."${stale}"`).select("id");
    if (err) throw new Error(err.message);
    return (claimed ?? []).length > 0;
  }
  async markEvent(provider: string, eventId: string, error: string | null) {
    await this.db.from("billing_events").update({ processed_at: error ? null : new Date().toISOString(), error, claimed_at: null }).eq("provider", provider).eq("event_id", eventId);
  }
  async getSession(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const r = must(await this.db.from("checkout_sessions").select("*").eq("id", id).maybeSingle());
    return r ? sessionFromRow(r) : null;
  }
  async sessionByRef(provider: BillingProvider, ref: string) {
    const r = must(await this.db.from("checkout_sessions").select("*").eq("provider", provider).eq("provider_ref", ref).order("created_at", { ascending: false }).limit(1).maybeSingle());
    return r ? sessionFromRow(r) : null;
  }
  async updateSession(id: string, patch: Partial<Pick<Session, "status" | "providerRef">>) {
    const row: Row = { updated_at: new Date().toISOString() };
    if (patch.status) row.status = patch.status;
    if (patch.providerRef !== undefined) row.provider_ref = patch.providerRef;
    must(await this.db.from("checkout_sessions").update(row).eq("id", id));
  }
  async liveSub(userId: string) {
    const r = must(await this.db.from("subscriptions").select("*").eq("user_id", userId).in("status", LIVE).maybeSingle());
    return r ? subFromRow(r) : null;
  }
  async latestSub(userId: string) {
    const r = must(await this.db.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle());
    return r ? subFromRow(r) : null;
  }
  async subById(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const r = must(await this.db.from("subscriptions").select("*").eq("id", id).maybeSingle());
    return r ? subFromRow(r) : null;
  }
  async subByProviderId(provider: BillingProvider, providerSubId: string) {
    const r = must(await this.db.from("subscriptions").select("*").eq("provider", provider).eq("provider_sub_id", providerSubId).maybeSingle());
    return r ? subFromRow(r) : null;
  }
  async dueSubs(now: string) {
    // Everything live whose date comes within the next 8 days, plus every grace period.
    const soon = new Date(new Date(now).getTime() + 8 * 86_400_000).toISOString();
    const rows = must(await this.db.from("subscriptions").select("*").in("status", LIVE).or(`current_period_end.lte.${soon},status.eq.grace`).limit(1000));
    return (rows ?? []).map(subFromRow);
  }
  async saveSub(sub: Sub) {
    const row = subToRow(sub);
    const r = sub.id
      ? must(await this.db.from("subscriptions").update(row).eq("id", sub.id).select("*").single())
      : must(await this.db.from("subscriptions").insert(row).select("*").single());
    return subFromRow(r);
  }
  async paymentByProviderId(provider: BillingProvider, providerPaymentId: string) {
    const r = must(await this.db.from("payments").select("*").eq("provider", provider).eq("provider_payment_id", providerPaymentId).maybeSingle());
    return r ? paymentFromRow(r) : null;
  }
  async insertPayment(p: Omit<Payment, "id" | "receiptNo" | "refundedAt" | "status">) {
    const { data, error } = await this.db.from("payments").upsert({
      user_id: p.userId, subscription_id: p.subscriptionId, provider: p.provider, provider_payment_id: p.providerPaymentId, kind: p.kind, period: p.period,
      amount_minor: p.amountMinor, currency: p.currency, status: "paid", pay_method: p.payMethod, card_brand: p.cardBrand, card_last4: p.cardLast4,
      paid_at: p.paidAt, period_end: p.periodEnd,
    }, { onConflict: "provider,provider_payment_id", ignoreDuplicates: true }).select("*");
    if (error) throw new Error(error.message);
    return data?.[0] ? paymentFromRow(data[0]) : null;
  }
  async linkPayment(id: string, subscriptionId: string, periodEnd: string) {
    must(await this.db.from("payments").update({ subscription_id: subscriptionId, period_end: periodEnd }).eq("id", id));
  }
  async markPaymentRefunded(id: string, at: string) {
    must(await this.db.from("payments").update({ status: "refunded", refunded_at: at }).eq("id", id));
  }
  async getEntitlement(userId: string) {
    return entitlementFromRow(must(await this.db.from("entitlements").select("*").eq("user_id", userId).maybeSingle()));
  }
  async saveEntitlement(userId: string, e: Entitlement) {
    must(await this.db.from("entitlements").upsert({ user_id: userId, plan: e.plan, valid_until: e.validUntil, pro_since: e.proSince, pro_ended_at: e.proEndedAt, source: e.source ?? "live", updated_at: new Date().toISOString() }, { onConflict: "user_id" }));
  }
  async saveToken(userId: string, provider: BillingProvider, sealedToken: string, card: Card) {
    must(await this.db.from("payment_tokens").upsert({ user_id: userId, provider, token: sealedToken, card_brand: card.brand ?? null, card_last4: card.last4 ?? null, card_expiry: card.expiry ?? null }, { onConflict: "user_id,provider" }));
  }
  async refundRequestFor(paymentId: string) {
    const r = must(await this.db.from("refund_requests").select("*").eq("payment_id", paymentId).maybeSingle());
    return r ? requestFromRow(r) : null;
  }
  async answerRefundRequest(id: string, status: "approved" | "declined", at: string) {
    must(await this.db.from("refund_requests").update({ status, answered_at: at }).eq("id", id));
  }
  async learner(userId: string) {
    const [{ data: u }, { data: p }] = await Promise.all([
      this.db.auth.admin.getUserById(userId),
      this.db.from("profiles").select("display_name, locale").eq("user_id", userId).maybeSingle(),
    ]);
    const email = u?.user?.email;
    if (!email) return null;
    const meta = (u.user?.user_metadata ?? {}) as { locale?: string };
    const locale = (p?.locale ?? meta.locale) === "ar" ? "ar" : "en";
    return { email, locale, name: (p?.display_name as string) ?? null } as const;
  }
  async claimEmail(userId: string, kind: EmailKind, ref: string, locale: string, to: string) {
    const { data, error } = await this.db.from("billing_emails").upsert({ user_id: userId, kind, ref, locale, to_email: to }, { onConflict: "user_id,kind,ref", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
  }
  async markEmail(userId: string, kind: EmailKind, ref: string, status: "sent" | "skipped" | "failed", providerId: string | null) {
    await this.db.from("billing_emails").update({ status, provider_id: providerId }).eq("user_id", userId).eq("kind", kind).eq("ref", ref);
  }
}
