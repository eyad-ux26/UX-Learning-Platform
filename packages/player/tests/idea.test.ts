import { describe, expect, it } from "vitest";
import type { CardStep } from "@uxgate/content/types";
import { readIdea, splitItems } from "../src/ui/idea";

const card = (en: string, ar: string, extra: Partial<CardStep> = {}): CardStep => ({ id: "S03", type: "card", part: "concept", title: { en: "T", ar: "ع" }, body: { en, ar }, ...extra } as CardStep);

describe("readIdea", () => {
  it("reads the intro, the points and the icons", () => {
    const s = card("Ask the problem first.\n\n- **AI is better for:** suggestions.\n- **A rule is better for:** fixed things.", "ابدأ بالمشكلة.\n\n- **الذكاء أفضل في:** الاقتراحات.\n- **القاعدة أفضل في:** الثابت.", { icons: ["target", "idea"] });
    const i = readIdea(s, "en")!;
    expect(i.lead).toEqual(["Ask the problem first."]);
    expect(i.points.map((p) => [p.title, p.text, p.icon])).toEqual([["AI is better for", "Suggestions.", "target"], ["A rule is better for", "Fixed things.", "lightbulb"]]);
    expect(readIdea(s, "ar")!.points.length).toBe(2);
  });
  it("uses numbers when there are fewer icons than points", () => {
    const s = card("Intro.\n\n- **A:** a.\n- **B:** b.\n- **C:** c.", "م.\n\n- **أ:** أ.\n- **ب:** ب.\n- **ج:** ج.", { icons: ["ok", "eye"] });
    expect(readIdea(s, "en")!.points.map((p) => p.icon)).toEqual([null, null, null]);
  });
  it("reads topic cards with a term chip and a What to do list", () => {
    const s = card("**Made-up facts (Hallucinations).** AI predicts words.\n- Check every fact.\n\n**Easy agreement (Sycophancy).** AI agrees.\n- Start a new chat.\n- Ask again.", "x\n- y");
    const i = readIdea(s, "en")!;
    expect(i.topics).toEqual([
      { title: "Made-up facts", term: "Hallucinations", text: "AI predicts words.", items: ["Check every fact."] },
      { title: "Easy agreement", term: "Sycophancy", text: "AI agrees.", items: ["Start a new chat.", "Ask again."] },
    ]);
  });
  it("reads scales, closing notes and the next row", () => {
    const s = card("Tone is a scale:\n\n- **Formal ↔ casual**\n- **Respectful ↔ irreverent** (teasing or mocking)\n\nCasual is not funny.\n\nNext lesson: containers.", "x");
    const i = readIdea(s, "en")!;
    expect(i.scales).toEqual([{ a: "Formal", b: "casual", note: "" }, { a: "Respectful", b: "irreverent", note: "teasing or mocking" }]);
    expect(i.notes).toEqual(["Casual is not funny."]);
    expect(i.next).toBe("containers.");
  });
  it("marks recaps, and groups Not points on the English text", () => {
    const r = readIdea(card("- **Gaps:** you fixed it.\n- **Not far:** kept.\n\nNext: the skill check.", "- **فجوات:** أصلحت.\n- **لا بعيد:** أبقيت.\n\nالتالي: اختبار.", { part: "recap" }), "ar")!;
    expect(r.recap).toBe(true);
    expect(r.points.map((p) => p.not)).toEqual([false, true]);
    expect(r.next).toBe("اختبار.");
  });
  it("lays out layout: compare as two sides and rule strips", () => {
    const s = card("Which one?\n\n- **AI is better for:** suggestions that differ, predicting what is next (like search), and faces.\n- **A rule is better for:** fixed places, and exact reasons.\n- **Simpler wins ties:** a rule is easier.", "x", { layout: "compare" });
    const i = readIdea(s, "en")!;
    expect(i.sides!.map((x) => x.items)).toEqual([["Suggestions that differ", "Predicting what is next (like search)", "Faces"], ["Fixed places", "Exact reasons"]]);
    expect(i.rules.map((r) => r.title)).toEqual(["Simpler wins ties"]);
    expect(i.points).toEqual([]);
  });
  it("leaves cards with a mock alone and returns the paragraphs of a hook", () => {
    expect(readIdea(card("A.", "ا", { mock: { blocks: [] } as never }), "en")).toBeNull();
    expect(readIdea(card("One.\n\nTwo.", "ا"), "en")!.lead).toEqual(["One.", "Two."]);
  });
  it("splits at commas outside brackets", () => {
    expect(splitItems("a (b, c), d, e")).toEqual(["a (b, c)", "d", "e"]);
  });
});
