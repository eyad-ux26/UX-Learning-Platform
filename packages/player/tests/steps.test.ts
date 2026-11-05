import { describe, expect, it } from "vitest";
import type { Lesson, MatchStep, OrderStep, SortStep, SpotStep, Step } from "@uxgate/content/types";
import * as E from "../src/engine";

const T = (en: string) => ({ en, ar: en });
const base = { part: "guided", skill: "SK-X", prompt: T("p"), correct: T("ok"), explain: T("why"), hints: [T("h1"), T("h2")] };

const sort: SortStep = { ...base, id: "S01", type: "sort", items: [{ id: "a", text: T("a") }, { id: "b", text: T("b") }, { id: "c", text: T("c") }],
  buckets: [{ id: "x", title: T("x") }, { id: "y", title: T("y") }], answer: { x: ["a", "b"], y: ["c"] },
  misconceptions: [{ id: "MC-1", when: { item: "c", bucket: "x" } as never, feedback: T("c is a y") }] };
const order: OrderStep = { ...base, id: "S02", type: "order", items: [{ id: "p", text: T("p") }, { id: "q", text: T("q") }, { id: "r", text: T("r") }], answer: ["p", "q", "r"],
  also_ok: [{ answer: ["r", "q", "p"], feedback: T("reverse works") }], misconceptions: [{ id: "MC-2", when: { before: ["q", "p"] } as never, feedback: T("p leads") }] };
const match: MatchStep = { ...base, id: "S03", type: "match", left: [{ id: "l1", text: T("l1") }, { id: "l2", text: T("l2") }], right: [{ id: "r1", text: T("r1") }, { id: "r2", text: T("r2") }], answer: { l1: "r1", l2: "r2" },
  misconceptions: [{ id: "MC-3", when: { left: "l1", right: "r2" } as never, feedback: T("swapped") }] };
const spot: SpotStep = { ...base, id: "S04", type: "spot", mock: { blocks: [{ kind: "button", text: "Go", region: "btn" }] }, regions: [{ id: "btn", label: T("Button") }, { id: "ttl", label: T("Title") }], answer: ["btn"] };
const words = { ...base, id: "S05", type: "words", options: [{ id: "o1", text: T("one") }, { id: "o2", text: T("two") }], answer: ["o1"] } as Step;

const mk = (mode: Lesson["mode"], steps: Step[]): Lesson => ({ id: "L-T", mode, minutes: 5, title: T("t"), steps });
const run = (lesson: Lesson, i: number, sel: string[]) => {
  let s: E.LessonState = { ...E.startLesson(lesson, "h"), i };
  s = E.isStructured(lesson.steps[i]) ? E.setSelection(lesson, s, sel) : sel.reduce((acc, id) => E.select(lesson, acc, id), s);
  return E.check(lesson, s);
};

describe("evaluate for the new step types", () => {
  it("sort is right only when every item is in its bucket; a misconception matches the item and bucket", () => {
    expect(E.evaluate(sort, { sel: ["a:x", "b:x", "c:y"] }).correct).toBe(true);
    const bad = E.evaluate(sort, { sel: ["a:x", "b:x", "c:x"] });
    expect(bad.correct).toBe(false);
    expect(bad.misconception?.id).toBe("MC-1");
    expect(E.evaluate(sort, { sel: ["a:x", "b:x"] }).correct).toBe(false);
  });
  it("order compares the full order, accepts also_ok with its own feedback, and matches 'before'", () => {
    expect(E.evaluate(order, { sel: ["p", "q", "r"] }).correct).toBe(true);
    const alt = E.evaluate(order, { sel: ["r", "q", "p"] });
    expect(alt.correct).toBe(true);
    expect(alt.alsoOk?.en).toBe("reverse works");
    const bad = E.evaluate(order, { sel: ["q", "p", "r"] });
    expect(bad.correct).toBe(false);
    expect(bad.misconception?.id).toBe("MC-2");
  });
  it("match checks each pair", () => {
    expect(E.evaluate(match, { sel: ["l1:r1", "l2:r2"] }).correct).toBe(true);
    const bad = E.evaluate(match, { sel: ["l1:r2", "l2:r1"] });
    expect(bad.correct).toBe(false);
    expect(bad.misconception?.id).toBe("MC-3");
  });
  it("spot and words behave like a single pick", () => {
    expect(E.evaluate(spot, { sel: ["btn"] }).correct).toBe(true);
    expect(E.evaluate(spot, { sel: ["ttl"] }).correct).toBe(false);
    expect(E.evaluate(words as never, { sel: ["o1"] }).correct).toBe(true);
  });
});

describe("structured steps", () => {
  const lesson = mk("lesson", [sort, order, match, spot, words]);
  it("selecting options is ignored on sort/order/match; setSelection never judges", () => {
    const s = { ...E.startLesson(lesson, "h"), i: 0 };
    expect(E.select(lesson, s, "a")).toBe(s);
    const t = E.setSelection(lesson, s, ["a:x"]);
    expect(t.steps[0].phase).toBe("answering");
    expect(E.canCheck(lesson.steps[0], t.steps[0])).toBe(false); // not every item is placed yet
    expect(E.canCheck(lesson.steps[0], E.setSelection(lesson, s, ["a:x", "b:x", "c:y"]).steps[0])).toBe(true);
  });
  it("an order step starts in its given order and Check is available at once", () => {
    const s = { ...E.startLesson(lesson, "h"), i: 1 };
    expect(s.steps[1].sel).toEqual(["p", "q", "r"]);
    expect(E.canCheck(lesson.steps[1], s.steps[1])).toBe(true);
  });
  it("a wrong order keeps its order on Try again; a wrong sort starts clean", () => {
    const wrongOrder = run(lesson, 1, []);
    const o = E.setSelection(lesson, { ...E.startLesson(lesson, "h"), i: 1 }, ["q", "p", "r"]);
    const chk = E.check(lesson, o).state;
    expect(chk.steps[1].phase).toBe("wrong");
    expect(E.retry(lesson, chk).steps[1].sel).toEqual(["q", "p", "r"]);
    void wrongOrder;
    const so = E.check(lesson, E.setSelection(lesson, { ...E.startLesson(lesson, "h"), i: 0 }, ["a:y", "b:x", "c:y"])).state;
    expect(E.retry(lesson, so).steps[0].sel).toEqual([]);
  });
});

describe("skill check", () => {
  const lesson = mk("check", [words, spot]);
  it("takes the answer without a verdict, allows no hint or retry, and the first answer is final", () => {
    const r = run(lesson, 0, ["o2"]);
    expect(r.state.steps[0]).toMatchObject({ phase: "saved", outcome: "missed", xp: 0 });
    expect(r.event).toMatchObject({ kind: "check", correct: false, tryNo: 1 });
    expect(E.canHint(lesson.steps[0], r.state.steps[0], lesson)).toBe(false);
    expect(E.isFinished(lesson.steps[0], r.state.steps[0])).toBe(true);
    expect(E.retry(lesson, r.state)).toBe(r.state);
  });
  it("a right answer is independent, 10 XP, still with no verdict phase", () => {
    expect(run(lesson, 0, ["o1"]).state.steps[0]).toMatchObject({ phase: "saved", outcome: "independent", xp: 10 });
  });
  it("scores on the server from the first answer only", () => {
    const events = [
      { kind: "check" as const, answer: { sel: ["o2"] }, hintsUsed: 0, tryNo: 1 },
      { kind: "check" as const, answer: { sel: ["o1"] }, hintsUsed: 0, tryNo: 2 },
    ];
    expect(E.scoreStep(words as never, events, true)).toMatchObject({ outcome: "missed", xp: 0 });
    expect(E.scoreStep(words as never, events.slice(1), true)).toMatchObject({ outcome: "independent", xp: 10 });
  });
});

describe("mastery round", () => {
  const lesson = mk("bank", [words, match]);
  it("a wrong answer shows a verdict, ends the step with 0 XP and offers no hint or retry", () => {
    const r = run(lesson, 0, ["o2"]);
    expect(r.state.steps[0]).toMatchObject({ phase: "missed", outcome: "missed", xp: 0 });
    expect(E.canHint(lesson.steps[0], r.state.steps[0], lesson)).toBe(false);
    expect(E.isFinished(lesson.steps[0], r.state.steps[0])).toBe(true);
  });
  it("a right answer pays 10 XP", () => {
    expect(run(lesson, 0, ["o1"]).state.steps[0]).toMatchObject({ phase: "right", outcome: "independent", xp: 10 });
  });
});
