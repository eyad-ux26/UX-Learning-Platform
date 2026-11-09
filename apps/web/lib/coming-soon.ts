// Coming Soon gate. With UG_COMING_SOON=1 (wrangler.jsonc vars) the public sees only the Coming Soon page with the launch
// list and the legal pages. The sign-in pages open only after the team password (lib/team-access.ts); admins sign in and
// use the whole tool to test updates. Edge-safe and pure,
// so middleware.ts, the auth callback, the sign-in action and the billing API all decide the same way.
//
// An admin is an account whose app_metadata.role is "admin". Only the service role can write app_metadata, and Supabase
// copies it into the session token, so the middleware reads it from the claims without a database call.
// docs/coming-soon.md has the SQL that makes an account an admin.

export const comingSoonOn = (): boolean => process.env.UG_COMING_SOON === "1";

type WithAppMeta = { app_metadata?: Record<string, unknown> | null } | null | undefined;

/** True for a user or token claims whose app_metadata.role is "admin". */
export const isAdmin = (u: WithAppMeta): boolean => u?.app_metadata?.role === "admin";

/** True when the gate is on and this user (or nobody) is not an admin. */
export const gatedOut = (u: WithAppMeta): boolean => comingSoonOn() && !isAdmin(u);

export const COMING_SOON_PATH = "/coming-soon";

// Open to everyone while the gate is on: the page and its email confirmation link, the team password page
// (lib/team-access.ts), the public pricing page and the legal pages, which Paddle's website review and Google's brand verification read,
// and the support rating page that the ticket survey email links to (a learner may not be signed in).
const OPEN = /^\/(en|ar)\/(coming-soon(\/confirm)?|team|pricing|terms|privacy|refund|maintenance|offline|c\/[a-z0-9]{8,32}|rate\/[A-Za-z0-9_-]{32,64})\/?$/;
// Sign-in, "forgot password" and reset: only with a team pass (the right team password) or an admin session.
const TEAM = /^\/(en|ar)\/(signin|forgot|reset)\/?$/;
// Pages search engines may index while the gate is on: the home address (it shows Coming Soon), the pricing page and the legal pages.
const INDEXABLE = /^\/(en|ar)(\/(pricing|terms|privacy|refund))?\/?$/;
const LOCALE = /^\/(en|ar)(\/|$)/;

export type GateStep =
  /** No locale in the address: next-intl redirects it to one first, and that request is checked. */
  | { kind: "pass" }
  /** Open to everyone. */
  | { kind: "open"; index: boolean }
  /** The sign-in pages: with a team pass or an admin session; anyone else gets the Coming Soon page. */
  | { kind: "team"; locale: "en" | "ar"; to: string; index: false }
  /** Admins only: anyone else gets the Coming Soon page at the same address. */
  | { kind: "admin"; locale: "en" | "ar"; to: string; index: boolean };

/** What the gate does with a page address (the gate is on). */
export function gateStep(pathname: string): GateStep {
  const m = pathname.match(LOCALE);
  if (!m) return { kind: "pass" };
  const index = INDEXABLE.test(pathname);
  if (OPEN.test(pathname)) return { kind: "open", index };
  const locale = m[1] as "en" | "ar";
  if (TEAM.test(pathname)) return { kind: "team", locale, to: `/${locale}${COMING_SOON_PATH}`, index: false };
  return { kind: "admin", locale, to: `/${locale}${COMING_SOON_PATH}`, index };
}
