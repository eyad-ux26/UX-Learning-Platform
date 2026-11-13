// Cloudflare Web Analytics: one small cookie-free beacon, loaded only in production and only when NEXT_PUBLIC_CF_BEACON_TOKEN is set
// (the token comes from the Cloudflare dashboard, Web Analytics, and is public by design).
const token = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export function WebAnalytics() {
  if (process.env.NODE_ENV !== "production" || !token) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
