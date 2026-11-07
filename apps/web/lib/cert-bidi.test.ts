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
