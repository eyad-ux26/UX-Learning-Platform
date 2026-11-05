import "server-only";
import type { Period, Region } from "@/lib/billing/pricing";
import { mockAllowed } from "@/lib/billing/hosts";

export { mockAllowed, PRODUCTION_HOSTS } from "@/lib/billing/hosts";

// Billing settings come from Cloudflare secrets and vars only; nothing secret is ever committed.
// Until the Paymob and Paddle test keys exist, the test-mode provider ("mock") stands in for both, on test hosts only.

const env = (k: string) => process.env[k] ?? "";

export function paymobConfig() {
  const c = {
    secretKey: env("PAYMOB_SECRET_KEY"), publicKey: env("PAYMOB_PUBLIC_KEY"), apiKey: env("PAYMOB_API_KEY"), hmac: env("PAYMOB_HMAC_SECRET"),
    cardIntegration: Number(env("PAYMOB_CARD_INTEGRATION_ID")) || 0, walletIntegration: Number(env("PAYMOB_WALLET_INTEGRATION_ID")) || 0,
    motoIntegration: Number(env("PAYMOB_MOTO_INTEGRATION_ID")) || 0,
    base: env("PAYMOB_BASE_URL") || "https://accept.paymob.com",
  };
  return { ...c, ready: !!(c.secretKey && c.publicKey && c.hmac && c.apiKey && c.cardIntegration) };
}

const PADDLE_REGIONS: Exclude<Region, "eg">[] = ["gulf", "arab", "world"];

export function paddleConfig() {
  const prices = {} as Record<`${Exclude<Region, "eg">}_${Period}`, string>;
  for (const r of PADDLE_REGIONS) for (const p of ["month", "year"] as const) prices[`${r}_${p}`] = env(`PADDLE_PRICE_${r.toUpperCase()}_${p === "month" ? "MONTH" : "YEAR"}`);
  const c = {
    apiKey: env("PADDLE_API_KEY"), webhookSecret: env("PADDLE_WEBHOOK_SECRET"), clientToken: env("PADDLE_CLIENT_TOKEN"),
    env: env("PADDLE_ENV") === "production" ? ("production" as const) : ("sandbox" as const), prices,
    discounts: { student: env("PADDLE_DISCOUNT_STUDENT"), welcome_back: env("PADDLE_DISCOUNT_WELCOME_BACK"), founding: env("PADDLE_DISCOUNT_FOUNDING") },
  };
  const base = c.env === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  return { ...c, base, ready: !!(c.apiKey && c.webhookSecret && c.clientToken && PADDLE_REGIONS.every((r) => prices[`${r}_month`] && prices[`${r}_year`])) };
}

/**
 * The host a route request came to. Only the URL (the Host the request was routed by) counts: x-forwarded-host is
 * set by whoever sends the request, so it can never turn test payments on.
 */
export const hostOf = (req: Request) => new URL(req.url).host;

/**
 * The country a request comes from, by Cloudflare's CF-IPCountry header (set at Cloudflare's edge, not by the
 * browser). The price region follows it: a learner cannot pick a cheaper country. Null when Cloudflare does not know.
 */
export function ipCountry(h: Pick<Headers, "get">): string | null {
  const c = h.get("cf-ipcountry")?.toUpperCase() ?? null;
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null;
}

export type Mode = "live" | "mock" | "off";

/** How a provider's checkout runs on this host: with its keys (Paymob test mode, Paddle sandbox), with the test-mode provider, or not at all yet. */
export function providerMode(provider: "paymob" | "paddle", host: string | null | undefined): Mode {
  if ((provider === "paymob" ? paymobConfig() : paddleConfig()).ready) return "live";
  return mockAllowed(host) ? "mock" : "off";
}

/** Key for the saved-card token encryption. A missing key in production refuses to store tokens. */
export function tokenKey(): string {
  const k = env("BILLING_TOKEN_KEY");
  if (k) return k;
  // Real Paymob card tokens are never stored under the development key.
  if (paymobConfig().ready) throw new Error("BILLING_TOKEN_KEY is not set");
  return "dev-only-billing-token-key";
}

/** Address used in email links (the cron job has no request to read it from). */
export const siteUrl = () => (env("SITE_URL") || "https://uxgate-web.uxgate-web.workers.dev").replace(/\/$/, "");

export const SUPPORT_EMAIL = "support@uxgate.org";
