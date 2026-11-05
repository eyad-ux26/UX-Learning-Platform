import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { ipCountry } = await import("./config");
const { regionFor, UNKNOWN_COUNTRY } = await import("@/lib/billing/pricing");

const h = (c?: string) => new Headers(c === undefined ? {} : { "cf-ipcountry": c });
/** What the checkout and code routes do with the request's country. */
const priceCountry = (headers: Headers) => ipCountry(headers) ?? UNKNOWN_COUNTRY;

describe("price country from Cloudflare (CF-IPCountry)", () => {
  it("uses the country Cloudflare reports", () => {
    expect(ipCountry(h("eg"))).toBe("EG");
    expect(regionFor(priceCountry(h("SA")))).toBe("gulf");
  });
  it("missing, XX (unknown) and T1 (Tor) fall back to the world price, not Egypt's", () => {
    for (const c of [undefined, "", "XX", "T1", "not-a-country"]) {
      expect(ipCountry(h(c))).toBeNull();
      expect(regionFor(priceCountry(h(c)))).toBe("world");
    }
  });
});
