import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionCookieOptions } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("session cookies", () => {
  it("are HttpOnly and SameSite=Lax everywhere", () => {
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
  it("are Secure on Vercel production and still work over http on localhost", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1");
    expect(sessionCookieOptions().secure).toBe(true);
    vi.stubEnv("VERCEL", "");
    expect(sessionCookieOptions().secure).toBe(false);
  });
});
