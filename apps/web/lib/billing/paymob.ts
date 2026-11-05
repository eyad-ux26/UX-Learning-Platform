// Paymob (Egypt): webhook check and translation. The HTTP calls to Paymob live in lib/server/billing/paymob-api.ts.
// Paymob signs callbacks with HMAC-SHA512 over chosen fields in a fixed order; the hex digest comes as ?hmac=.
import { hmacHex, safeEqual } from "./crypto";
import type { BillingEvent, Verified } from "./events";
import type { Card } from "./subscription";

/** Field order Paymob signs for a transaction callback. */
export const TRANSACTION_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id", "is_3d_secure",
  "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order.id", "owner", "pending",
  "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];
/** Field order Paymob signs for a saved-card token callback. */
export const TOKEN_FIELDS = ["card_subtype", "created_at", "email", "id", "masked_pan", "merchant_id", "order_id", "token"];

type Obj = Record<string, unknown>;
const get = (o: Obj, path: string): unknown => path.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Obj)[k] : undefined), o);
const str = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "boolean" ? String(v) : String(v));

export const signedString = (obj: Obj, fields: string[]) => fields.map((f) => str(get(obj, f))).join("");

/** Our reference on a Paymob order: `s_<checkout session id>` for a checkout, `r_<subscription id>_<date>_<try>` for a renewal. */
export function parseRef(ref: unknown): { sessionId: string | null; subId: string | null } {
  const s = typeof ref === "string" ? ref : "";
  if (s.startsWith("s_")) return { sessionId: s.slice(2), subId: null };
  const m = s.match(/^r_([0-9a-f-]{36})_/);
  return { sessionId: null, subId: m ? m[1] : null };
}

const last4 = (v: unknown) => {
  const d = str(v).replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : null;
};

export function cardFrom(source: Obj | undefined): Card {
  const type = str(source?.type).toLowerCase();
  if (type === "wallet") return { method: "wallet", brand: "wallet", last4: last4(source?.pan), expiry: null };
  return { method: "card", brand: str(source?.sub_type) || null, last4: last4(source?.pan), expiry: null };
}

/** Turns one verified transaction object into our event. Also used for the direct reply to a token renewal charge, and by the test-mode provider. */
export function transactionEvent(obj: Obj, provider: "paymob" | "mock" = "paymob"): BillingEvent {
  const id = str(obj.id);
  const at = str(obj.created_at) ? new Date(str(obj.created_at)).toISOString() : new Date().toISOString();
  const ref = parseRef(get(obj, "order.merchant_order_id") ?? get(obj, "special_reference"));
  const base = { provider, at };
  if (obj.is_refunded === true || obj.is_voided === true) return { ...base, type: "refunded", eventId: `${id}:refunded`, paymentId: id };
  if (obj.is_refund === true && obj.has_parent_transaction === true && obj.parent_transaction)
    return { ...base, type: "refunded", eventId: `${id}:refund`, paymentId: str(obj.parent_transaction) };
  if (obj.success === true && obj.pending !== true)
    return {
      ...base, type: "paid", eventId: `${id}:paid`, paymentId: id, sessionId: ref.sessionId, providerSubId: ref.subId, userId: null,
      amountMinor: Number(obj.amount_cents), currency: str(obj.currency) || "EGP", recurring: !!ref.subId, periodStart: null, periodEnd: null,
      card: cardFrom(obj.source_data as Obj | undefined),
    };
  if (obj.pending === true && ref.sessionId) return { ...base, type: "pending", eventId: `${id}:pending`, sessionId: ref.sessionId };
  return { ...base, type: "failed", eventId: `${id}:failed`, sessionId: ref.sessionId, providerSubId: ref.subId, recurring: !!ref.subId };
}

/** Checks a Paymob callback and translates it. `hmac` is the query parameter Paymob sends with the POST. */
export async function verifyPaymob(body: string, hmac: string | null, secret: string): Promise<Verified> {
  let json: { type?: string; obj?: Obj };
  try { json = JSON.parse(body); } catch { return { ok: false, reason: "payload" }; }
  const obj = json?.obj;
  if (!obj || typeof obj !== "object") return { ok: false, reason: "payload" };
  const type = String(json.type ?? "TRANSACTION").toUpperCase();
  const fields = type === "TOKEN" ? TOKEN_FIELDS : TRANSACTION_FIELDS;
  const expected = await hmacHex("SHA-512", secret, signedString(obj, fields));
  if (!hmac || !safeEqual(expected, hmac.toLowerCase())) return { ok: false, reason: "signature" };

  if (type === "TOKEN") {
    const eventId = `token:${str(obj.id)}`;
    const ev: BillingEvent = {
      provider: "paymob", type: "token", eventId, at: new Date().toISOString(), orderRef: str(obj.order_id) || null, token: str(obj.token),
      card: { method: "card", brand: str(obj.card_subtype) || null, last4: last4(obj.masked_pan), expiry: null },
    };
    return { ok: true, events: [ev], eventType: "TOKEN", eventId };
  }
  if (type !== "TRANSACTION") {
    const eventId = `${type.toLowerCase()}:${str(obj.id)}`;
    return { ok: true, events: [{ provider: "paymob", type: "ignored", eventId, at: new Date().toISOString(), eventType: type }], eventType: type, eventId };
  }
  const ev = transactionEvent(obj);
  return { ok: true, events: [ev], eventType: "TRANSACTION", eventId: ev.eventId };
}
