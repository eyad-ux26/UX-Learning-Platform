// The site address to put in sign-in, reset and share links. Built from the Host the request was routed by, never from
// X-Forwarded-Host or X-Forwarded-Proto: on Cloudflare those reach the Worker exactly as the sender wrote them, so an
// attacker could ask for a reset or magic link for someone else's email that points at a host of their choosing.
// Pure, so it is unit tested; lib/server/origin.ts reads the request headers.

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/;

/** "https://<host>" for the routed host (http only for a local dev server), or the fallback for a missing or odd host. */
export function originFromHost(host: string | null | undefined, fallback = "https://uxgate.org"): string {
  const h = (host ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!h || !HOST.test(h)) return fallback;
  return `${LOCAL.test(h) ? "http" : "https"}://${h}`;
}
