// The launch list on the Coming Soon page (migration 0038, design canvas v70). Pure and edge-safe, shared by the form,
// /api/waitlist and the confirmation page.

import { isEmail } from "./auth";

/** The consent line under the form, saved word for word with the address (without the Privacy Policy link). */
export const WAITLIST_CONSENT = {
  en: "We only email you about the launch, and you can leave the list at any time.",
  ar: "نراسلك بخصوص الإطلاق فقط، ويمكنك الخروج من القائمة في أي وقت.",
} as const;

export type WaitlistInput = { email: string; locale: "en" | "ar"; trap: string };

/** What the form shows after a submit: "sent" (check your inbox) or "already" (confirmed and on the list). */
export type WaitlistStatus = "sent" | "already";

/** Checks the form body. `trap` is a field people never see; anything typed there means a bot. */
export function parseWaitlist(body: unknown): WaitlistInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (!email || email.length > 254 || !isEmail(email)) return null;
  if (b.locale !== "en" && b.locale !== "ar") return null;
  return { email, locale: b.locale, trap: typeof b.trap === "string" ? b.trap : "" };
}

/** join_waitlist's answer as the form shows it. "send" and "pending" both read "check your inbox". */
export function waitlistStatus(r: string): WaitlistStatus | "limited" | null {
  if (r === "send" || r === "pending") return "sent";
  if (r === "confirmed") return "already";
  if (r === "limited") return "limited";
  return null;
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 of a confirmation token, as the table stores it. */
export async function tokenHash(token: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

/** A new confirmation token (32 random bytes, URL-safe) and its hash. */
export async function newToken(): Promise<{ token: string; hash: string }> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (const b of raw) s += String.fromCharCode(b);
  const token = btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { token, hash: await tokenHash(token) };
}

/** Only tokens newToken could have made reach the database. */
export const looksLikeToken = (t: string | null | undefined): t is string => !!t && /^[A-Za-z0-9_-]{43}$/.test(t);
