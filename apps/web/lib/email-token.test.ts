import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sameBytes, signUnsub, unsubHref, unsubKindOf, verifyUnsub } from "./email-token";

const ID = "11111111-2222-3333-4444-555555555555";

describe("one-click unsubscribe tokens", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.EMAIL_LINK_SECRET = "test-secret";
    delete process.env.CRON_SECRET;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("round-trips the learner and the kind", async () => {
    const t = await signUnsub(ID, "badge");
    expect(t).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await verifyUnsub(t)).toEqual({ userId: ID, kind: "badge" });
  });

  it("treats the goal email as the daily reminder", async () => {
    expect(await verifyUnsub(await signUnsub(ID, "goal"))).toEqual({ userId: ID, kind: "reminder" });
  });

  it("never signs billing or welcome", async () => {
    await expect(signUnsub(ID, "billing")).rejects.toThrow();
    await expect(signUnsub(ID, "welcome")).rejects.toThrow();
    expect(unsubKindOf("billing")).toBeNull();
  });

  it("rejects a changed payload, a changed signature and junk", async () => {
    const t = await signUnsub(ID, "reminder");
    const [p, s] = t.split(".");
    const otherPayload = btoa(`${ID}:badge`).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(await verifyUnsub(`${otherPayload}.${s}`)).toBeNull();
    expect(await verifyUnsub(`${p}.${s.slice(0, -2)}AA`)).toBeNull();
    expect(await verifyUnsub(`${p}.${s}.x`)).toBeNull();
    for (const junk of ["", "abc", "a.b", "!!.??", null, undefined]) expect(await verifyUnsub(junk)).toBeNull();
  });

  it("billing tokens made with the same secret are still refused", async () => {
    const enc = new TextEncoder();
    const payload = `${ID}:billing`;
    const k = await crypto.subtle.importKey(
      "raw",
      enc.encode("test-secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`unsub:${payload}`)));
    const b = (u: Uint8Array) =>
      btoa(String.fromCharCode(...u))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    expect(await verifyUnsub(`${b(enc.encode(payload))}.${b(sig)}`)).toBeNull();
  });

  it("a token from another secret does not verify; CRON_SECRET is the fallback", async () => {
    const t = await signUnsub(ID, "reminder");
    process.env.EMAIL_LINK_SECRET = "other";
    expect(await verifyUnsub(t)).toBeNull();
    delete process.env.EMAIL_LINK_SECRET;
    process.env.CRON_SECRET = "test-secret";
    expect(await verifyUnsub(t)).toEqual({ userId: ID, kind: "reminder" });
  });

  it("without any secret, signing throws and verifying refuses", async () => {
    const t = await signUnsub(ID, "reminder");
    delete process.env.EMAIL_LINK_SECRET;
    await expect(signUnsub(ID, "reminder")).rejects.toThrow();
    expect(await verifyUnsub(t)).toBeNull();
  });

  it("builds the link on the site origin", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
    const href = new URL(await unsubHref(ID, "badge", "ar"));
    expect(href.origin + href.pathname).toBe("https://example.test/api/notifications/unsubscribe");
    expect(href.searchParams.get("l")).toBe("ar");
    expect(await verifyUnsub(href.searchParams.get("t"))).toEqual({ userId: ID, kind: "badge" });
  });

  it("compares bytes fully", () => {
    expect(sameBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(sameBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(sameBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});
