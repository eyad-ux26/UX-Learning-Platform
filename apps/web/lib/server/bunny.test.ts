import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { signBunnyUrl } = await import("./bunny");

describe("signed Bunny address", () => {
  const url = new URL(signBunnyUrl("11111111-2222-3333-4444-555555555555", "vz-x.b-cdn.net", "secret", Date.UTC(2026, 10, 2)));
  it("points at the video's playlist and expires in two hours", () => {
    expect(url.host).toBe("vz-x.b-cdn.net");
    expect(url.pathname).toBe("/11111111-2222-3333-4444-555555555555/playlist.m3u8");
    expect(Number(url.searchParams.get("expires"))).toBe(Math.floor(Date.UTC(2026, 10, 2) / 1000) + 7200);
    expect(url.searchParams.get("token_path")).toBe("/11111111-2222-3333-4444-555555555555/");
  });
  it("signs the folder, so the key itself never appears in the address", () => {
    const dir = "/11111111-2222-3333-4444-555555555555/";
    const expected = createHash("sha256").update(`secret${dir}${url.searchParams.get("expires")}token_path=${dir}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(url.searchParams.get("token")).toBe(expected);
    expect(url.toString()).not.toContain("secret");
  });
});
