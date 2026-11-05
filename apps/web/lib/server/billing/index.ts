import "server-only";
import type { Engine, ProviderActions, WebhookActions } from "@/lib/billing/engine";
import type { Transport } from "@/lib/billing/mailer";
import { makeMailer } from "@/lib/billing/mailer";
import { seal } from "@/lib/billing/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, tokenKey } from "./config";
import { SupabaseBillingStore } from "./store";
import { cancelSubscription, cancelSubscriptionNow, changeSubscriptionPeriod, changeSubscriptionRegion, customerCountry, refundTransaction, resumeSubscription } from "./paddle-api";
import { refundTransaction as refundPaymob } from "./paymob-api";

/** Sends through Resend's HTTP API. Without RESEND_API_KEY emails are logged as skipped (staging before Resend is set up). */
export function resendTransport(): Transport | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return async (m) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: "UXGate <hello@uxgate.org>", reply_to: "support@uxgate.org", to: [m.to], subject: m.subject, html: m.html, text: m.text }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { id: ((await res.json()) as { id?: string }).id ?? null };
  };
}

/** The billing engine on the service-role client. Call only from webhooks, the daily job, or after checking the learner. */
export function billingEngine(): Engine {
  const store = new SupabaseBillingStore(createAdminClient());
  return { store, mail: makeMailer(store, resendTransport(), siteUrl()), seal: (t) => seal(tokenKey(), t), actions: webhookActions };
}

/** What the engine may ask a provider from a webhook: give refused money back, end a duplicate subscription, read Paddle's billing country. */
export const webhookActions: WebhookActions = {
  refund: async (provider, paymentId, amountMinor) => {
    if (provider === "paddle") await refundTransaction(paymentId, "Duplicate or late charge refused by UXGate");
    else if (provider === "paymob") await refundPaymob(paymentId, amountMinor);
  },
  cancelNow: async (provider, providerSubId) => { if (provider === "paddle") await cancelSubscriptionNow(providerSubId); },
  payerCountry: async (ev) => (ev.provider === "paddle" && ev.customerId && ev.addressId ? customerCountry(ev.customerId, ev.addressId) : null),
  reprice: async (sub, region) => { if (sub.provider === "paddle" && sub.providerSubId) await changeSubscriptionRegion(sub, region); },
};

/** Tells Paddle about a learner's own change; Paymob and test-mode plans are ours alone. */
export const providerActions: ProviderActions = {
  cancel: async (sub) => { if (sub.providerSubId) await cancelSubscription(sub); },
  resume: async (sub) => { if (sub.providerSubId) await resumeSubscription(sub); },
  changePeriod: async (sub, period) => { if (sub.providerSubId) await changeSubscriptionPeriod(sub, period); },
};
