import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import middleware, { config } from "../middleware";

// next-intl's middleware cannot load under vitest; the lesson-file check runs before it anyway.
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null, { status: 200 }) }));
import { isPrivateContent } from "./private-content";

const root = path.resolve(__dirname, "..");

describe("lesson files are private", () => {
  it("every lesson file path counts as private, other assets do not", () => {
    expect(isPrivateContent("/c/045b8134d0571a9569527e24e6afaa89d51aa542.json")).toBe(true);
    expect(isPrivateContent("/char/salma.png")).toBe(false);
    expect(isPrivateContent("/en/app")).toBe(false);
  });
  it("Cloudflare sends /c/* to the Worker before the static assets, and the Worker answers 404", () => {
    const jsonc = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8").replace(/^\s*\/\/.*$/gm, "");
    expect(JSON.parse(jsonc).assets.run_worker_first).toContain("/c/*");
    const worker = fs.readFileSync(path.join(root, "cf-worker.ts"), "utf8");
    expect(worker).toMatch(/if \(isPrivateContent\(new URL\(req\.url\)\.pathname\)\) return notFound\(\);/);
  });
  it("under Node the middleware runs for /c/ and answers 404", async () => {
    expect(config.matcher).toContain("/c/:path*");
    const res = await middleware(new NextRequest("http://localhost/c/045b8134d0571a9569527e24e6afaa89d51aa542.json"));
    expect(res.status).toBe(404);
  });
});
