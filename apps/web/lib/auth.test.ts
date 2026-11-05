import { describe, expect, it } from "vitest";
import { authErrorKey, isEmail, safeNext } from "./auth";

describe("safeNext", () => {
  it("keeps same-site paths", () => expect(safeNext("/app/path/P01")).toBe("/app/path/P01"));
  it("drops other sites and tricks", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)", "", null, undefined]) expect(safeNext(bad as string)).toBe("/app");
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
  it("falls back to a generic message", () => { expect(authErrorKey({ message: "boom" })).toBe("generic"); expect(authErrorKey(null)).toBe("generic"); });
});

describe("isEmail", () => {
  it("accepts and rejects", () => { expect(isEmail("a@b.co")).toBe(true); expect(isEmail("a@b")).toBe(false); expect(isEmail("a b@c.de")).toBe(false); });
});
