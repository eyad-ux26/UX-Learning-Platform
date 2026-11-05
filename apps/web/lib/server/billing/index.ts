import "server-only";
import type { Engine, ProviderActions } from "@/lib/billing/engine";
import type { Transport } from "@/lib/billing/mailer";
import { makeMailer } from "@/lib/billing/mailer";
import { seal } from "@/lib/billing/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, tokenKey } from "./config";
import { SupabaseBillingStore } from "./store";
import { cancelSubscription, changeSubscriptionPeriod, resumeSubscription } from "./paddle-api";

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
  return { store, mail: makeMailer(store, resendTransport(), siteUrl()), seal: (t) => seal(tokenKey(), t) };
}

/** Tells Paddle about a learner's own change; Paymob and test-mode plans are ours alone. */
export const providerActions: ProviderActions = {
  cancel: async (sub) => { if (sub.providerSubId) await cancelSubscription(sub); },
  resume: async (sub) => { if (sub.providerSubId) await resumeSubscription(sub); },
  changePeriod: async (sub, period) => { if (sub.providerSubId) await changeSubscriptionPeriod(sub, period); },
};
