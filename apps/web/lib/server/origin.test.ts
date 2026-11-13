import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const incoming = new Headers();
vi.mock("next/headers", () => ({ headers: async () => incoming }));

const { requestOrigin } = await import("./origin");

describe("requestOrigin", () => {
  it("uses the routed Host and ignores a spoofed X-Forwarded-Host and X-Forwarded-Proto", async () => {
    incoming.set("host", "uxgate.org");
    incoming.set("x-forwarded-host", "evil.example");
    incoming.set("x-forwarded-proto", "http");
    expect(await requestOrigin()).toBe("https://uxgate.org");
  });
});
