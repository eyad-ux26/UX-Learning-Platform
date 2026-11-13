/** Keyed hash of a visitor's IP address, so the database never stores the address itself. Null without a server secret. */
export async function ipHash(ip: string, purpose: string): Promise<string | null> {
  const key = process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET;
  if (!key) return null;
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${purpose}:${ip}`)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The visitor's IP as Cloudflare reports it. */
export const clientIp = (h: Headers): string =>
  h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
