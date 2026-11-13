import { describe, expect, it } from "vitest";
import { looksLikeToken, newToken, parseWaitlist, tokenHash, WAITLIST_CONSENT, waitlistStatus } from "./waitlist";

describe("parseWaitlist", () => {
  it("accepts a trimmed address and a known language", () => {
    expect(parseWaitlist({ email: "  sara@example.com ", locale: "ar" })).toEqual({
      email: "sara@example.com",
      locale: "ar",
      trap: "",
    });
  });
  it("refuses a bad address or language", () => {
    expect(parseWaitlist({ email: "sara", locale: "en" })).toBeNull();
    expect(parseWaitlist({ email: `${"a".repeat(250)}@example.com`, locale: "en" })).toBeNull();
    expect(parseWaitlist({ email: "sara@example.com", locale: "fr" })).toBeNull();
    expect(parseWaitlist(null)).toBeNull();
    expect(parseWaitlist("x")).toBeNull();
  });
  it("passes the hidden field through so the route can drop bots quietly", () => {
    expect(parseWaitlist({ email: "a@example.com", locale: "en", trap: "http://spam" })?.trap).toBe("http://spam");
  });
  it("has the consent line in both languages", () => {
    expect(WAITLIST_CONSENT.en).toMatch(/launch/);
    expect(WAITLIST_CONSENT.ar).toMatch(/الإطلاق/);
  });
});

describe("waitlistStatus", () => {
  it("reads a new or repeated email as sent, and a confirmed one as already", () => {
    expect(waitlistStatus("send")).toBe("sent");
    expect(waitlistStatus("pending")).toBe("sent");
    expect(waitlistStatus("confirmed")).toBe("already");
    expect(waitlistStatus("limited")).toBe("limited");
    expect(waitlistStatus("x")).toBeNull();
  });
});

describe("tokens", () => {
  it("are URL-safe, random and stored only as a hash", async () => {
    const a = await newToken();
    const b = await newToken();
    expect(looksLikeToken(a.token)).toBe(true);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(await tokenHash(a.token));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(looksLikeToken("short")).toBe(false);
    expect(looksLikeToken(`${a.token}x`)).toBe(false);
    expect(looksLikeToken(null)).toBe(false);
  });
});
