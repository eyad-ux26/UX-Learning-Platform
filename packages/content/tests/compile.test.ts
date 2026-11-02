import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error plain JS module
import { compileTree } from "../src/compile.mjs";
import { bundle, cast } from "../src/index";

const seed = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../seed/paths");

describe("content compiler", () => {
  it("compiles the seed (P01 U01-U02 and P10) with no errors", () => {
    const { errors, bundle: b } = compileTree(seed);
    expect(errors).toEqual([]);
    expect(b.lessons.map((l: { lessonId: string }) => l.lessonId).filter((id: string) => id.startsWith("P01"))).toEqual(["P01-U01-L01", "P01-U01-L02", "P01-U01-L03", "P01-U01-L04", "P01-U02-L01", "P01-U02-L02", "P01-U02-L03", "P01-U02-L04"]);
  });
  it("is deterministic: same input gives the same hashes", () => {
    const a = compileTree(seed).bundle.lessons.map((l: { hash: string }) => l.hash);
    const b = compileTree(seed).bundle.lessons.map((l: { hash: string }) => l.hash);
    expect(a).toEqual(b);
  });
  it("resolves every fixture reference", () => {
    expect(JSON.stringify(bundle)).not.toMatch(/"@[A-Z]\d/);
  });
  it("every graded step of a lesson has two hints in both languages; skill checks have none", () => {
    for (const l of bundle.lessons)
      for (const s of l.body.steps) if (s.type !== "card" && l.body.mode === "check") expect(s.hints ?? [], `${l.lessonId}/${s.id}`).toEqual([]);
      else if (s.type !== "card") {
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
  it("reads the speaker from the lesson, lets a step override it, and rejects unknown ids", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uxg-"));
    fs.cpSync(seed, tmp, { recursive: true });
    const f = path.join(tmp, "P01/U01/P01-U01-L01-every-field-costs-something.yaml");
    const text = fs.readFileSync(f, "utf8");
    const lessonOf = (r: { bundle: { lessons: { lessonId: string; body: { steps: { scenario?: unknown; speaker?: string }[] } }[] } }) => r.bundle.lessons.find((l) => l.lessonId === "P01-U01-L01")!;
    expect(lessonOf(compileTree(tmp)).body.steps.filter((s) => s.scenario).every((s) => s.speaker === "hana" || s.speaker === "tarek")).toBe(true);
    expect(lessonOf(compileTree(tmp)).body.steps.filter((s) => s.scenario).some((s) => s.speaker === "hana")).toBe(true);
    fs.writeFileSync(f, text.replace(/^speaker: .*$/m, "speaker: nobody"));
    expect(compileTree(tmp).errors.join("\n")).toMatch(/unknown speaker nobody/);
    fs.writeFileSync(f, text.replace(/^(\s*)scenario:/m, "$1speaker: karim\n$1scenario:"));
    const r = compileTree(tmp);
    expect(r.errors).toEqual([]);
    expect(lessonOf(r).body.steps.find((s) => s.scenario)?.speaker).toBe("karim");
  });
  it("has all three faces for every cast member", () => {
    const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../apps/web/public/char");
    for (const c of cast) for (const face of ["talk", "smile", "think"]) expect(fs.existsSync(path.join(pub, `uxgate-char-${c.id}-${face}-avatar.svg`)), `${c.id} ${face}`).toBe(true);
  });
});
