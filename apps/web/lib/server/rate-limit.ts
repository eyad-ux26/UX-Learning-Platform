import type { SupabaseClient } from "@supabase/supabase-js";

// Two layers. A per-instance counter stops a hot loop cheaply; a counter in the database holds across all instances.
const memory = new Map<string, { start: number; hits: number }>();

/** True while `key` is within `limit` hits per `windowMs` on this server instance. */
export function withinMemoryLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const cur = memory.get(key);
  if (!cur || now - cur.start >= windowMs) {
    if (memory.size > 5000) for (const [k, v] of memory) if (now - v.start >= windowMs) memory.delete(k);
    memory.set(key, { start: now, hits: 1 });
    return true;
  }
  cur.hits += 1;
  return cur.hits <= limit;
}

/** True while the user is within `limit` hits per window, counted in the database. If the check itself fails, requests are let through. */
export async function withinDbLimit(
  db: SupabaseClient,
  userId: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await db.rpc("hit_rate_limit", {
    p_user: userId,
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return true;
  return data !== false;
}
