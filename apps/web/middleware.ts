import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { isPrivateContent, notFound } from "./lib/private-content";
import { hasSupabase, sessionCookieOptions, supabaseAnonKey, supabaseUrl } from "./lib/supabase/env";

const intl = createMiddleware(routing);
// Only screens that know who the learner is need their session kept fresh.
const SIGNED_IN_AREA = /^\/(en|ar)\/(app|onboarding|signin|signup)(\/|$)/;

// A sign-in that fails at the provider (an expired Google consent screen, for example) comes back to the site address with
// error in the query. Show the sign-in page's "that link did not work" message instead of a plain home page.
const HOME = /^\/(en|ar)?\/?$/;

export default async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (isPrivateContent(pathname)) return notFound(); // lesson files: server only (see lib/private-content.ts)
  if (HOME.test(pathname) && (searchParams.has("error") || searchParams.has("error_description") || searchParams.has("error_code"))) {
    const locale = pathname.match(HOME)?.[1] ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/signin?error=link`, req.url));
  }
  const res = intl(req);
  if (hasSupabase() && SIGNED_IN_AREA.test(req.nextUrl.pathname)) {
    const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookieOptions: sessionCookieOptions(),
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => { req.cookies.set(name, value); res.cookies.set(name, value, options); }),
      },
    });
    await supabase.auth.getUser(); // refreshes an expiring session cookie
  }
  return res;
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)", "/c/:path*"] };
