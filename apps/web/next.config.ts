import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";
// Cloudflare Web Analytics beacon (loaded only when a token is set).
const cfBeacon = !isDev && !!process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

// Content-Security-Policy. Next.js inlines small scripts and styles, so 'unsafe-inline' stays until a nonce setup replaces it.
// Everything else is closed: no framing (clickjacking), no plugins, forms and base URL only to ourselves, data only to us and Supabase.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${cfBeacon ? " https://static.cloudflareinsights.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws:" : ""}${cfBeacon ? " https://cloudflareinsights.com" : ""}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // One year, this host only: no includeSubDomains, so the old site's subdomains are not pulled onto https-only.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

// "standalone" keeps a self-hosted build possible; the live site is built for Cloudflare Workers by OpenNext.
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["@uxgate/tokens", "@uxgate/player", "@uxgate/content"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(config);
