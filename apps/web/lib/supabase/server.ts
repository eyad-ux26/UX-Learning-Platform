import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sessionCookieOptions, supabaseAnonKey, supabaseUrl } from "./env";

/** Supabase client for server components and route handlers, acting as the signed-in learner (row-level security applies). */
export async function createClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a server component: middleware refreshes the session */ }
      },
    },
  });
}
