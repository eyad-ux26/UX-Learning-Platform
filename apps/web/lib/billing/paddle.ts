// Paddle Billing (every country but Egypt): webhook check and translation. HTTP calls live in lib/server/billing/paddle-api.ts.
// Paddle signs `${ts}:${rawBody}` with HMAC-SHA256 and sends `Paddle-Signature: ts=...;h1=...`.
import { hmacHex, safeEqual } from "./crypto";
import type { BillingEvent, Verified } from "./events";
import type { Card } from "./subscription";

/** Signatures older than this are refused, so a captured request cannot be replayed later. */
export const MAX_SKEW_SECONDS = 300;

export function parseSignature(header: string | null): { ts: string; h1: string[] } | null {
  if (!header) return null;
  let ts = "";
  const h1: string[] = [];
  for (const part of header.split(";")) {
    const [k, v] = part.split("=").map((x) => x?.trim());
    if (k === "ts" && v) ts = v;
    if (k === "h1" && v) h1.push(v.toLowerCase());
  }
  return ts && h1.length ? { ts, h1 } : null;
}

type Obj = Record<string, unknown>;
const o = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const s = (v: unknown): string | null => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null);

function cardFrom(data: Obj): Card | null {
  const pay = (Array.isArray(data.payments) ? data.payments : []).map(o).find((p) => p.status === "captured") ?? o((data.payments as unknown[] | undefined)?.[0]);
  const md = o(pay.method_details);
  if (!md.type) return null;
  const card = o(md.card);
  const mm = Number(card.expiry_month), yy = Number(card.expiry_year);
  return {
    method: "card",
    brand: s(card.type) ?? s(md.type),
    last4: s(card.last4),
    expiry: mm && yy ? `${String(mm).padStart(2, "0")}/${String(yy).slice(-2)}` : null,
  };
}

/** The units a transaction bought, across its items. A missing quantity counts as 1, as in Paddle. */
function quantityOf(data: Obj): number {
  const items = Array.isArray(data.items) ? data.items.map(o) : [];
  if (!items.length) return 1;
  return items.reduce((n, it) => {
    const q = Number(it.quantity ?? 1);
    return n + (Number.isFinite(q) && q > 0 ? q : 1);
  }, 0);
}

const RECURRING = new Set(["subscription_recurring", "subscription_charge"]);

/** Translates one verified Paddle notification into our events. */
export function paddleEvents(body: Obj): BillingEvent[] {
  const type = String(body.event_type ?? "");
  const eventId = String(body.event_id ?? "");
  const at = s(body.occurred_at) ?? new Date().toISOString();
  const data = o(body.data);
  const custom = o(data.custom_data);
  const base = { provider: "paddle" as const, eventId, at };
  const subId = type.startsWith("subscription.") ? s(data.id) : s(data.subscription_id);

  switch (type) {
    case "transaction.completed": {
      const totals = o(o(data.details).totals);
      const period = o(data.billing_period);
      const origin = s(data.origin) ?? "";
      if (origin === "subscription_payment_method_change") return [{ ...base, type: "ignored", eventType: `${type}:${origin}` }];
      return [{
        ...base, type: "paid", paymentId: s(data.id) ?? eventId, sessionId: s(custom.session_id), providerSubId: subId, userId: s(custom.user_id),
        amountMinor: Number(totals.grand_total ?? totals.total ?? 0), currency: s(data.currency_code) ?? "USD", recurring: RECURRING.has(origin),
        periodStart: s(period.starts_at), periodEnd: s(period.ends_at), card: cardFrom(data), customerId: s(data.customer_id), addressId: s(data.address_id), quantity: quantityOf(data),
      }];
    }
    case "transaction.payment_failed":
      return [{ ...base, type: "failed", sessionId: s(custom.session_id), providerSubId: subId, recurring: RECURRING.has(s(data.origin) ?? "") }];
    case "subscription.created":
    case "subscription.activated":
      return subId ? [{ ...base, type: "sub_created", providerSubId: subId, sessionId: s(custom.session_id), userId: s(custom.user_id), periodEnd: s(o(data.current_billing_period).ends_at) }] : [];
    case "subscription.past_due":
      return subId ? [{ ...base, type: "past_due", providerSubId: subId }] : [];
    case "subscription.canceled":
    case "subscription.paused":
      return subId ? [{ ...base, type: "ended", providerSubId: subId }] : [];
    case "subscription.resumed":
      return subId ? [{ ...base, type: "resumed", providerSubId: subId }] : [];
    case "subscription.updated": {
      if (!subId) return [];
      const status = s(data.status);
      const change = o(data.scheduled_change);
      if (status === "canceled" || status === "paused") return [{ ...base, type: "ended", providerSubId: subId }];
      if (status === "past_due") return [{ ...base, type: "past_due", providerSubId: subId }];
      if (change.action === "cancel") return [{ ...base, type: "cancel_scheduled", providerSubId: subId, effectiveAt: s(change.effective_at) }];
      return [{ ...base, type: "resumed", providerSubId: subId }];
    }
    case "adjustment.created":
    case "adjustment.updated":
      if (data.action === "refund" && data.status === "approved" && s(data.transaction_id)) return [{ ...base, type: "refunded", paymentId: s(data.transaction_id)! }];
      return [{ ...base, type: "ignored", eventType: `${type}:${String(data.status ?? "")}` }];
    default:
      return [{ ...base, type: "ignored", eventType: type }];
  }
}

/** Checks a Paddle notification's signature and age, then translates it. */
export async function verifyPaddle(body: string, header: string | null, secret: string, now: Date = new Date()): Promise<Verified> {
  const sig = parseSignature(header);
  if (!sig || !/^\d{1,12}$/.test(sig.ts)) return { ok: false, reason: "signature" };
  if (Math.abs(now.getTime() / 1000 - Number(sig.ts)) > MAX_SKEW_SECONDS) return { ok: false, reason: "signature" };
  const expected = await hmacHex("SHA-256", secret, `${sig.ts}:${body}`);
  if (!sig.h1.some((h) => safeEqual(expected, h))) return { ok: false, reason: "signature" };
  let json: Obj;
  try { json = JSON.parse(body); } catch { return { ok: false, reason: "payload" }; }
  if (!json.event_id || !json.event_type) return { ok: false, reason: "payload" };
  return { ok: true, events: paddleEvents(json), eventType: String(json.event_type), eventId: String(json.event_id) };
}

/**
 * A transaction id from Paddle's own payment links (card updates, invoices). Paddle sends them to the default payment
 * link (our Check and pay page) as ?_ptxn=txn_…. Anything that doesn't look like a Paddle transaction id is ignored.
 */
export function paddleLinkTxn(v: string | string[] | undefined | null): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^txn_[a-z0-9]{10,40}$/i.test(s) ? s : null;
}
