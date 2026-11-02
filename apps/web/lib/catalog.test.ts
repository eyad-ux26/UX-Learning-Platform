import { describe, expect, it } from "vitest";
import type { Bundle } from "@uxgate/content";
import { CATALOG, catalogFor, isPlayable } from "./catalog";
import { pickCurrent } from "./learning";

const unit = (pathId: string) => ({ id: `${pathId}-U01`, pathId, title: { en: "", ar: "" }, skill: { en: "", ar: "" }, free: true, skills: [], lessons: ["L1"] });
const b = { cast: [], lessons: [], paths: ["P01", "P10"].map((id) => ({ id, title: { en: id, ar: id }, subtitle: { en: "", ar: "" } })), units: [unit("P01"), unit("P10")] } as unknown as Bundle;

describe("path catalog", () => {
  it("lists 14 paths", () => expect(CATALOG).toHaveLength(14));
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
