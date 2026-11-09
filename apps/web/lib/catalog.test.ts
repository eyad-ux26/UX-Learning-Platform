import { describe, expect, it } from "vitest";
import type { ContentIndex as Bundle } from "@uxgate/content";
import { CATALOG, catalogFor, isPlayable } from "./catalog";
import { pickCurrent } from "./learning";

const unit = (pathId: string) => ({ id: `${pathId}-U01`, pathId, title: { en: "", ar: "" }, skill: { en: "", ar: "" }, free: true, skills: [], lessons: ["L1"] });
const b = { cast: [], lessons: [], paths: ["P01", "P10"].map((id) => ({ id, title: { en: id, ar: id }, subtitle: { en: "", ar: "" } })), units: [unit("P01"), unit("P10")] } as unknown as Bundle;

describe("path catalog", () => {
  it("lists 15 paths", () => expect(CATALOG).toHaveLength(15));
  it("only paths with lessons are playable; the rest are Coming soon", () => {
    expect(isPlayable("P01", b)).toBe(true);
    expect(isPlayable("P02", b)).toBe(false);
  });
  it("puts the current path first, then joined, then ones to start, then Coming soon", () => {
    const rows = catalogFor(new Set(["P01", "P10"]), "P10", b);
    expect(rows.slice(0, 2).map((r) => [r.id, r.state])).toEqual([["P10", "current"], ["P01", "joined"]]);
    expect(rows.slice(2).every((r) => r.state === "soon")).toBe(true);
  });
  it("a Coming soon path is never startable, even if someone claims to have joined it", () => {
    expect(catalogFor(new Set(["P02"]), "P02", b).find((r) => r.id === "P02")!.state).toBe("soon");
  });
  it("paths with content that the learner has not joined are offered to start", () => {
    expect(catalogFor(new Set(["P01"]), "P01", b).find((r) => r.id === "P10")!.state).toBe("new");
  });
});

describe("current path", () => {
  it("uses the current path when it is joined and playable", () => expect(pickCurrent("P10", ["P01", "P10"], "P01", b)?.id).toBe("P10"));
  it("falls back to a joined path, then the recommended one", () => {
    expect(pickCurrent("P02", ["P01"], null, b)?.id).toBe("P01");
    expect(pickCurrent(null, [], "P10", b)?.id).toBe("P10");
  });
  it("ignores a current path the learner has not joined", () => expect(pickCurrent("P10", ["P01"], null, b)?.id).toBe("P01"));
});

describe("Arabic path names", () => {
  it("/ar shows the Arabic name where there is one, English otherwise; /en is always English", async () => {
    const { localPathName } = await import("./catalog-list");
    expect(localPathName("P01", "ar")).toBe("نماذج يُكملها الناس بسهولة (Form Design)");
    expect(localPathName("P01", "en")).toBe("Forms That Flow");
    expect(localPathName("P03", "ar")).toBe("Frame the Right Problem");
    expect(localPathName("PX", "ar")).toBe("PX");
  });
  it("keeps the English term in brackets so a card can hold it on one line", async () => {
    const { CATALOG } = await import("./catalog-list");
    const named = CATALOG.filter((p) => p.nameAr);
    expect(named).toHaveLength(8);
    for (const p of named) expect(p.nameAr).toMatch(/\([A-Za-z][^()]*\)/);
  });
  it("matches the content title.ar once the content carries the bracketed term (after the Arabic names are seeded)", async () => {
    const { CATALOG } = await import("./catalog-list");
    const { content } = await import("@uxgate/content");
    for (const p of content.paths) {
      const e = CATALOG.find((c) => c.id === p.id);
      if (e?.nameAr && /\([A-Za-z]{4,}/.test(p.title.ar)) expect(e.nameAr).toBe(p.title.ar);
    }
  });
});
