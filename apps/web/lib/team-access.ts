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

/** The team password, or null when none is set (then nobody gets a pass). */
const password = (): string | null => {
  const p = process.env.UG_TEAM_PASSWORD;
  return p && p.length >= 12 ? p : null;
};

/** The cookie signing key: derived from the password and the server's link secret, so neither alone forges a pass. */
async function passKey(): Promise<string | null> {
  const p = password();
  if (!p) return null;
  return hex(await hmac(`${process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET || ""}:team`, p));
}

/** Compares a typed password with the secret in time that does not depend on where they differ. */
export async function teamPasswordMatches(typed: string): Promise<boolean> {
  const p = password();
  if (!p || typeof typed !== "string" || typed.length > 200) return false;
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
