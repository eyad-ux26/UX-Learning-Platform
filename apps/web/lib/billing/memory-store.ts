// An in-memory BillingStore for tests: the same contract the Supabase store keeps, with no database.
import type { BillingStore, Learner, Payment, RefundRequest, Session } from "./engine";
import type { EmailKind } from "./emails";
import type { BillingProvider, Card, Entitlement, Sub } from "./subscription";

let n = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

export class MemoryStore implements BillingStore {
  events = new Map<string, { type: string; error: string | null; processed: boolean; claimed: boolean }>();
  sessions = new Map<string, Session>();
  subs = new Map<string, Sub>();
  payments = new Map<string, Payment>();
  entitlements = new Map<string, Entitlement>();
  tokens = new Map<string, { token: string; card: Card }>();
  requests = new Map<string, RefundRequest>();
  learners = new Map<string, Learner>();
  emails = new Map<string, { status: string; locale: string; to: string }>();
  private receipt = 0;

  async recordEvent(provider: string, eventId: string, eventType: string) {
    const k = `${provider}:${eventId}`;
    const seen = this.events.get(k);
    if (seen) {
      // A half-applied event is tried again, by one caller at a time (the Supabase store claims it in one update).
      if (seen.processed || seen.claimed) return false;
      seen.claimed = true;
      return true;
    }
    this.events.set(k, { type: eventType, error: null, processed: false, claimed: true });
    return true;
  }
  async markEvent(provider: string, eventId: string, error: string | null) {
    const e = this.events.get(`${provider}:${eventId}`);
    if (e) Object.assign(e, { error, processed: !error, claimed: false });
  }
  async getSession(id: string) { return this.sessions.get(id) ?? null; }
  async sessionByRef(provider: BillingProvider, ref: string) { return [...this.sessions.values()].find((s) => s.provider === provider && s.providerRef === ref) ?? null; }
  async updateSession(id: string, patch: Partial<Session>) { const s = this.sessions.get(id); if (s) Object.assign(s, patch); }
  async liveSub(userId: string) { const s = [...this.subs.values()].find((x) => x.userId === userId && ["active", "grace", "cancelled"].includes(x.status)); return s ? { ...s } : null; }
  async latestSub(userId: string) { const s = [...this.subs.values()].filter((x) => x.userId === userId).at(-1); return s ? { ...s } : null; }
  async subById(id: string) { const s = this.subs.get(id); return s ? { ...s } : null; }
  async dueSubs() { return [...this.subs.values()].filter((s) => ["active", "grace", "cancelled"].includes(s.status)).map((s) => ({ ...s })); }
  async subByProviderId(provider: BillingProvider, id: string) { const s = [...this.subs.values()].find((x) => x.provider === provider && x.providerSubId === id); return s ? { ...s } : null; }
  async saveSub(sub: Sub) {
    const live = ["active", "grace", "cancelled"];
    if (live.includes(sub.status) && [...this.subs.values()].some((s) => s.userId === sub.userId && s.id !== sub.id && live.includes(s.status))) throw new Error("duplicate live subscription");
    const saved = { ...sub, id: sub.id ?? uuid() };
    this.subs.set(saved.id, saved);
    return { ...saved };
  }
  async paymentByProviderId(provider: BillingProvider, id: string) { return [...this.payments.values()].find((p) => p.provider === provider && p.providerPaymentId === id) ?? null; }
  async insertPayment(p: Omit<Payment, "id" | "receiptNo" | "refundedAt" | "status">) {
    if (await this.paymentByProviderId(p.provider, p.providerPaymentId)) return null;
    const pay: Payment = { ...p, id: uuid(), receiptNo: `UXG-2026-${String(++this.receipt).padStart(6, "0")}`, status: "paid", refundedAt: null };
    this.payments.set(pay.id, pay);
    return { ...pay };
  }
  async linkPayment(id: string, subscriptionId: string, periodEnd: string) { const p = this.payments.get(id); if (p) Object.assign(p, { subscriptionId, periodEnd }); }
  async markPaymentRefunded(id: string, at: string) { const p = this.payments.get(id); if (p) Object.assign(p, { status: "refunded", refundedAt: at }); }
  async getEntitlement(userId: string) { return this.entitlements.get(userId) ?? null; }
  async saveEntitlement(userId: string, e: Entitlement) { this.entitlements.set(userId, { ...e }); }
  async saveToken(userId: string, provider: BillingProvider, token: string, card: Card) { this.tokens.set(`${userId}:${provider}`, { token, card }); }
  async refundRequestFor(paymentId: string) { return [...this.requests.values()].find((r) => r.paymentId === paymentId) ?? null; }
  async answerRefundRequest(id: string, status: "approved" | "declined", at: string) { const r = this.requests.get(id); if (r) Object.assign(r, { status, answeredAt: at }); }
  async learner(userId: string) { return this.learners.get(userId) ?? null; }
  async claimEmail(userId: string, kind: EmailKind, ref: string, locale: string, to: string) {
    const k = `${userId}:${kind}:${ref}`;
    if (this.emails.has(k)) return false;
    this.emails.set(k, { status: "queued", locale, to });
    return true;
  }
  async markEmail(userId: string, kind: EmailKind, ref: string, status: "sent" | "skipped" | "failed") {
    const e = this.emails.get(`${userId}:${kind}:${ref}`);
    if (e) e.status = status;
  }
}
