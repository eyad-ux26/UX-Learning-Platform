// Where test payments may run. Pure (no server-only import) so the rules are unit tested.
// Previews share production's Supabase project and secrets, so these checks are what keep the test payment page
// from giving real Pro: test-mode Pro is stored as `source: "mock"`, and only a host allowed here counts it.

/** Hosts that serve real learners. Test payments never run there, whatever the settings say. */
export const PRODUCTION_HOSTS = ["uxgate.org", "www.uxgate.org", "uxgate-web.uxgate-web.workers.dev"];

/**
 * Test-mode payments: on only when BILLING_MOCK=1 (set for preview versions alone, by the non-production deploy
 * command; it is not in wrangler.jsonc) and the request is not on a production host.
 */
export function mockAllowed(host: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  if (env.BILLING_MOCK !== "1") return false;
  const h = (host ?? "").toLowerCase().trim().replace(/\.$/, "").split(":")[0];
  return !!h && !PRODUCTION_HOSTS.includes(h);
}
