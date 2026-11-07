import { describe, expect, it } from "vitest";
import { bidiGroups } from "./cert-bidi";

const flat = (t: string) => bidiGroups(t).map((g) => g.map((p) => p.text).join("|"));

describe("bidiGroups (Arabic text for the certificate image)", () => {
  it("keeps a Latin name in one piece, in order", () => {
    expect(flat("Salma Ahmed")).toEqual(["Salma Ahmed"]);
    expect(flat("أثبتت Salma Ahmed")).toEqual(["أثبتت", "Salma Ahmed"]);
  });
  it("keeps a Latin path name together inside an Arabic sentence", () => {
    expect(flat("أنهت مسار Forms That Flow بنجاح")).toEqual(["أنهت", "مسار", "Forms That Flow", "بنجاح"]);
  });
  it("puts a trailing dot outside the Latin run so it ends the sentence", () => {
    const g = bidiGroups("عبر UXGate.");
    expect(g[1]).toEqual([{ text: "UXGate", ltr: true }, { text: ".", ltr: false }]);
  });
  it("keeps IDs, links and numbers whole, and drops « »", () => {
    expect(flat("UXG-P01-ABC123")).toEqual(["UXG-P01-ABC123"]);
    expect(flat("uxgate.org/c/abc12345")).toEqual(["uxgate.org/c/abc12345"]);
    expect(flat("«مرحبا» 12 نوفمبر 2026")).toEqual(["مرحبا", "12", "نوفمبر", "2026"].map((x) => x));
  });
});

import { bidiLines } from "./cert-bidi";
describe("bidiLines (one node per Arabic line, in visual order)", () => {
  it("reverses the word order so the first word is at the right", () => {
    expect(bidiLines("أنهت مسار Forms That Flow بنجاح", 18, 900)).toEqual(["بنجاح Forms That Flow مسار أنهت"]);
  });
  it("moves a comma to the left of its word and a final dot to the far left", () => {
    expect(bidiLines("في حالات جديدة، على UXGate.", 18, 900)).toEqual([".UXGate على ،جديدة حالات في"]);
  });
  it("keeps a date together in order and breaks long text into lines from the top", () => {
    expect(bidiLines("7 نوفمبر 2026", 16, 900)).toEqual(["2026 نوفمبر 7"]);
    expect(bidiLines("كلمة ".repeat(40).trim(), 18, 300).length).toBeGreaterThan(1);
  });
});
