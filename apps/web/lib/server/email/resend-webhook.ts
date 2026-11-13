// Resend webhooks (email.bounced, email.complained, email.suppressed). Resend signs them the Svix way: HMAC-SHA256,
// keyed with the base64 part of the "whsec_..." signing secret, over "<svix-id>.<svix-timestamp>.<body>", sent as one
// or more "v1,<base64>" values in svix-signature. Web Crypto only, so it runs the same on Workers and in tests.
import { safeEqual } from "@/lib/billing/crypto";

const MAX_SKEW_SECONDS = 5 * 60;
export const BOUNCE_KINDS = {
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
} as const;
export type BounceKind = (typeof BOUNCE_KINDS)[keyof typeof BOUNCE_KINDS];

export type ResendEvent = { id: string; type: string; emailId: string | null; to: string[]; detail: string | null };
type Verified = { ok: true; event: ResendEvent } | { ok: false; reason: "signature" | "payload" };

const b64ToBytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const bytesToB64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));

export async function signResend(secret: string, id: string, ts: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBytes(secret.replace(/^whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToB64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
}

export async function verifyResend(
  body: string,
  h: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  now = new Date(),
): Promise<Verified> {
  if (!h.id || !h.signature || !h.timestamp || !/^\d{1,12}$/.test(h.timestamp))
    return { ok: false, reason: "signature" };
  if (Math.abs(now.getTime() / 1000 - Number(h.timestamp)) > MAX_SKEW_SECONDS)
    return { ok: false, reason: "signature" };
  let expected: string;
  try {
    expected = await signResend(secret, h.id, h.timestamp, body);
  } catch {
    return { ok: false, reason: "signature" };
  }
  const given = h.signature
    .split(" ")
    .map((s) => s.split(","))
    .filter(([v]) => v === "v1")
    .map(([, sig]) => sig ?? "");
  if (!given.some((s) => safeEqual(s, expected))) return { ok: false, reason: "signature" };
  let json: {
    type?: unknown;
    data?: { email_id?: unknown; to?: unknown; bounce?: { message?: unknown; type?: unknown }; reason?: unknown };
  };
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, reason: "payload" };
  }
  if (typeof json.type !== "string") return { ok: false, reason: "payload" };
  const d = json.data ?? {};
  const to = (Array.isArray(d.to) ? d.to : typeof d.to === "string" ? [d.to] : [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.includes("@"));
  const detail =
    [d.bounce?.type, d.bounce?.message, d.reason]
      .filter((x): x is string => typeof x === "string" && !!x)
      .join(": ")
      .slice(0, 300) || null;
  return {
    ok: true,
    event: { id: h.id, type: json.type, emailId: typeof d.email_id === "string" ? d.email_id : null, to, detail },
  };
}
