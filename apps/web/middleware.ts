import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { isPrivateContent, notFound } from "./lib/private-content";
import { hasSupabase, sessionCookieOptions, supabaseAnonKey, supabaseUrl } from "./lib/supabase/env";
import { paddleLinkStep, PTXN_COOKIE, PTXN_COOKIE_SECONDS } from "./lib/billing/paddle-link";
import { comingSoonOn, gateStep, isAdmin } from "./lib/coming-soon";
import { TEAM_COOKIE, teamPassValid } from "./lib/team-access";

const intl = createMiddleware(routing);
// Only screens that know who the learner is need their session kept fresh.
const SIGNED_IN_AREA = /^\/(en|ar)\/(app|onboarding|signin|signup|forgot|reset)(\/|$)/;

// A sign-in that fails at the provider (an expired Google consent screen, for example) comes back to the site address with
// error in the query. Show the sign-in page's "that link did not work" message instead of a plain home page.
const HOME = /^\/(en|ar)?\/?$/;

// Maintenance switch: with UG_MAINTENANCE=1 every page shows /{locale}/maintenance with a 503. The matcher already skips
// /api, /_next and files; the maintenance page itself passes through.
const MAINTENANCE_PAGE = /^\/(en|ar)\/maintenance\/?$/;
const LOCALE_PREFIX = /^\/(en|ar)(\/|$)/;

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (isPrivateContent(pathname)) return notFound(); // lesson files: server only (see lib/private-content.ts)
  if (process.env.UG_MAINTENANCE === "1" && !MAINTENANCE_PAGE.test(pathname)) {
    const url = req.nextUrl.clone();
    const cookie = req.cookies.get("NEXT_LOCALE")?.value;
    const locale = pathname.match(LOCALE_PREFIX)?.[1] ?? (cookie === "ar" || cookie === "en" ? cookie : routing.defaultLocale);
    url.pathname = `/${locale}/maintenance`;
    url.search = "";
    return NextResponse.rewrite(url, { status: 503, headers: { "Retry-After": "1800", "Cache-Control": "no-store" } });
  }
  if (HOME.test(pathname) && (searchParams.has("error") || searchParams.has("error_description") || searchParams.has("error_code"))) {
    const locale = pathname.match(HOME)?.[1] ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/signin?error=link`, req.url));
  }
  // The browser's language does not pick the site language: a first visit opens in Arabic (the default). Only a choice the
  // visitor made (the NEXT_LOCALE cookie, set when they switch language) changes it, so the Accept-Language header is hidden from next-intl.
  const hasChoice = req.cookies.has("NEXT_LOCALE");
  const intlReq = hasChoice || !req.headers.has("accept-language") ? req : (() => { const h = new Headers(req.headers); h.delete("accept-language"); return new NextRequest(req, { headers: h }); })();
  const res = intl(intlReq);
  // Coming Soon gate (lib/coming-soon.ts): pages other than the open ones need an admin session while it is on; the
  // sign-in pages also open with a team pass, the cookie the team password page sets (lib/team-access.ts).
  const gate = comingSoonOn() ? gateStep(req.nextUrl.pathname) : null;
  // Nothing but the home address and the legal pages may be indexed, whoever is looking (an admin's app pages too).
  if (gate && gate.kind !== "pass" && !gate.index) res.headers.set("X-Robots-Tag", "noindex");
  const adminOnly = gate?.kind === "admin" || (gate?.kind === "team" && !(await teamPassValid(req.cookies.get(TEAM_COOKIE)?.value)));
  if ((hasSupabase() && SIGNED_IN_AREA.test(req.nextUrl.pathname)) || adminOnly) {
    if (!hasSupabase()) return comingSoon(req, gate, res);
    const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookieOptions: sessionCookieOptions(),
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => { req.cookies.set(name, value); res.cookies.set(name, value, options); }),
      },
    });
    // Refreshes an expiring session cookie. getClaims checks the token locally with the project's public key, so a tab switch
    // no longer waits for a round trip to the Auth server here (getUser did one on every request).
    const { data } = await supabase.auth.getClaims();
    if (adminOnly && !isAdmin(data?.claims as { app_metadata?: Record<string, unknown> } | undefined)) return comingSoon(req, gate, res);
    // Paddle's payment links (?_ptxn=) survive sign-in: kept in a cookie, then opened again on the app home.
    const step = paddleLinkStep(req.nextUrl.pathname, req.nextUrl.searchParams, !!data?.claims?.sub, req.cookies.get(PTXN_COOKIE)?.value);
    if (step?.kind === "clear") res.cookies.delete(PTXN_COOKIE);
    if (step?.kind === "signin" || step?.kind === "resume") {
      const out = NextResponse.redirect(new URL(step.to, req.url));
      res.cookies.getAll().forEach((c) => out.cookies.set(c)); // keep a refreshed session
      if (step.kind === "signin") out.cookies.set(PTXN_COOKIE, step.txn, { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: PTXN_COOKIE_SECONDS });
      else out.cookies.delete(PTXN_COOKIE);
      return out;
    }
  }
  return res;
}

/** The Coming Soon page at the address asked for, private to this visitor, keeping a refreshed session cookie. */
function comingSoon(req: NextRequest, gate: ReturnType<typeof gateStep> | null, res: NextResponse) {
  if (gate?.kind !== "admin" && gate?.kind !== "team") return res;
  const url = req.nextUrl.clone();
  url.pathname = gate.to;
  url.search = "";
  const headers: Record<string, string> = { "Cache-Control": "private, no-store" };
  if (gate.kind === "team" || !gate.index) headers["X-Robots-Tag"] = "noindex";
  const out = NextResponse.rewrite(url, { headers });
  res.cookies.getAll().forEach((c) => out.cookies.set(c));
  return out;
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/c/:path*"] };
