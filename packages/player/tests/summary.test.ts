import { describe, expect, it } from "vitest";
import type { CardStep } from "@uxgate/content/types";
import { readSummary } from "../src/ui/VideoSummary";

const step = (en: string, ar: string, icons?: string[]): CardStep => ({ id: "S03", type: "card", part: "concept", title: { en: "Video summary", ar: "ملخص الفيديو" }, body: { en, ar }, icons } as CardStep);

describe("readSummary", () => {
  const s = step(
    "A **modal dialog** blocks the screen.\n\n- **A warning before a mistake:** like deleting.\n- **A short task of several steps** that fits inside one dialog.\n- **Not during checkout:** it hurts.",
    "الـ **Modal dialog** يحجب الشاشة.\n\n- **تحذير قبل خطأ:** مثل الحذف.\n- **مهمة قصيرة من عدة خطوات** تكفيها نافذة واحدة.\n- **لا تستخدمه أثناء الدفع:** يضرّهم.",
    ["warn", "list", "clock"],
  );
  it("splits the intro and the points, and groups the Not points on the English text", () => {
    const en = readSummary(s, "en")!;
    expect(en.intro).toEqual(["A **modal dialog** blocks the screen."]);
    expect(en.points.map((p) => [p.title, p.text, p.not, p.icon])).toEqual([
      ["A warning before a mistake", "Like deleting.", false, "warning"],
      ["A short task of several steps", "That fits inside one dialog.", false, "list-bullets"],
      ["Not during checkout", "It hurts.", true, "clock"],
    ]);
    expect(readSummary(s, "ar")!.points.map((p) => p.not)).toEqual([false, false, true]);
  });
  it("falls back to check and x icons, and skips cards without a list", () => {
    const plain = step("Intro.\n\n- **One:** a.\n- **Not two:** b.", "مقدمة.\n\n- **واحد:** أ.\n- **لا اثنان:** ب.");
    expect(readSummary(plain, "en")!.points.map((p) => p.icon)).toEqual(["check-circle-fill", "x-circle-fill"]);
    expect(readSummary(step("Just a paragraph.", "فقرة فقط."), "en")).toBeNull();
  });
});
