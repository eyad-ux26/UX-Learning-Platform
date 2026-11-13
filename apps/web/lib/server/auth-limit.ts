import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { clientIp, ipHash } from "@/lib/server/ip-hash";
import { withinMemoryLimit } from "@/lib/server/rate-limit";

// Learner sign-in and sign-in emails, limited per network and per email address. Supabase's own per-IP limits cannot do
// this here: the app calls Supabase from the Worker, so Supabase sees Cloudflare's addresses, not the learner's.
// Without these, one script could try passwords against an account without pause, or send sign-in and reset emails
// until the project's hourly email allowance is gone and nobody else gets one.
//
// The counters are the admin sign-in counters (0044, admin_signin_tries: one row per bucket, a fixed window), under
// their own "learner-" buckets, so no migration is needed. Addresses and emails are stored as keyed hashes only.
// If the database cannot be asked, the request goes ahead (a per-instance counter still applies): sign-in must not
// stop working because a counter is down.

export type AuthLimit = { perIp: number; perEmail: number; windowSeconds: number };

/** Wrong passwords: 30 per network and 10 per account in 15 minutes. */
export const SIGNIN_LIMIT: AuthLimit = { perIp: 30, perEmail: 10, windowSeconds: 15 * 60 };
/** Sign-in, sign-up and reset emails: 20 per network and 5 per address in an hour. */
export const EMAIL_LIMIT: AuthLimit = { perIp: 20, perEmail: 5, windowSeconds: 60 * 60 };

async function buckets(kind: string, email: string): Promise<{ ip: string; ipBucket: string; emailBucket: string }> {
  const ip = clientIp(await headers());
  const ipKey = (await ipHash(ip, "learner-auth")) ?? ip;
  const emailKey = (await ipHash(email.trim().toLowerCase(), "learner-auth-email")) ?? email.trim().toLowerCase();
  return { ip, ipBucket: `learner-${kind}-ip:${ipKey}`, emailBucket: `learner-${kind}-email:${emailKey}` };
}

/** True while this network and this email may still try to sign in (wrong passwords counted by `signInFailed`). */
export async function signInAllowed(email: string): Promise<boolean> {
  const b = await buckets("signin", email);
  if (!withinMemoryLimit(`learner-signin:${b.ip}`, SIGNIN_LIMIT.perIp, SIGNIN_LIMIT.windowSeconds * 1000)) return false;
  if (!hasServiceKey()) return true;
  const db = createAdminClient();
  const [ip, em] = await Promise.all([
    db.rpc("admin_signin_paused", { p_buckets: [b.ipBucket], p_limit: SIGNIN_LIMIT.perIp, p_window_seconds: SIGNIN_LIMIT.windowSeconds }),
    db.rpc("admin_signin_paused", { p_buckets: [b.emailBucket], p_limit: SIGNIN_LIMIT.perEmail, p_window_seconds: SIGNIN_LIMIT.windowSeconds }),
  ]);
  return !(ip.data === true || em.data === true);
}

/** Counts one wrong password for this network and this email. */
export async function signInFailed(email: string): Promise<void> {
  if (!hasServiceKey()) return;
  const b = await buckets("signin", email);
  const db = createAdminClient();
  await Promise.all([
    db.rpc("admin_signin_fail", { p_buckets: [b.ipBucket], p_limit: SIGNIN_LIMIT.perIp, p_window_seconds: SIGNIN_LIMIT.windowSeconds }),
    db.rpc("admin_signin_fail", { p_buckets: [b.emailBucket], p_limit: SIGNIN_LIMIT.perEmail, p_window_seconds: SIGNIN_LIMIT.windowSeconds }),
  ]).catch(() => undefined);
}

/** Counts one email about to be sent (magic link, reset, sign-up confirmation). False when this one is over the limit. */
export async function emailSendAllowed(email: string): Promise<boolean> {
  const b = await buckets("email", email);
  if (!withinMemoryLimit(`learner-email:${b.ip}`, EMAIL_LIMIT.perIp, EMAIL_LIMIT.windowSeconds * 1000)) return false;
  if (!hasServiceKey()) return true;
  const db = createAdminClient();
  const [ip, em] = await Promise.all([
    db.rpc("admin_signin_fail", { p_buckets: [b.ipBucket], p_limit: EMAIL_LIMIT.perIp, p_window_seconds: EMAIL_LIMIT.windowSeconds }),
    db.rpc("admin_signin_fail", { p_buckets: [b.emailBucket], p_limit: EMAIL_LIMIT.perEmail, p_window_seconds: EMAIL_LIMIT.windowSeconds }),
  ]);
  return !(ip.data === false || em.data === false);
}
