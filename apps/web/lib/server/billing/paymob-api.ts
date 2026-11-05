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
  return {
    orderRef: r.intention_order_id ? String(r.intention_order_id) : r.id,
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
  const auth = await post<{ token: string }>(`${c.base}/api/auth/tokens`, { api_key: c.apiKey });
  const order = await post<{ id: number }>(`${c.base}/api/ecommerce/orders`, { auth_token: auth.token, delivery_needed: false, amount_cents: sub.renewAmountMinor, currency: "EGP", merchant_order_id: ref, items: [] });
  const key = await post<{ token: string }>(`${c.base}/api/acceptance/payment_keys`, {
    auth_token: auth.token, amount_cents: sub.renewAmountMinor, expiration: 3600, order_id: order.id, billing_data: billingData(billing), currency: "EGP", integration_id: c.motoIntegration,
  });
  const tx = await post<Record<string, unknown>>(`${c.base}/api/acceptance/payments/pay`, { source: { identifier: token, subtype: "TOKEN" }, payment_token: key.token });
  return transactionEvent({ ...tx, order: { ...(tx.order as object), id: order.id, merchant_order_id: ref } });
}
