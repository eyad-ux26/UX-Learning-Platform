// Team access: while the Coming Soon gate is on, the sign-in pages open only after the team password (Eyad's request,
// 5 Nov 2026). The password is the Worker secret UG_TEAM_PASSWORD, set by an admin in Cloudflare, never in code. A right
// password sets the ug_team cookie: an expiry time signed with a key made from the password, so changing the password
// ends every pass at once. This is a door in front of sign-in; the admin role (lib/coming-soon.ts) is still checked on
// every request. WebCrypto only, so the middleware can check the cookie.

export const TEAM_COOKIE = "ug_team";
/** A pass lasts 12 hours. */
export const TEAM_PASS_SECONDS = 12 * 60 * 60;
export const TEAM_PATH = "/team";

const enc = new TextEncoder();

async function hmac(key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

function same(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/** The team password from the Worker secret, or null when none is set. */
const password = (): string | null => {
  const p = process.env.UG_TEAM_PASSWORD;
  return p && p.length >= 12 ? p : null;
};

// Admin panel Phase 2 (0061): an Admin can replace the password in Platform settings > Access. The panel stores only a
// PBKDF2 hash ("pbkdf2$<iterations>$<salt hex>$<hash hex>"), which wins over the Worker secret. It is read with the
// service key and kept for a minute; when it cannot be read, the last one read (or the Worker secret) is used.
export const PBKDF2_ITERATIONS = 100_000; // the most Cloudflare Workers allow
const HASH_TTL_MS = 60_000;
let stored: { at: number; hash: string | null } | null = null;

async function storedHash(now = Date.now()): Promise<string | null> {
  if (stored && now - stored.at < HASH_TTL_MS) return stored.hash;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/app_team_password`, {
      method: "POST",
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    });
    if (res.status === 404) {
      stored = { at: now, hash: null };
      return null;
    } // 0061 not run yet
    if (!res.ok) throw new Error(String(res.status));
    const h = (await res.json()) as unknown;
    stored = { at: now, hash: typeof h === "string" && h.startsWith("pbkdf2$") ? h : null };
  } catch {
    stored = { at: now - HASH_TTL_MS / 2, hash: stored?.hash ?? null };
  }
  return stored.hash;
}

/** Forget the stored hash (after the panel replaced it). */
export const resetTeamPassword = () => {
  stored = null;
};

async function pbkdf2(pw: string, saltHex: string, iterations: number): Promise<Uint8Array> {
  const salt = new Uint8Array((saltHex.match(/../g) ?? []).map((b) => parseInt(b, 16)));
  const base = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 256),
  );
}

/** The stored form of a new team password. */
export async function hashTeamPassword(pw: string): Promise<string> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hex(await pbkdf2(pw, salt, PBKDF2_ITERATIONS))}`;
}

/** A new team password must stand up to guessing (the gate also limits tries). Null when it is fine. */
export const teamPasswordProblem = (p: string): string | null =>
  p.length < 14
    ? "Use at least 14 characters."
    : p.length > 200
      ? "Use at most 200 characters."
      : new Set(p).size < 5
        ? "Use more different characters."
        : null;

/** The cookie signing key: derived from the password (or its stored hash) and the server's link secret, so neither alone forges a pass. */
async function passKey(): Promise<string | null> {
  const p = (await storedHash()) ?? password();
  if (!p) return null;
  return hex(await hmac(`${process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET || ""}:team`, p));
}

/** Compares a typed password with the secret in time that does not depend on where they differ. */
export async function teamPasswordMatches(typed: string): Promise<boolean> {
  if (typeof typed !== "string" || typed.length > 200) return false;
  const h = await storedHash();
  if (h) {
    const [, it, salt, want] = h.split("$");
    const iterations = Number(it);
    if (
      !Number.isInteger(iterations) ||
      iterations < 10_000 ||
      iterations > PBKDF2_ITERATIONS ||
      !/^[0-9a-f]{32}$/.test(salt) ||
      !/^[0-9a-f]{64}$/.test(want)
    )
      return false;
    return same(enc.encode(hex(await pbkdf2(typed, salt, iterations))), enc.encode(want));
  }
  const p = password();
  if (!p) return false;
  const salt = "ug-team-password";
  return same(await hmac(salt, typed), await hmac(salt, p));
}

/** A new pass for the cookie: "<expiry seconds>.<signature>". Null when no password is set. */
export async function signTeamPass(now = Date.now()): Promise<string | null> {
  const key = await passKey();
  if (!key) return null;
  const exp = Math.floor(now / 1000) + TEAM_PASS_SECONDS;
  return `${exp}.${hex(await hmac(key, `team:${exp}`))}`;
}

/** True for an unaltered, unexpired pass signed with the current password. */
export async function teamPassValid(cookie: string | null | undefined, now = Date.now()): Promise<boolean> {
  if (!cookie || cookie.length > 120) return false;
  const m = cookie.match(/^(\d{10})\.([0-9a-f]{64})$/);
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp * 1000 <= now || exp * 1000 > now + TEAM_PASS_SECONDS * 1000 + 60_000) return false;
  const key = await passKey();
  if (!key) return false;
  return same(enc.encode(hex(await hmac(key, `team:${exp}`))), enc.encode(m[2]));
}
