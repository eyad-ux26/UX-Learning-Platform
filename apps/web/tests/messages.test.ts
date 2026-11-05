import { describe, expect, it } from "vitest";
import enBase from "../messages/en.json";
import arBase from "../messages/ar.json";
import { slice4 } from "../messages/s4";

const en = { ...enBase, ...slice4.en };
const ar = { ...arBase, ...slice4.ar };

const keys = (o: unknown, prefix = ""): string[] =>
  Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const flat = (o: unknown): string[] => Object.values(o as object).flatMap((v) => (typeof v === "object" ? flat(v) : [String(v)]));

describe("message files", () => {
  it("English and Arabic have exactly the same keys", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
  it("no message is empty", () => {
    for (const m of [en, ar]) for (const k of keys(m)) expect(k.length).toBeGreaterThan(0);
    for (const m of [en, ar]) for (const s of flat(m)) expect(s.trim()).not.toBe("");
  });
  it("slice 4 files add namespaces and never replace one from the main files", () => {
    for (const ns of Object.keys(slice4.en)) expect(Object.keys(enBase)).not.toContain(ns);
    for (const ns of Object.keys(slice4.ar)) expect(Object.keys(arBase)).not.toContain(ns);
  });
  it("reminders and notifications never use loss-framed words", () => {
    const LOSS = /\b(lose|losing|lost|miss out|break your streak|don't break|before it's gone|expire)\b|تخسر|ستفقد|ستخسر|قبل أن تضيع/i;
    const s4 = [...flat(slice4.en), ...flat(slice4.ar)].filter((s) => !/never send a message about losing|لا نرسل أبدًا رسالة عن خسارة/.test(s));
    for (const s of s4) expect(s, s).not.toMatch(LOSS);
  });
});
