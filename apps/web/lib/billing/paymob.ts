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

/**
 * Where Paymob may report the country that issued the card. NOT YET CONFIRMED against Paymob's sandbox (its docs host
 * could not be reached when this was written): look at a real card transaction once the test keys exist, and keep
 * only the right path (docs/billing-keys.md). While no path matches, the card country is unknown and nothing is refused.
 */
export const CARD_COUNTRY_PATHS = ["source_data.issuer_country", "source_data.card_issuer_country", "data.card_issuer_country", "data.issuer_country", "data.card_country"];

/** The card's issuing country (two letters, or Paymob's own code when it is not Egypt), or null when Paymob does not say. */
export function cardCountry(obj: Obj): string | null {
  for (const p of CARD_COUNTRY_PATHS) {
    const v = str(get(obj, p)).trim().toUpperCase();
    if (!v) continue;
    if (v === "EG" || v === "EGY" || v === "EGYPT") return "EG";
    if (/^[A-Z]{2,3}$/.test(v)) return v;
  }
  return null;
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
      card: cardFrom(obj.source_data as Obj | undefined), orderRef: str(get(obj, "order.id")) || null,
      ...(provider === "paymob" ? { cardCountry: cardCountry(obj) } : {}),
    };
  if (obj.pending === true && ref.sessionId) return { ...base, type: "pending", eventId: `${id}:pending`, sessionId: ref.sessionId };
  return { ...base, type: "failed", eventId: `${id}:failed`, sessionId: ref.sessionId, providerSubId: ref.subId, recurring: !!ref.subId };
}

/** Signed fields that must be the same in the callback and in Paymob's own copy of the transaction. */
const SAME = ["id", "amount_cents", "currency", "order.id"];

/**
 * Paymob's HMAC does not cover every field we act on (merchant_order_id, parent_transaction, is_refund), so the
 * callback is only a signal: the transaction is read again from Paymob's API by its signed id, and that copy is used,
 * if it matches the signed amount, currency and order.
 */
export function confirmTransaction(signed: Obj, fetched: Obj | null): Obj | null {
  if (!fetched || typeof fetched !== "object") return null;
  return SAME.every((f) => str(get(signed, f)) !== "" && str(get(signed, f)) === str(get(fetched, f))) ? fetched : null;
}

export type FetchTransaction = (id: string) => Promise<Obj | null>;

/**
 * Checks a Paymob callback and translates it. `hmac` is the query parameter Paymob sends with the POST. A transaction
 * is translated from Paymob's own copy (`fetchTx`), never from the unsigned fields of the callback.
 */
export async function verifyPaymob(body: string, hmac: string | null, secret: string, fetchTx?: FetchTransaction): Promise<Verified> {
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
  if (!fetchTx) return { ok: false, reason: "lookup" };
  let fetched: Obj | null;
  try { fetched = await fetchTx(str(obj.id)); } catch { return { ok: false, reason: "lookup" }; }
  const tx = confirmTransaction(obj, fetched);
  if (!tx) return fetched ? { ok: false, reason: "payload" } : { ok: false, reason: "lookup" };
  const ev = transactionEvent(tx);
  return { ok: true, events: [ev], eventType: "TRANSACTION", eventId: ev.eventId };
}
