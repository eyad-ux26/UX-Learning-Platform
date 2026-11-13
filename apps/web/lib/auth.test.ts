import { describe, expect, it } from "vitest";
import { authErrorKey, isEmail, safeNext, signInLocale } from "./auth";

describe("safeNext", () => {
  it("keeps same-site paths", () => expect(safeNext("/app/path/P01")).toBe("/app/path/P01"));
  it("drops other sites and tricks", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)", "", null, undefined])
      expect(safeNext(bad as string)).toBe("/app");
  });
});

describe("authErrorKey", () => {
  it("maps known Supabase codes", () => {
    expect(authErrorKey({ code: "invalid_credentials" })).toBe("invalid");
    expect(authErrorKey({ code: "user_already_exists" })).toBe("exists");
    expect(authErrorKey({ code: "weak_password" })).toBe("weak");
    expect(authErrorKey({ code: "over_email_send_rate_limit" })).toBe("rate");
    expect(authErrorKey({ status: 429 })).toBe("rate");
    expect(authErrorKey({ code: "email_not_confirmed" })).toBe("unconfirmed");
  });
  it("falls back to a generic message", () => {
    expect(authErrorKey({ message: "boom" })).toBe("generic");
    expect(authErrorKey(null)).toBe("generic");
  });
});

describe("isEmail", () => {
  it("accepts and rejects", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("a b@c.de")).toBe(false);
  });
});

describe("signInLocale (the sign-in callback's language writes)", () => {
  const now = Date.parse("2026-11-05T20:00:00Z");
  const fresh = "2026-11-05T19:59:00Z";
  it("a new Google account on the Arabic page saves Arabic and a Saturday week", () => {
    expect(signInLocale({ created_at: fresh, user_metadata: { full_name: "G" } }, "ar", now)).toEqual({
      save: true,
      weekStart: 6,
    });
    expect(signInLocale({ created_at: fresh, user_metadata: { locale: "en-GB" } }, "ar", now)).toEqual({
      save: true,
      weekStart: 6,
    });
  });
  it("leaves the week alone when the sign-up already had the right language, and for older accounts", () => {
    expect(signInLocale({ created_at: fresh, user_metadata: { locale: "ar" } }, "ar", now)).toEqual({
      save: false,
      weekStart: null,
    });
    expect(signInLocale({ created_at: fresh, user_metadata: {} }, "en", now)).toEqual({ save: true, weekStart: null });
    expect(signInLocale({ created_at: "2026-10-01T00:00:00Z", user_metadata: { locale: "en" } }, "ar", now)).toEqual({
      save: true,
      weekStart: null,
    });
    expect(signInLocale({ created_at: null, user_metadata: null }, "ar", now)).toEqual({ save: true, weekStart: null });
  });
  it("a new Google account on the English page with an Arabic Google profile gets a Monday week", () => {
    expect(signInLocale({ created_at: fresh, user_metadata: { locale: "ar" } }, "en", now)).toEqual({
      save: true,
      weekStart: 1,
    });
  });
});
