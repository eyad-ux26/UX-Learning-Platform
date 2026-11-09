import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { Lesson, LessonVersion } from "@uxgate/content/types";
import { content } from "@uxgate/content";
import { applyEdits, behind, diffText, labelOf, lessonChecks, textFields } from "./content-edit";

const dist = path.resolve(__dirname, "../../../../packages/content/dist/lessons");
const load = (id: string): Lesson => {
  const meta = content.lessons.find((l) => l.lessonId === id)!;
  return (JSON.parse(fs.readFileSync(path.join(dist, meta.file), "utf8")) as LessonVersion).body;
};

describe("lesson editor rules", () => {
  const base = load("P15-U01-L01");

  it("finds every text pair, never ids or answers", () => {
    const f = textFields(base);
    expect(f.length).toBeGreaterThan(20);
    expect(f.every((x) => !/\.(id|answer|skill|part)(\.|$)/.test(x.path))).toBe(true);
    expect(f[0].path).toBe("title");
  });

  it("applies only text edits, and the published lesson passes its checks with a change", () => {
    const f = textFields(base).find((x) => x.stepId)!;
    const draft = applyEdits(base, { [f.path]: { en: `${f.en} (edited)`, ar: `${f.ar} (معدّل)` } });
    expect(diffText(base, draft)).toHaveLength(1);
    expect(lessonChecks(base, draft).ok).toBe(true);
    expect(() => applyEdits(base, { "steps.0.id": { en: "x", ar: "y" } })).toThrow(/Not a text field/);
    expect(() => applyEdits(base, { "steps.0.__proto__.x": { en: "x", ar: "y" } })).toThrow(/Not a text field/);
  });

  it("flags Arabic that was not updated, unless marked checked", () => {
    const f = textFields(base).find((x) => x.stepId)!;
    const draft = applyEdits(base, { [f.path]: { en: `${f.en}!`, ar: f.ar } });
    expect(behind(base, draft)).toEqual([expect.objectContaining({ path: f.path, behind: "ar" })]);
    const c = lessonChecks(base, draft);
    expect(c.ok).toBe(false);
    expect(c.checks.find((x) => x.id === "parity")?.detail).toMatch(/Arabic not updated in 1/);
    expect(lessonChecks(base, draft, [f.path]).ok).toBe(true);
  });

  it("refuses an unchanged draft and empty text", () => {
    expect(lessonChecks(base, base).checks.find((c) => c.id === "changed")?.ok).toBe(false);
    const f = textFields(base)[1];
    expect(lessonChecks(base, applyEdits(base, { [f.path]: { en: "", ar: "" } })).checks.find((c) => c.id === "empty")?.ok).toBe(false);
  });
});

describe("field labels", () => {
  it("read in plain words, with nested parts as 1.2", () => {
    expect(labelOf(["options", "1", "mock", "blocks", "0", "blocks", "1", "text"])).toBe("Option 2 · example screen · part 1.2 · text");
    expect(labelOf(["mock", "appbar", "title"])).toBe("Example screen · top bar · title");
    expect(labelOf(["hints", "1"])).toBe("Hint 2");
    expect(labelOf(["misconceptions", "0", "feedback"])).toBe("Wrong answer 1 · feedback");
  });
});
