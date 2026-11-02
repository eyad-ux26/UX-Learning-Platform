import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error plain JS module
import { compileTree } from "../src/compile.mjs";
import { bundle, cast } from "../src/index";

const seed = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../content/paths");

describe("content compiler", () => {
  it("compiles every P01 and P10 unit with no errors", () => {
    const { errors, bundle: b } = compileTree(seed);
    expect(errors).toEqual([]);
    expect(b.units.map((u: { id: string }) => u.id)).toEqual(["P01-U01", "P01-U02", "P01-U03", "P01-U04", "P01-U05", "P10-U01", "P10-U02", "P10-U03", "P10-U04", "P10-U05", "P10-U06"]);
    // Every unit has a re-test bank, and every skill has at least 2 held-back steps in it.
    expect(b.banks.map((l: { unitId: string }) => l.unitId)).toEqual(b.units.map((u: { id: string }) => u.id));
    for (const u of b.units) {
      const bank = b.banks.find((l: { unitId: string }) => l.unitId === u.id);
      for (const k of u.skills) expect(bank.body.steps.filter((s: { skill: string }) => s.skill === k.id).length, k.id).toBeGreaterThanOrEqual(2);
    }
  });
  it("is deterministic: same input gives the same hashes", () => {
    const a = compileTree(seed).bundle.lessons.map((l: { hash: string }) => l.hash);
    const b = compileTree(seed).bundle.lessons.map((l: { hash: string }) => l.hash);
    expect(a).toEqual(b);
  });
  it("resolves every fixture reference", () => {
    expect(JSON.stringify(bundle)).not.toMatch(/"@[A-Z]\d/);
  });
  it("hints are at most two and in both languages; skill checks have none", () => {
    for (const l of bundle.lessons)
      for (const s of l.body.steps) if (s.type !== "card" && l.body.mode === "check") expect(s.hints ?? [], `${l.lessonId}/${s.id}`).toEqual([]);
      else if (s.type !== "card") {
        expect((s.hints ?? []).length, `${l.lessonId}/${s.id}`).toBeLessThanOrEqual(2);
        for (const h of s.hints ?? []) { expect(h.en).toBeTruthy(); expect(h.ar).toBeTruthy(); }
      }
  });
  it("rejects an answer that names no option", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uxg-"));
    fs.cpSync(seed, path.join(tmp, "paths"), { recursive: true }); fs.copyFileSync(path.join(seed, "../cast.yaml"), path.join(tmp, "cast.yaml"));
    const f = path.join(tmp, "paths/P01/U01/P01-U01-L01-every-field-costs-something.yaml");
    fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace("answer: [nid]", "answer: [nope]"));
    expect(compileTree(path.join(tmp, "paths")).errors.join("\n")).toMatch(/P01-U01-L01\/S02: answer must list option ids/);
  });
  it("reads the speaker from the lesson, lets a step override it, and rejects unknown ids", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uxg-"));
    fs.cpSync(seed, path.join(tmp, "paths"), { recursive: true }); fs.copyFileSync(path.join(seed, "../cast.yaml"), path.join(tmp, "cast.yaml"));
    const f = path.join(tmp, "paths/P01/U01/P01-U01-L01-every-field-costs-something.yaml");
    const text = fs.readFileSync(f, "utf8");
    const lessonOf = (r: { bundle: { lessons: { lessonId: string; body: { steps: { scenario?: unknown; speaker?: string }[] } }[] } }) => r.bundle.lessons.find((l) => l.lessonId === "P01-U01-L01")!;
    expect(lessonOf(compileTree(path.join(tmp, "paths"))).body.steps.filter((s) => s.scenario).every((s) => s.speaker === "hana" || s.speaker === "tarek")).toBe(true);
    expect(lessonOf(compileTree(path.join(tmp, "paths"))).body.steps.filter((s) => s.scenario).some((s) => s.speaker === "hana")).toBe(true);
    fs.writeFileSync(f, text.replace(/^speaker: .*$/m, "speaker: nobody"));
    expect(compileTree(path.join(tmp, "paths")).errors.join("\n")).toMatch(/unknown speaker nobody/);
    fs.writeFileSync(f, text.replace(/^(\s*)scenario:/m, "$1speaker: karim\n$1scenario:"));
    const r = compileTree(path.join(tmp, "paths"));
    expect(r.errors).toEqual([]);
    expect(lessonOf(r).body.steps.find((s) => s.scenario)?.speaker).toBe("karim");
  });
  it("has all three faces for every cast member", () => {
    const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../apps/web/public/char");
    for (const c of cast) for (const face of ["talk", "smile", "think"]) expect(fs.existsSync(path.join(pub, `uxgate-char-${c.id}-${face}-avatar.svg`)), `${c.id} ${face}`).toBe(true);
  });
});
