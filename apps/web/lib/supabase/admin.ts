import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";
import { tracedFetch } from "@/lib/server/db-trace";

/**
 * Service-role client. Server only: it bypasses row-level security, so use it only after checking who is asking.
 * Counted and timed like the learner's client (lib/server/db-trace.ts). It keeps supabase-js's slower retries: it serves
 * the nightly jobs and webhooks, where finishing matters more than speed, and pages use it only for rare writes.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: tracedFetch },
  });
}
