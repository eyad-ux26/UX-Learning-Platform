import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { hasSupabase, supabaseAnonKey, supabaseUrl } from "./lib/supabase/env";

const intl = createMiddleware(routing);
// Only screens that know who the learner is need their session kept fresh.
const SIGNED_IN_AREA = /^\/(en|ar)\/(app|onboarding|signin|signup)(\/|$)/;

export default async function middleware(req: NextRequest) {
  const res = intl(req);
  if (hasSupabase() && SIGNED_IN_AREA.test(req.nextUrl.pathname)) {
    const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => { req.cookies.set(name, value); res.cookies.set(name, value, options); }),
      },
    });
    await supabase.auth.getUser(); // refreshes an expiring session cookie
  }
  return res;
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
