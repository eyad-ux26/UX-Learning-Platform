import "server-only";
import type { Engine, ProviderActions, WebhookActions } from "@/lib/billing/engine";
import type { Transport } from "@/lib/billing/mailer";
import { makeMailer } from "@/lib/billing/mailer";
import { sendEmail } from "@/lib/server/email/send";
import { seal } from "@/lib/billing/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, tokenKey } from "./config";
import { SupabaseBillingStore } from "./store";
import { cancelSubscription, cancelSubscriptionNow, changeSubscriptionPeriod, changeSubscriptionRegion, customerCountry, refundTransaction, resumeSubscription } from "./paddle-api";
import { refundTransaction as refundPaymob } from "./paymob-api";

/** Sends through the app's one email sender (slice 4). Without RESEND_API_KEY emails are logged as skipped (staging before Resend is set up). */
export function resendTransport(): Transport | null {
  if (!process.env.RESEND_API_KEY) return null;
  return async (m) => {
    const r = await sendEmail({ ...m, kind: "billing" });
    if (!r.ok) throw new Error(`email not sent: ${r.error ?? "unknown"}`);
    return { id: r.id ?? null };
  };
}

/** The billing engine on the service-role client. Call only from webhooks, the daily job, or after checking the learner. */
export function billingEngine(): Engine {
  const store = new SupabaseBillingStore(createAdminClient());
  return { store, mail: makeMailer(store, resendTransport(), siteUrl()), seal: (t) => seal(tokenKey(), t), actions: webhookActions, egCardsOnly: process.env.PAYMOB_EG_CARDS_ONLY === "1" };
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
