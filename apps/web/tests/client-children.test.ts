import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A server page cannot hand a function to a client component ("Functions are not valid as a child of Client
// Components"): the page crashes with a 500 at run time, and neither tsc nor lint notices. This scan finds a function
// child or a function prop passed from a server .tsx file to a component exported by a "use client" file.

const root = path.resolve(__dirname, "..");
const skip = new Set(["node_modules", ".next", ".open-next", ".wrangler"]);
const files: string[] = [];
const walk = (d: string) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".tsx")) files.push(p);
  }
};
walk(root);
const isClient = (s: string) => /^\s*["']use client["']/.test(s);

describe("server pages and client components", () => {
  it("never pass a function child or a function prop to a client component", () => {
    const client = new Set<string>();
    for (const f of files) {
      const s = fs.readFileSync(f, "utf8");
      if (isClient(s)) for (const m of s.matchAll(/export (?:default )?(?:function|const) (\w+)/g)) client.add(m[1]);
    }
    const found: string[] = [];
    for (const f of files) {
      const s = fs.readFileSync(f, "utf8");
      if (isClient(s)) continue;
      const at = (i: number) => `${path.relative(root, f)}:${s.slice(0, i).split("\n").length}`;
      for (const m of s.matchAll(/<(\w+)\b[^<>]*?>\s*\{\s*\(?[\w, {}]*\)?\s*=>/gs)) if (client.has(m[1])) found.push(`${at(m.index ?? 0)} <${m[1]}> function child`);
      for (const m of s.matchAll(/<(\w+)\b[^>]*?\s(\w+)=\{\s*\(?[\w, ]*\)?\s*=>/gs)) if (client.has(m[1])) found.push(`${at(m.index ?? 0)} <${m[1]} ${m[2]}=...> function prop`);
    }
    expect(found).toEqual([]);
  });
});
