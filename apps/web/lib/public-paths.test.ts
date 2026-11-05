import { describe, expect, it } from "vitest";
import { bundle } from "@uxgate/content/full";
import type { ContentIndex } from "@uxgate/content";
import { PUBLIC_PATHS, isOpen, isPublished, pageAlternates, pathFacts, publicPathParams, publicPathsInOrder } from "./public-paths";

describe("public path list", () => {
  it("has an entry for every path in the content bundle, marked open", () => {
    for (const p of bundle.paths) {
      const e = PUBLIC_PATHS.find((x) => x.id === p.id);
      expect(e, p.id).toBeDefined();
      expect(e!.status, p.id).toBe("open");
      expect(e!.name, p.id).toBe(p.title.en);
    }
  });
  it("Coming soon entries are not published in the bundle, and open ones are", () => {
    for (const p of PUBLIC_PATHS) expect(isPublished(p.id), p.id).toBe(p.status === "open");
  });
  it("ids and slugs are unique, and slugs are URL-safe", () => {
    expect(new Set(PUBLIC_PATHS.map((p) => p.id)).size).toBe(PUBLIC_PATHS.length);
    expect(new Set(PUBLIC_PATHS.map((p) => p.slug)).size).toBe(PUBLIC_PATHS.length);
    for (const p of PUBLIC_PATHS) expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it("lists the 14 paths, open ones first", () => {
    expect(PUBLIC_PATHS).toHaveLength(14);
    const order = publicPathsInOrder().map((p) => isOpen(p));
    expect(order.indexOf(false)).toBeGreaterThan(0);
    expect(order.slice(order.indexOf(false)).every((o) => !o)).toBe(true);
  });
  it("every entry has English and Arabic text", () => {
    for (const p of PUBLIC_PATHS) {
      for (const x of [p.sub, p.short ?? p.sub, ...(p.can ?? [])]) { expect(x.en.trim()).not.toBe(""); expect(x.ar.trim()).not.toBe(""); }
    }
  });
  it("open interactive paths have a sample step with a valid answer", () => {
    for (const p of PUBLIC_PATHS.filter((x) => isOpen(x) && x.kind === "interactive")) {
      expect(p.sample, p.id).toBeDefined();
      expect(p.sample!.answer).toBeLessThan(p.sample!.options.length);
    }
  });
  it("a path marked open but missing from the bundle shows as Coming soon", () => {
    const empty = { ...bundle, units: [] } as unknown as ContentIndex;
    expect(PUBLIC_PATHS.some((p) => isOpen(p, empty))).toBe(false);
  });
});

describe("static pages", () => {
  it("cover every path in both languages", () => {
    const params = publicPathParams();
    expect(params).toHaveLength(PUBLIC_PATHS.length * 2);
    for (const locale of ["en", "ar"]) for (const p of PUBLIC_PATHS) expect(params).toContainEqual({ locale, pathId: p.slug });
  });
  it("link both languages with hreflang and x-default to English", () => {
    const a = pageAlternates("ar", "/paths/forms-that-flow");
    expect(a.canonical).toBe("https://uxgate.org/ar/paths/forms-that-flow");
    expect(a.languages).toEqual({ en: "https://uxgate.org/en/paths/forms-that-flow", ar: "https://uxgate.org/ar/paths/forms-that-flow", "x-default": "https://uxgate.org/en/paths/forms-that-flow" });
  });
});

describe("path facts", () => {
  it("count units, lessons and skills from the bundle, with Unit 1 free", () => {
    const f = pathFacts(PUBLIC_PATHS.find((p) => p.id === "P01")!, "en");
    const units = bundle.units.filter((u) => u.pathId === "P01");
    expect(f.units).toBe(units.length);
    expect(f.lessons).toBe(units.reduce((s, u) => s + u.lessons.length, 0));
    expect(f.skills).toBe(units.reduce((s, u) => s + u.skills.length, 0));
    expect(f.unitRows[0].free).toBe(true);
    expect(f.unitRows.slice(1).every((u) => !u.free)).toBe(true);
  });
});
