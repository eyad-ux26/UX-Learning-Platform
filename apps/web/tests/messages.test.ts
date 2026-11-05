import { describe, expect, it } from "vitest";
import en from "../messages/en.json";
import ar from "../messages/ar.json";

const keys = (o: unknown, prefix = ""): string[] =>
  Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe("message files", () => {
  it("English and Arabic have exactly the same keys", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
  it("no message is empty", () => {
    for (const m of [en, ar]) for (const k of keys(m)) expect(k.length).toBeGreaterThan(0);
    const flat = (o: unknown): string[] => Object.values(o as object).flatMap((v) => (typeof v === "object" ? flat(v) : [String(v)]));
    for (const m of [en, ar]) for (const s of flat(m)) expect(s.trim()).not.toBe("");
  });
});
