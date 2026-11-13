import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sessionCookieOptions, supabaseAnonKey, supabaseUrl } from "./env";
import { tracedFetch } from "@/lib/server/db-trace";

/**
 * Supabase client for server components and route handlers, acting as the signed-in learner (row-level security applies).
 * Its calls are counted and timed per request, and a failed read is tried again once after a short pause instead of
 * supabase-js's 1 s, 2 s, 4 s retries (lib/server/db-trace.ts, issue #184).
 */
export async function createClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    global: { fetch: tracedFetch },
    db: { retry: false },
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a server component: middleware refreshes the session */
        }
      },
    },
  });
}
