import "server-only";
import type { DiscountKind, Period, Region } from "@/lib/billing/pricing";
import type { Sub } from "@/lib/billing/subscription";
import { paddleConfig } from "./config";

// Paddle Billing's HTTP API (sandbox until live keys are set). Paddle is the merchant of record: it shows the local
// currency and tax, takes the card, and renews by itself. We create the transaction on the server, so the price,
// discount and our ids cannot be changed in the browser; Paddle.js only opens it.

async function call<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): Promise<T> {
  const c = paddleConfig();
  const res = await fetch(`${c.base}${path}`, { method, headers: { authorization: `Bearer ${c.apiKey}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`paddle ${method} ${path} ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export function priceId(region: Region, period: Period): string {
  if (region === "eg") throw new Error("Egypt pays through Paymob");
  return paddleConfig().prices[`${region}_${period}`];
}

/** Creates the checkout transaction Paddle.js opens. Returns its id. */
export async function createTransaction(input: { region: Region; period: Period; discount: DiscountKind | null; sessionId: string; userId: string; email: string; customerId: string | null; country: string }) {
  const c = paddleConfig();
  const discountId = input.discount ? c.discounts[input.discount] : "";
  if (input.discount && !discountId) throw new Error(`Paddle discount for ${input.discount} is not set`);
  const r = await call<{ data: { id: string; customer_id: string | null } }>("POST", "/transactions", {
    items: [{ price_id: priceId(input.region, input.period), quantity: 1 }],
    custom_data: { session_id: input.sessionId, user_id: input.userId },
    ...(discountId ? { discount_id: discountId } : {}),
    ...(input.customerId ? { customer_id: input.customerId } : {}),
    collection_mode: "automatic",
  });
  return { transactionId: r.data.id, customerId: r.data.customer_id };
}

/**
 * Cancel at the end of the paid period. In the grace period nothing is paid up, so Paddle cancels at once and its
 * dunning stops: no later retry can charge a plan the learner cancelled.
 */
export const cancelSubscription = (sub: Sub) =>
  call("POST", `/subscriptions/${sub.providerSubId}/cancel`, { effective_from: sub.status === "grace" ? "immediately" : "next_billing_period" });

/** Ends a Paddle subscription now (a duplicate one the engine refused). */
export const cancelSubscriptionNow = (providerSubId: string) => call("POST", `/subscriptions/${encodeURIComponent(providerSubId)}/cancel`, { effective_from: "immediately" });

/** Gives a whole transaction back (a duplicate or late charge the engine refused). */
export const refundTransaction = (transactionId: string, reason: string) =>
  call("POST", "/adjustments", { action: "refund", type: "full", transaction_id: transactionId, reason });

/** The billing country the payer entered in Paddle's checkout. */
export async function customerCountry(customerId: string, addressId: string): Promise<string | null> {
  const r = await call<{ data: { country_code?: string } }>("GET", `/customers/${encodeURIComponent(customerId)}/addresses/${encodeURIComponent(addressId)}`);
  return r.data.country_code ?? null;
}

/** Remove a scheduled cancel. */
export const resumeSubscription = (sub: Sub) => call("PATCH", `/subscriptions/${sub.providerSubId}`, { scheduled_change: null });

/** Switch monthly and annual: nothing is charged today; the new price is charged in full on the next billing date. */
export const changeSubscriptionPeriod = (sub: Sub, period: Period) =>
  call("PATCH", `/subscriptions/${sub.providerSubId}`, { items: [{ price_id: priceId(sub.region, period), quantity: 1 }], proration_billing_mode: "full_next_billing_period" });

/** Renewals at another region's price from the next billing date (nothing is charged today). */
export const changeSubscriptionRegion = (sub: Sub, region: Region) =>
  call("PATCH", `/subscriptions/${sub.providerSubId}`, { items: [{ price_id: priceId(region, sub.pendingPeriod ?? sub.period), quantity: 1 }], proration_billing_mode: "do_not_bill" });

/** A transaction that lets the learner change the card Paddle charges (opened with Paddle.js). */
export async function updatePaymentTransaction(sub: Sub): Promise<string> {
  const r = await call<{ data: { id: string } }>("GET", `/subscriptions/${sub.providerSubId}/update-payment-method-transaction`);
  return r.data.id;
}
