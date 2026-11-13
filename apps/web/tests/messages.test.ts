import { describe, expect, it } from "vitest";
import { messageFiles, messages } from "../messages";

const keys = (o: unknown, prefix = ""): string[] =>
  Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const flat = (o: unknown): string[] => Object.values(o as object).flatMap((v) => (typeof v === "object" ? flat(v) : [String(v)]));

describe("message files", () => {
  it("English and Arabic have exactly the same keys, file by file", () => {
    for (const [file, en] of Object.entries(messageFiles.en)) {
      const ar = messageFiles.ar[file as keyof typeof messageFiles.ar];
      expect(keys(ar).sort(), file).toEqual(keys(en).sort());
    }
  });
  it("every namespace lives in one file only", () => {
    for (const files of [messageFiles.en, messageFiles.ar]) {
      const seen = new Map<string, string>();
      for (const [file, m] of Object.entries(files)) {
        for (const ns of Object.keys(m)) {
          expect(seen.get(ns), `namespace "${ns}" is in ${seen.get(ns)} and ${file}`).toBeUndefined();
          seen.set(ns, file);
        }
      }
    }
  });
  it("no message is empty", () => {
    for (const m of [messages.en, messages.ar]) for (const s of flat(m)) expect(s.trim()).not.toBe("");
  });
  it("reminders and notifications never use loss-framed words", () => {
    const LOSS = /\b(lose|losing|lost|miss out|break your streak|don't break|before it's gone|expire)\b|تخسر|ستفقد|ستخسر|قبل أن تضيع/i;
    const files = (["account", "public", "emails"] as const).flatMap((f) => [messageFiles.en[f], messageFiles.ar[f]]);
    const texts = files.flatMap(flat).filter((s) => !/never send a message about losing|لا نرسل أبدًا رسالة عن خسارة/.test(s));
    for (const s of texts) expect(s, s).not.toMatch(LOSS);
  });
});
