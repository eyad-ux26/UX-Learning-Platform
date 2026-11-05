import "server-only";
import { transactionEvent } from "@/lib/billing/paymob";
import type { BillingEvent } from "@/lib/billing/events";
import type { Sub } from "@/lib/billing/subscription";
import { paymobConfig } from "./config";

// Paymob's HTTP API (test mode until live keys are set). Cards and wallets go through Paymob's hosted Unified Checkout,
// so card numbers never reach UXGate. Renewals charge the saved card token through the MOTO integration.

type Billing = { email: string; name: string | null; country: string };

const billingData = (b: Billing) => {
  const [first, ...rest] = (b.name?.trim() || "UXGate learner").split(/\s+/);
  return {
    first_name: first || "UXGate", last_name: rest.join(" ") || "Learner", email: b.email, phone_number: "NA",
    apartment: "NA", floor: "NA", street: "NA", building: "NA", shipping_method: "NA", postal_code: "NA", city: "NA", country: b.country || "EG", state: "NA",
  };
};

async function post<T>(url: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`paymob ${new URL(url).pathname} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

async function authToken(): Promise<string> {
  const c = paymobConfig();
  return (await post<{ token: string }>(`${c.base}/api/auth/tokens`, { api_key: c.apiKey })).token;
}

/** Paymob's own copy of a transaction, read by id (the webhook acts on this, not on the callback's unsigned fields). Null when it does not exist. */
export async function fetchTransaction(id: string): Promise<Record<string, unknown> | null> {
  if (!/^\d{1,20}$/.test(id)) return null;
  const c = paymobConfig();
  const res = await fetch(`${c.base}/api/acceptance/transactions/${id}`, { headers: { authorization: `Bearer ${await authToken()}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`paymob transaction ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/** Gives a payment back in full (a duplicate or late charge the engine refused). */
export async function refundTransaction(id: string, amountMinor: number): Promise<void> {
  const c = paymobConfig();
  await post(`${c.base}/api/acceptance/void_refund/refund`, { auth_token: await authToken(), transaction_id: id, amount_cents: amountMinor });
}

/** Creates a payment intention and returns the hosted checkout address. `ref` is `s_<checkout session id>`. */
export async function createIntention(input: { ref: string; amountMinor: number; label: string; billing: Billing; notifyUrl: string; returnUrl: string; wallet: boolean }) {
  const c = paymobConfig();
  const methods = [c.cardIntegration, ...(input.wallet && c.walletIntegration ? [c.walletIntegration] : [])];
  const r = await post<{ id: string; client_secret: string; intention_order_id?: number }>(`${c.base}/v1/intention/`, {
    amount: input.amountMinor, currency: "EGP", payment_methods: methods,
    items: [{ name: input.label, amount: input.amountMinor, description: input.label, quantity: 1 }],
    billing_data: billingData(input.billing), special_reference: input.ref, merchant_order_id: input.ref,
    notification_url: input.notifyUrl, redirection_url: input.returnUrl, extras: { ref: input.ref },
  }, { authorization: `Token ${c.secretKey}` });
  // The webhook checks that a payment is for this order, so a checkout without one cannot be paid.
  if (!r.intention_order_id) throw new Error("paymob intention without an order id");
  return {
    orderRef: String(r.intention_order_id),
    url: `${c.base}/unifiedcheckout/?publicKey=${encodeURIComponent(c.publicKey)}&clientSecret=${encodeURIComponent(r.client_secret)}`,
  };
}

/**
 * Charges a saved card for a renewal and returns Paymob's answer as an event (the same event the webhook will
 * repeat, so it is applied once). The order reference names the plan, the period and the try, so a repeated run
 * cannot create a second order for the same try.
 */
export async function chargeToken(sub: Sub, token: string, billing: Billing, attempt: number): Promise<BillingEvent | null> {
  const c = paymobConfig();
  if (!c.apiKey || !c.motoIntegration) return null;
  const ref = `r_${sub.id}_${sub.currentPeriodEnd.slice(0, 10)}_${attempt}`;
  const auth = { token: await authToken() };
  const order = await post<{ id: number }>(`${c.base}/api/ecommerce/orders`, { auth_token: auth.token, delivery_needed: false, amount_cents: sub.renewAmountMinor, currency: "EGP", merchant_order_id: ref, items: [] });
  const key = await post<{ token: string }>(`${c.base}/api/acceptance/payment_keys`, {
    auth_token: auth.token, amount_cents: sub.renewAmountMinor, expiration: 3600, order_id: order.id, billing_data: billingData(billing), currency: "EGP", integration_id: c.motoIntegration,
  });
  const tx = await post<Record<string, unknown>>(`${c.base}/api/acceptance/payments/pay`, { source: { identifier: token, subtype: "TOKEN" }, payment_token: key.token });
  return transactionEvent({ ...tx, order: { ...(tx.order as object), id: order.id, merchant_order_id: ref } });
}
