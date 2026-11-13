// Paddle's own payment links (card updates, invoices) go to the default payment link, our Check and pay page in English:
// /en/app/checkout?_ptxn=txn_…. These helpers keep that link working for Arabic learners and across sign-in.
// No imports beyond the locale list: the middleware uses them too.

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
const isLocale = (v: string | null | undefined): v is Locale => !!v && (LOCALES as readonly string[]).includes(v);

/**
 * A transaction id from Paddle's own payment links. Paddle sends them to the default payment link as ?_ptxn=txn_….
 * Anything that doesn't look like a Paddle transaction id is ignored.
 */
export function paddleLinkTxn(v: string | string[] | undefined | null): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^txn_[a-z0-9]{10,40}$/i.test(s) ? s : null;
}

/** The learner's own language for a Paddle link, when it differs from the one in the link: their profile, else their last choice. */
export function paddleLinkLocale(
  current: string,
  profileLocale: string | null | undefined,
  cookieLocale: string | null | undefined,
): Locale | null {
  const want = isLocale(profileLocale) ? profileLocale : isLocale(cookieLocale) ? cookieLocale : null;
  return want && want !== current ? want : null;
}

/** Holds a Paddle link's transaction while a signed-out learner signs in (30 minutes, this site only, never read by scripts). */
export const PTXN_COOKIE = "ug_ptxn";
export const PTXN_COOKIE_SECONDS = 30 * 60;

const CHECKOUT = /^\/(en|ar)\/app\/checkout\/?$/;
const APP_HOME = /^\/(en|ar)\/app\/?$/;

export type PaddleLinkStep =
  /** Signed out on a Paddle link: keep the transaction in the cookie and go to sign-in. */
  | { kind: "signin"; to: string; txn: string }
  /** Signed in and back in the app with a kept transaction: open the link again and forget the cookie. */
  | { kind: "resume"; to: string }
  /** Signed in on the link itself: the cookie is no longer needed. */
  | { kind: "clear" };

/**
 * What the middleware does about a Paddle link on this request. Every way of signing in (password, email link, Google,
 * a new account) ends on the app home, so that is where a kept link is picked up again.
 */
export function paddleLinkStep(
  pathname: string,
  search: URLSearchParams,
  signedIn: boolean,
  kept: string | null | undefined,
): PaddleLinkStep | null {
  const onCheckout = pathname.match(CHECKOUT);
  if (onCheckout) {
    const txn = paddleLinkTxn(search.get("_ptxn"));
    if (!txn) return null;
    if (!signedIn) return { kind: "signin", to: `/${onCheckout[1]}/signin`, txn };
    return kept ? { kind: "clear" } : null;
  }
  const home = pathname.match(APP_HOME);
  const txn = paddleLinkTxn(kept);
  if (home && signedIn && txn)
    return { kind: "resume", to: `/${home[1]}/app/checkout?_ptxn=${encodeURIComponent(txn)}` };
  return null;
}

/**
 * A Paddle link opens only the learner's own transaction: one our checkout made for them (custom_data.user_id), one for
 * their Paddle customer, or one of their Paddle subscription (card update, overdue charge). Anything else, such as a
 * crafted link to someone else's renewal, is refused, so nobody can be led to pay for another account's plan.
 */
export function paddleTxnOwned(
  txn: { userId: string | null; customerId: string | null; subscriptionId: string | null },
  me: { userId: string; customerIds: string[]; subscriptionIds: string[] },
): boolean {
  if (txn.userId) return txn.userId === me.userId; // ours, made for one learner: only that learner
  if (txn.customerId && me.customerIds.includes(txn.customerId)) return true;
  return !!txn.subscriptionId && me.subscriptionIds.includes(txn.subscriptionId);
}
