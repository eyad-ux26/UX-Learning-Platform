import "server-only";
import {
  priceCountry,
  providerFor,
  quote,
  regionFor,
  UNKNOWN_COUNTRY,
  type Period,
  type Provider,
  type Quote,
  type Region,
} from "@/lib/billing/pricing";
import { welcomeBackEligible } from "@/lib/billing/subscription";
import type { Learner } from "@/lib/server/learner";
import { createAdminClient } from "@/lib/supabase/admin";
import { subFromRow } from "./store";
import { billingTablesMissing, noteBillingError } from "./tables";
import { checkCode, studentStatus } from "./checkout";
import { mockAllowed, providerMode, type Mode } from "./config";
import { requestCountry, requestHost } from "./account";

/** Everything the plans page, the paywall and the check-and-pay page show: both prices for this learner, priced on the server. */
export type Offer = {
  country: string;
  region: Region;
  provider: Provider;
  mode: Mode;
  pro: boolean;
  /** A live plan in its grace period can be paid again from the plans page. */
  grace: boolean;
  month: Quote;
  year: Quote;
  student: { verified: boolean; validUntil: string | null; email: string | null };
  welcomeBack: boolean;
  /** The code the learner entered, when it is valid for them. */
  code: string | null;
  codeError: "invalid" | "expired" | "region" | "used" | null;
};

const noDiscount = { student: false, welcomeBack: false, code: null };

/** Made-up offers for screens without a database: ?country=SA, ?offer=student|welcome|founding. */
function fixtureOffer(country: string, offer: string | undefined, code: string | null, host: string | null): Offer {
  const region = regionFor(country);
  const e = {
    student: offer === "student",
    welcomeBack: offer === "welcome",
    code:
      offer === "founding" || code?.toUpperCase() === "FOUNDING"
        ? { code: "FOUNDING", kind: "founding" as const, percent: 30, period: "year" as Period }
        : null,
  };
  const bad = code && code.toUpperCase() !== "FOUNDING" ? "invalid" : null;
  return {
    country,
    region,
    provider: providerFor(region),
    mode: providerMode(providerFor(region), host) === "live" ? "live" : "mock",
    pro: process.env.UG_DEV_PRO === "1",
    grace: false,
    month: quote(region, "month", bad ? noDiscount : e),
    year: quote(region, "year", bad ? noDiscount : e),
    student: {
      verified: offer === "student",
      validUntil: offer === "student" ? new Date(Date.now() + 300 * 86_400_000).toISOString() : null,
      email: null,
    },
    welcomeBack: offer === "welcome",
    code: e.code && !bad ? "FOUNDING" : null,
    codeError: bad,
  };
}

export async function loadOffer(
  me: Learner,
  opts: { code?: string | null; fixtureOffer?: string; fixtureCountry?: string; intl?: boolean } = {},
): Promise<Offer> {
  const host = await requestHost();
  const code = opts.code?.trim() || null;
  if (!me.db)
    return fixtureOffer(
      opts.intl ? UNKNOWN_COUNTRY : /^[A-Z]{2}$/.test(opts.fixtureCountry ?? "") ? opts.fixtureCountry! : "EG",
      opts.fixtureOffer,
      code,
      host,
    );

  // The price region follows the country the request comes from (Cloudflare), so every read can start at once.
  const ip = priceCountry(await requestCountry(), opts.intl);
  const admin = createAdminClient();
  let liveQ = me.db
    .from("subscriptions")
    .select("*")
    .eq("user_id", me.userId)
    .in("status", ["active", "grace", "cancelled"]);
  if (!mockAllowed(host)) liveQ = liveQ.neq("provider", "mock"); // test-mode plans do not exist on the live site
  // The entitlement was read once for this request by getLearner. Before 0036 exists nothing else is asked for.
  const skip = billingTablesMissing();
  const [live, student, check] = await Promise.all([
    skip ? { data: null, error: null } : liveQ.retry(false).maybeSingle(),
    skip ? { verified: false, validUntil: null, email: null, sentAt: null } : studentStatus(admin, me.userId),
    code && !skip ? checkCode(admin, me.userId, code, regionFor(ip)) : Promise.resolve(null),
  ]);
  noteBillingError(live.error);
  const sub = live.data ? subFromRow(live.data) : null;
  // A live plan keeps the country it was bought in (paying again in the grace period renews that plan).
  const country = sub?.country ?? ip;
  const region = regionFor(country);
  const provider = providerFor(region);
  const valid = check?.ok && regionFor(ip) === region ? check : null;
  const welcomeBack = welcomeBackEligible(me.entitlement);
  const e = { student: student.verified, welcomeBack, code: valid ? valid.code : null };
  return {
    country,
    region,
    provider,
    mode: providerMode(provider, host),
    pro: me.pro,
    grace: sub?.status === "grace",
    month: quote(region, "month", e),
    year: quote(region, "year", e),
    student,
    welcomeBack,
    code: valid ? valid.code.code : null,
    codeError: check && !check.ok ? check.error : null,
  };
}
