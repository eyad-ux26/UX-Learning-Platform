import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  discountUntil,
  providerFor,
  quote,
  regionFor,
  UNKNOWN_COUNTRY,
  type Eligibility,
  type Period,
  type Quote,
} from "@/lib/billing/pricing";
import { welcomeBackEligible } from "@/lib/billing/subscription";
import { entitlementFromRow, subFromRow } from "./store";
import { mockAllowed, paddleConfig, providerMode } from "./config";
import { createIntention } from "./paymob-api";
import { createTransaction, updatePaymentTransaction } from "./paddle-api";

// Starts a checkout: the server prices it (the browser only says monthly or annual, and a code), stores the
// session, and hands the learner to the provider's secure page. Card numbers never reach UXGate.

export type CodeCheck =
  | { ok: true; code: NonNullable<Eligibility["code"]> }
  | { ok: false; error: "invalid" | "expired" | "region" | "used" };

export async function checkCode(
  admin: SupabaseClient,
  userId: string,
  raw: string,
  region: ReturnType<typeof regionFor>,
  now = new Date(),
): Promise<CodeCheck> {
  const code = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) return { ok: false, error: "invalid" };
  const { data } = await admin.from("discount_codes").select("*").eq("code", code).maybeSingle();
  if (!data || !data.active) return { ok: false, error: "invalid" };
  if ((data.starts_at && new Date(data.starts_at) > now) || (data.ends_at && new Date(data.ends_at) <= now))
    return { ok: false, error: "expired" };
  if (data.region && data.region !== region) return { ok: false, error: "region" };
  // A code with a cap (set in the admin panel) ends when that many checkouts have paid with it.
  if (data.max_uses) {
    const { count: uses } = await admin
      .from("checkout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("code", code)
      .eq("status", "paid");
    if ((uses ?? 0) >= data.max_uses) return { ok: false, error: "expired" };
  }
  // One discount per account: a founding code works once.
  const { count } = await admin
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("discount", data.kind);
  if ((count ?? 0) > 0) return { ok: false, error: "used" };
  return { ok: true, code: { code, kind: data.kind, percent: data.percent, period: data.period ?? null } };
}

export async function studentStatus(admin: SupabaseClient, userId: string, now = new Date()) {
  const { data } = await admin
    .from("student_checks")
    .select("email, verified_at, valid_until, sent_at")
    .eq("user_id", userId)
    .retry(false)
    .maybeSingle();
  const verified = !!data?.verified_at && !!data.valid_until && new Date(data.valid_until) > now;
  return {
    verified,
    validUntil: verified ? (data!.valid_until as string) : null,
    email: (data?.email as string) ?? null,
    sentAt: (data?.sent_at as string) ?? null,
  };
}

/** Paddle's checkout gets the country only when Cloudflare told us one. */
const knownCountry = (c: string) => (c === UNKNOWN_COUNTRY ? null : c);

/**
 * Paddle's checkout asks for an email only when the transaction has no customer yet; the learner's own email fills it.
 * A transaction of an existing subscription (card update, overdue charge) or one made for a known customer has one.
 */
export const paddleEmail = (t: { customerId: string | null; ownCustomer: boolean }, email: string): string | null =>
  t.ownCustomer || t.customerId || !email ? null : email;

/** Prices a checkout for this learner. */
export async function priceFor(
  admin: SupabaseClient,
  userId: string,
  country: string,
  period: Period,
  code: string | null,
) {
  const region = regionFor(country);
  const [ent, student] = await Promise.all([
    admin.from("entitlements").select("*").eq("user_id", userId).maybeSingle(),
    studentStatus(admin, userId),
  ]);
  let codeCheck: CodeCheck | null = null;
  if (code) codeCheck = await checkCode(admin, userId, code, region);
  const e: Eligibility = {
    student: student.verified,
    welcomeBack: welcomeBackEligible(entitlementFromRow(ent.data)),
    code: codeCheck?.ok ? codeCheck.code : null,
  };
  return { q: quote(region, period, e), codeCheck, student };
}

export type CheckoutResult =
  | { ok: true; url: string }
  | {
      ok: true;
      paddle: {
        transactionId: string;
        clientToken: string;
        env: "sandbox" | "production";
        sessionId: string;
        successUrl: string;
        country: string | null;
        email: string | null;
      };
    }
  | { ok: false; error: "payments_closed" | "already_pro" | "no_plan" | "code" | "provider"; detail?: string };

/** An unpaid Paddle checkout this recent is opened again instead of a second one (two tabs must not mean two plans). */
export const REUSE_MINUTES = 30;

export async function startCheckout(
  admin: SupabaseClient,
  input: {
    userId: string;
    email: string;
    name: string | null;
    locale: "en" | "ar";
    period: Period;
    code: string | null;
    kind: "new" | "renewal" | "card";
    host: string | null;
    origin: string;
    country: string;
  },
): Promise<CheckoutResult> {
  const live = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", input.userId)
    .in("status", ["active", "grace", "cancelled"])
    .maybeSingle();
  let sub = live.data ? subFromRow(live.data) : null;
  // A test-mode plan does not count on the live site: a real purchase replaces it (the engine ends it when paid).
  if (sub?.provider === "mock" && !mockAllowed(input.host)) sub = null;

  let q: Quote,
    discountEnd: Date | null,
    sessionKind: "new" | "renewal" = "new";
  // A new plan is priced for the country the request comes from; paying again in the grace period renews the plan's own price.
  let country = sub?.status === "grace" ? sub.country : input.country;
  if (input.kind === "new") {
    if (sub && sub.status !== "grace") return { ok: false, error: "already_pro" };
    const priced = await priceFor(admin, input.userId, country, input.period, input.code);
    if (input.code && priced.codeCheck && !priced.codeCheck.ok)
      return { ok: false, error: "code", detail: priced.codeCheck.error };
    q = priced.q;
    discountEnd =
      q.discount === "student"
        ? priced.student.validUntil
          ? new Date(priced.student.validUntil)
          : null
        : discountUntil(q, new Date());
    if (sub?.status === "grace") sessionKind = "renewal"; // paying again during the grace period renews the plan
  } else {
    // Pay the next period now (wallet payers, or "Try now" with another card in the grace period), or change the card.
    if (!sub) return { ok: false, error: "no_plan" };
    // Paymob cards change at the next payment: there is nothing to pay while the plan is paid up.
    if (input.kind === "card" && sub.provider !== "paddle" && sub.status !== "grace")
      return { ok: false, error: "no_plan" };
    country = sub.country;
    const region = sub.region;
    const period = sub.pendingPeriod ?? sub.period;
    q = {
      region,
      provider: providerFor(region),
      period,
      currency: sub.currency as Quote["currency"],
      base: sub.renewAmountMinor,
      amount: sub.renewAmountMinor,
      renewAmount: sub.renewAmountMinor,
      discount: sub.discount,
      percent: 0,
      code: null,
      discountYears: null,
    };
    discountEnd = sub.discountUntil ? new Date(sub.discountUntil) : null;
    sessionKind = "renewal";
  }

  const mode = providerMode(q.provider, input.host);
  if (mode === "off") return { ok: false, error: "payments_closed" };
  const provider = mode === "mock" ? "mock" : q.provider;
  // Paddle runs its own renewals: paying again in the grace period pays the plan's overdue charge in Paddle,
  // never a new Paddle subscription. "Pay the next period now" is for Paymob wallets only.
  if (
    provider === "paddle" &&
    sessionKind === "renewal" &&
    input.kind !== "card" &&
    !(sub?.status === "grace" && sub.providerSubId)
  )
    return { ok: false, error: "no_plan" };
  const c = paddleConfig();
  const successUrl = (id: string) => `${input.origin}/${input.locale}/app/checkout/return?session=${id}`;

  // The same unpaid Paddle checkout from a few minutes ago (another tab, a second click) opens again.
  if (provider === "paddle" && input.kind === "new") {
    const since = new Date(Date.now() - REUSE_MINUTES * 60_000).toISOString();
    const { data: open } = await admin
      .from("checkout_sessions")
      .select("id, provider_ref")
      .eq("user_id", input.userId)
      .eq("provider", "paddle")
      .eq("kind", sessionKind)
      .eq("period", q.period)
      .eq("amount_minor", q.amount)
      .eq("status", "open")
      .not("provider_ref", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open?.provider_ref) {
      // That checkout was made with the learner's Paddle customer when one was known (and its id was kept then).
      const { data: acct } = await admin
        .from("billing_accounts")
        .select("paddle_customer_id")
        .eq("user_id", input.userId)
        .maybeSingle();
      return {
        ok: true,
        paddle: {
          transactionId: open.provider_ref as string,
          clientToken: c.clientToken,
          env: c.env,
          sessionId: open.id as string,
          successUrl: successUrl(open.id as string),
          country: knownCountry(country),
          email: acct?.paddle_customer_id ? null : input.email,
        },
      };
    }
  }

  const { data: session, error } = await admin
    .from("checkout_sessions")
    .insert({
      user_id: input.userId,
      kind: sessionKind,
      subscription_id: sessionKind === "renewal" ? (sub?.id ?? null) : null,
      provider,
      region: q.region,
      country,
      period: q.period,
      discount: q.discount,
      discount_until: discountEnd?.toISOString() ?? null,
      code: q.code,
      amount_minor: q.amount,
      renew_amount_minor: q.renewAmount,
      currency: q.currency,
      locale: input.locale,
    })
    .select("id")
    .single();
  if (error || !session) {
    console.error("checkout session insert", error?.message);
    return { ok: false, error: "provider" };
  }
  const returnUrl = successUrl(session.id);
  // Kept for the record (and the admin panel): the country this checkout was priced for.
  if (sessionKind === "new")
    await admin
      .from("billing_accounts")
      .upsert({ user_id: input.userId, country, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (provider === "mock") return { ok: true, url: `/${input.locale}/app/checkout/mock?session=${session.id}` };

  try {
    if (provider === "paymob") {
      const label = `UXGate Pro ${q.period === "year" ? "annual" : "monthly"}`;
      const r = await createIntention({
        ref: `s_${session.id}`,
        amountMinor: q.amount,
        label,
        billing: { email: input.email, name: input.name, country },
        notifyUrl: `${input.origin}/api/webhooks/paymob`,
        returnUrl,
        wallet: true,
      });
      await admin.from("checkout_sessions").update({ provider_ref: r.orderRef }).eq("id", session.id);
      return { ok: true, url: r.url };
    }
    const { data: acct } = await admin
      .from("billing_accounts")
      .select("paddle_customer_id")
      .eq("user_id", input.userId)
      .maybeSingle();
    // A new card, or the overdue charge in the grace period: Paddle's own transaction for the existing subscription.
    const t =
      (input.kind === "card" || sessionKind === "renewal") && sub?.providerSubId
        ? { transactionId: await updatePaymentTransaction(sub), customerId: null, ownCustomer: true }
        : {
            ...(await createTransaction({
              region: q.region,
              period: q.period,
              discount: q.discount,
              sessionId: session.id,
              userId: input.userId,
              email: input.email,
              customerId: acct?.paddle_customer_id ?? null,
              country,
            })),
            ownCustomer: false,
          };
    await admin.from("checkout_sessions").update({ provider_ref: t.transactionId }).eq("id", session.id);
    if (t.customerId)
      await admin
        .from("billing_accounts")
        .upsert(
          { user_id: input.userId, country, paddle_customer_id: t.customerId, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    return {
      ok: true,
      paddle: {
        transactionId: t.transactionId,
        clientToken: c.clientToken,
        env: c.env,
        sessionId: session.id,
        successUrl: returnUrl,
        country: knownCountry(country),
        email: paddleEmail(t, input.email),
      },
    };
  } catch (err) {
    console.error("checkout provider error", err);
    await admin.from("checkout_sessions").update({ status: "failed" }).eq("id", session.id);
    return { ok: false, error: "provider" };
  }
}
