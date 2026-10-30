import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error plain JS module
import { compileTree } from "../src/compile.mjs";
import { bundle } from "../src/index";

const seed = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../seed/paths");

describe("content compiler", () => {
  it("compiles the P01 U01 seed with no errors", () => {
    const { errors, bundle: b } = compileTree(seed);
    expect(errors).toEqual([]);
    expect(b.lessons.map((l: { lessonId: string }) => l.lessonId)).toEqual(["P01-U01-L01", "P01-U01-L02", "P01-U01-L03"]);
  });
  it("is deterministic: same input gives the same hashes", () => {
    const a = compileTree(seed).bundle.lessons.map((l: { hash: string }) => l.hash);
    const b = compileTree(seed).bundle.lessons.map((l: { hash: string }) => l.hash);
    expect(a).toEqual(b);
  });
  it("resolves every fixture reference", () => {
    expect(JSON.stringify(bundle)).not.toMatch(/"@[A-Z]\d/);
  });
  it("every graded step has two hints in both languages", () => {
    for (const l of bundle.lessons)
      for (const s of l.body.steps) if (s.type !== "card") {
        expect(s.hints?.length, `${l.lessonId}/${s.id}`).toBe(2);
        for (const h of s.hints ?? []) { expect(h.en).toBeTruthy(); expect(h.ar).toBeTruthy(); }
      }
  });
  it("rejects an answer that names no option", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uxg-"));
    fs.cpSync(seed, tmp, { recursive: true });
    const f = path.join(tmp, "P01/U01/P01-U01-L01-every-field-costs-something.yaml");
    fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("answer: [nid]", "answer: [nope]"));
    expect(compileTree(tmp).errors.join("\n")).toMatch(/P01-U01-L01\/S02: answer must list option ids/);
  });
});
