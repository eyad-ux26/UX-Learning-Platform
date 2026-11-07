import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { signBunnyUrl } = await import("./bunny");

const id = "11111111-2222-3333-4444-555555555555";
const dir = `/${id}/`;
const now = Date.UTC(2026, 10, 2);
const expires = Math.floor(now / 1000) + 7200;
const token = createHash("sha256").update(`secret${dir}${expires}token_path=${dir}`).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("signed Bunny address", () => {
  const signed = signBunnyUrl(id, "vz-x.b-cdn.net", "secret", now);
  const url = new URL(signed);
  it("points at the video's playlist, with the token in the path, expiring in two hours", () => {
    expect(url.host).toBe("vz-x.b-cdn.net");
    expect(signed).toBe(`https://vz-x.b-cdn.net/bcdn_token=${token}&expires=${expires}&token_path=%2F${id}%2F/${id}/playlist.m3u8`);
    expect(url.search).toBe("");
  });
  it("signs the folder, so the key itself never appears in the address", () => {
    expect(signed).not.toContain("secret");
  });
  it("keeps the token on relative renditions and segments, resolved the way a browser does", () => {
    for (const child of ["360p/video.m3u8", "360p/video0.ts"]) {
      const resolved = new URL(child, signed).toString();
      expect(resolved).toContain(`/bcdn_token=${token}&expires=${expires}&token_path=`);
      expect(resolved.endsWith(`/${id}/${child}`)).toBe(true);
    }
    const segment = new URL("video0.ts", new URL("360p/video.m3u8", signed)).toString();
    expect(segment).toContain(`/bcdn_token=${token}`);
    expect(segment.endsWith(`/${id}/360p/video0.ts`)).toBe(true);
  });
});
