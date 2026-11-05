// Signed one-click "turn off" links for emails (RFC 8058). WebCrypto only, so it runs on Cloudflare Workers.
// A token names one learner and one kind of email; it carries no expiry, because an unsubscribe link must keep working.
// Billing email cannot be turned off, so no token is ever made or accepted for it.

import { KINDS, prefKindOf, type InboxKind, type Kind } from "./notifications";

export type UnsubKind = Exclude<Kind, "billing">;
export const UNSUB_KINDS = KINDS.filter((k): k is UnsubKind => k !== "billing");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const enc = new TextEncoder();

const secret = () => process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET || "";

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmac(key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** Compares two byte strings in time that depends only on their length. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** The kind a "turn off" link acts on: the goal-still-open email is a variant of the daily reminder. */
export function unsubKindOf(kind: InboxKind | string): UnsubKind | null {
  const k = kind === "goal" ? prefKindOf("goal") : kind;
  return k && (UNSUB_KINDS as readonly string[]).includes(k) ? (k as UnsubKind) : null;
}

/** Makes the token for one learner and one kind. Throws when no secret is set or the kind cannot be turned off. */
export async function signUnsub(userId: string, kind: InboxKind | UnsubKind): Promise<string> {
  const key = secret();
  if (!key) throw new Error("EMAIL_LINK_SECRET (or CRON_SECRET) is not set");
  const k = unsubKindOf(kind);
  if (!k) throw new Error(`"${kind}" email cannot be turned off`);
  if (!UUID.test(userId)) throw new Error("userId is not a uuid");
  const payload = `${userId.toLowerCase()}:${k}`;
  return `${b64url(enc.encode(payload))}.${b64url(await hmac(key, `unsub:${payload}`))}`;
}

/** Checks a token. Returns who and which kind, or null for anything that is not a valid, unaltered token. */
export async function verifyUnsub(token: string | null | undefined): Promise<{ userId: string; kind: UnsubKind } | null> {
  const key = secret();
  if (!key || !token || token.length > 300) return null;
  const [p, s, extra] = token.split(".");
  if (!p || !s || extra !== undefined) return null;
  const raw = fromB64url(p);
  const sig = fromB64url(s);
  if (!raw || !sig) return null;
  const payload = new TextDecoder().decode(raw);
  const [userId, kind] = payload.split(":");
  if (!UUID.test(userId ?? "") || !(UNSUB_KINDS as readonly string[]).includes(kind ?? "")) return null;
  if (!sameBytes(sig, await hmac(key, `unsub:${payload}`))) return null;
  return { userId, kind: kind as UnsubKind };
}

export const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://uxgate.org").replace(/\/+$/, "");

/** The address for the footer link and the List-Unsubscribe header. Opening it shows a page; only its button (or a one-click POST) turns the email off. */
export async function unsubHref(userId: string, kind: InboxKind | UnsubKind, locale: "en" | "ar" = "en"): Promise<string> {
  return `${siteOrigin()}/api/notifications/unsubscribe?t=${encodeURIComponent(await signUnsub(userId, kind))}&l=${locale}`;
}
