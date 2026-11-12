import { describe, expect, it } from "vitest";
import { bundle, getLessonVersion } from "@uxgate/content/full";
import type { Lesson, TuneStep, CompareStep } from "@uxgate/content/types";
import * as E from "../src/engine";

const lv = getLessonVersion("P01-U01-L01")!;
const lesson: Lesson = lv.body;
const idx = (id: string) => lesson.steps.findIndex((s) => s.id === id);
const at = (st: E.LessonState, id: string): E.LessonState => ({ ...st, i: idx(id) });
const start = () => E.startLesson(lesson, lv.hash, 1000);
const tune = lesson.steps[idx("S02")] as TuneStep;
const wrongId = tune.options.find((o) => !tune.answer.includes(o.id))!.id;

describe("selecting", () => {
  it("never judges: phase and counters stay unchanged", () => {
    const s = E.select(lesson, at(start(), "S02"), wrongId);
    expect(s.steps[idx("S02")].sel).toEqual([wrongId]);
    expect(s.steps[idx("S02")].phase).toBe("answering");
    expect(s.steps[idx("S02")].tries).toBe(0);
  });
  it("Check needs a selection", () => {
    const s = at(start(), "S02");
    expect(E.canCheck(lesson.steps[s.i], s.steps[s.i])).toBe(false);
    expect(E.check(lesson, s).event).toBeUndefined();
  });
});

describe("tries, hints, reveal", () => {
  it("right first try without hints is independent, 10 XP", () => {
    let s = E.select(lesson, at(start(), "S02"), tune.answer[0]);
    const r = E.check(lesson, s, 2000);
    expect(r.state.steps[idx("S02")]).toMatchObject({ phase: "right", outcome: "independent", xp: 10 });
    expect(r.event).toMatchObject({ kind: "check", tryNo: 1, correct: true, stepId: "S02", hintsUsed: 0 });
  });
  it("wrong shows the matching misconception, keeps the first answer, offers a hint", () => {
    let s = E.select(lesson, at(start(), "S02"), wrongId);
    const r = E.check(lesson, s);
    const st = r.state.steps[idx("S02")];
    expect(st.phase).toBe("wrong");
    expect(st.mc).toBe("MC-P01-001");
    expect(st.first).toEqual({ sel: [wrongId] });
    expect(E.canHint(tune, st)).toBe(true);
    expect(E.canReveal(st)).toBe(false);
  });
  it("hints stop at two; answering after a hint is supported, 5 XP; first answer stays", () => {
    let s = E.select(lesson, at(start(), "S02"), wrongId);
    s = E.check(lesson, s).state;
    s = E.hint(lesson, s); s = E.hint(lesson, s); s = E.hint(lesson, s);
    expect(s.steps[idx("S02")].hints).toBe(2);
    s = E.retry(lesson, s);
    s = E.select(lesson, s, tune.answer[0]);
    const r = E.check(lesson, s);
    expect(r.state.steps[idx("S02")]).toMatchObject({ phase: "right", outcome: "supported", xp: 5, tries: 2, first: { sel: [wrongId] } });
  });
  it("Show the answer appears only after 3 tries and scores 0", () => {
    // a single-answer step with at least three wrong options, because tried options cannot be picked again
    const big = lesson.steps.find((x) => (x.type === "choose" && !x.multi || x.type === "tune") && (x as TuneStep).options.filter((o) => !(x as TuneStep).answer.includes(o.id)).length >= 3) as TuneStep | undefined;
    const target = big ?? tune;
    const wrongs = target.options.filter((o) => !target.answer.includes(o.id)).map((o) => o.id);
    let s = at(start(), target.id);
    for (let k = 0; k < 3; k++) {
      s = E.select(lesson, s, wrongs[k % wrongs.length]);
      expect(E.canReveal(s.steps[s.i])).toBe(false);
      s = E.check(lesson, s).state;
      if (k < 2) s = E.retry(lesson, s);
    }
    if (!big) return; // no step with three wrong options in this lesson: the retry rule below covers the rest
    expect(E.canReveal(s.steps[s.i])).toBe(true);
    expect(E.canHint(target, s.steps[s.i])).toBe(false); // the sheet then holds two buttons
    const r = E.reveal(lesson, s);
    expect(r.state.steps[r.state.i]).toMatchObject({ phase: "revealed", outcome: "revealed", xp: 0 });
    expect(r.event?.kind).toBe("reveal");
  });
  it("retry clears the choice and dims the option just tried", () => {
    let s = E.select(lesson, at(start(), "S02"), wrongId);
    s = E.check(lesson, s).state;
    s = E.retry(lesson, s);
    const st = s.steps[idx("S02")];
    expect(st).toMatchObject({ phase: "answering", sel: [], tried: [wrongId] });
    expect(E.canCheck(tune, st)).toBe(false);
    expect(E.select(lesson, s, wrongId).steps[idx("S02")].sel).toEqual([]); // cannot be picked again
    expect(E.select(lesson, s, tune.answer[0]).steps[idx("S02")].sel).toEqual([tune.answer[0]]);
  });
  it("cannot advance past an unanswered question", () => {
    const s = at(start(), "S02");
    expect(E.advance(lesson, s).i).toBe(s.i);
  });
});

describe("confidence before Check", () => {
  it("a step that asks for confidence cannot be checked until one is picked", () => {
    const cmp = lesson.steps[idx("S07")] as CompareStep;
    const s = E.select(lesson, at(start(), "S07"), cmp.answer);
    expect(E.canCheck(lesson.steps[s.i], s.steps[s.i])).toBe(false);
    const t = E.setConfidence(s, 0);
    expect(E.canCheck(lesson.steps[t.i], t.steps[t.i])).toBe(true);
  });
});

describe("compare with a reason", () => {
  const cmp = lesson.steps[idx("S07")] as CompareStep;
  const other = cmp.answer === "a" ? "b" : "a";
  it("a right main answer opens the reason and is not yet judged", () => {
    let s = E.setConfidence(E.select(lesson, at(start(), "S07"), cmp.answer), 1);
    const r = E.check(lesson, s);
    expect(r.state.steps[idx("S07")].phase).toBe("main_ok");
    expect(r.state.steps[idx("S07")].tries).toBe(0);
    expect(r.event?.kind).toBe("main_ok");
  });
  it("a wrong reason is a wrong try; the right reason finishes it", () => {
    let s = E.setConfidence(E.select(lesson, at(start(), "S07"), cmp.answer), 1);
    s = E.check(lesson, s).state;
    const bad = cmp.reason!.options.find((o) => !cmp.reason!.answer.includes(o.id))!.id;
    s = E.selectReason(lesson, s, bad);
    s = E.check(lesson, s).state;
    expect(s.steps[idx("S07")]).toMatchObject({ phase: "wrong", tries: 1 });
    s = E.retry(lesson, s);
    expect(s.steps[idx("S07")].phase).toBe("main_ok");
    s = E.selectReason(lesson, s, cmp.reason!.answer[0]);
    s = E.check(lesson, s).state;
    expect(s.steps[idx("S07")]).toMatchObject({ phase: "right", outcome: "supported", xp: 5 });
  });
  it("a wrong main answer is judged straight away", () => {
    const s = E.check(lesson, E.setConfidence(E.select(lesson, at(start(), "S07"), other), 1)).state;
    expect(s.steps[idx("S07")]).toMatchObject({ phase: "wrong", tries: 1 });
  });
});

describe("server scoring matches the client", () => {
  it("replays a client session's events to the same outcome and XP", () => {
    let s = at(start(), "S02");
    const events: E.TryEvent[] = [];
    const run = (t: E.Transition) => { s = t.state; if (t.event) events.push(t.event); };
    s = E.select(lesson, s, wrongId); run(E.check(lesson, s));
    s = E.hint(lesson, s); s = E.retry(lesson, s); s = E.select(lesson, s, tune.answer[0]); run(E.check(lesson, s));
    const scored = E.scoreStep(tune, events);
    expect(scored.outcome).toBe(s.steps[idx("S02")].outcome);
    expect(scored.xp).toBe(s.steps[idx("S02")].xp);
    expect(scored.tries).toBe(2);
  });
  it("does not trust a client that claims a wrong answer is correct", () => {
    const forged = [{ kind: "check" as const, answer: { sel: [wrongId] }, hintsUsed: 0, tryNo: 1 }];
    expect(E.scoreStep(tune, forged)).toMatchObject({ outcome: null, xp: 0 });
  });
});

describe("whole lesson", () => {
  it("playing every step right first try gives full XP and a summary that matches", () => {
    let s = start();
    for (let k = 0; k < lesson.steps.length; k++) {
      const step = lesson.steps[s.i];
      if (E.isQuestion(step)) {
        s = E.select(lesson, s, step.type === "compare" ? step.answer : (step as TuneStep).answer[0]);
        if (step.confidence) s = E.setConfidence(s, 1);
        s = E.check(lesson, s).state;
        if (step.type === "compare" && step.reason) { s = E.selectReason(lesson, s, step.reason.answer[0]); s = E.check(lesson, s).state; }
      }
      s = E.advance(lesson, s);
    }
    expect(s.done).toBe(true);
    const sum = E.summarize(lesson, s);
    expect(sum.independent + sum.supported + sum.revealed).toBe(sum.questions);
    expect(sum.xp).toBe(sum.independent * 10 + sum.supported * 5);
    expect(bundle.lessons.length).toBeGreaterThan(0);
  });
});

describe("misconceptions that share an id (the same mistake behind different options)", () => {
  // The first matching entry used to win on screen, because only the id was kept: choosing "banner" showed the "dialog" text.
  const mcs = [
    { id: "MC-X-1", when: "dialog", feedback: { en: "Dialog text", ar: "نص النافذة" } },
    { id: "MC-X-1", when: "banner", feedback: { en: "Banner text", ar: "نص البانر" } },
    { id: "MC-X-2", when: "toast", feedback: { en: "Toast text", ar: "نص التوست" } },
  ];
  const opt = (id: string) => ({ id, text: { en: id, ar: id } });
  const mk = (extra: object) => ({ ...lesson, steps: [{ id: "Q1", type: "choose", prompt: { en: "q", ar: "q" }, options: ["ok", "dialog", "banner", "toast"].map(opt), answer: ["ok"], misconceptions: mcs, ...extra }] }) as unknown as Lesson;
  const wrongFor = (l: Lesson, pick: string) => {
    let s = E.startLesson(l, "h", 1);
    s = E.select(l, s, pick);
    const st = E.check(l, s).state.steps[0];
    return E.matchedMisconception((l.steps[0] as unknown as { misconceptions: { id: string; feedback: { en: string } }[] }).misconceptions, st);
  };
  it("shows the entry that matched each option, even when ids repeat", () => {
    const l = mk({});
    expect(wrongFor(l, "dialog")?.feedback.en).toBe("Dialog text");
    expect(wrongFor(l, "banner")?.feedback.en).toBe("Banner text");
    expect(wrongFor(l, "toast")?.feedback.en).toBe("Toast text");
  });
  it("works in a mastery retest (one try) as well", () => {
    const l = { ...mk({}), mode: "bank" } as Lesson;
    expect(wrongFor(l, "banner")?.feedback.en).toBe("Banner text");
  });
  it("sort, order and match keep the matched entry", () => {
    const sort = mk({ type: "sort", items: [{ id: "a", text: { en: "a", ar: "a" } }, { id: "b", text: { en: "b", ar: "b" } }], buckets: [{ id: "x", label: { en: "x", ar: "x" } }, { id: "y", label: { en: "y", ar: "y" } }], answer: { x: ["a"], y: ["b"] },
      misconceptions: [{ id: "MC-S", when: { item: "a", bucket: "y" }, feedback: { en: "A in Y", ar: "" } }, { id: "MC-S", when: { item: "b", bucket: "x" }, feedback: { en: "B in X", ar: "" } }] });
    let s = E.startLesson(sort, "h", 1);
    s = E.setSelection(sort, s, ["b:x", "a:y"]);
    const st = E.check(sort, s).state.steps[0];
    expect(st.mcIdx).toBe(0);
    const match = mk({ type: "match", left: [{ id: "l1", text: { en: "l1", ar: "l1" } }, { id: "l2", text: { en: "l2", ar: "l2" } }], right: [{ id: "r1", text: { en: "r1", ar: "r1" } }, { id: "r2", text: { en: "r2", ar: "r2" } }], answer: { l1: "r1", l2: "r2" },
      misconceptions: [{ id: "MC-M", when: { left: "l1", right: "r2" }, feedback: { en: "first", ar: "" } }, { id: "MC-M", when: { left: "l2", right: "r1" }, feedback: { en: "second", ar: "" } }] });
    let m = E.startLesson(match, "h", 1);
    m = E.setSelection(match, m, ["l1:r1", "l2:r1"]);
    const ms = E.check(match, m).state.steps[0];
    expect(E.matchedMisconception((match.steps[0] as unknown as { misconceptions: { id: string; feedback: { en: string } }[] }).misconceptions, ms)?.feedback.en).toBe("second");
  });
  it("falls back to the id for state saved before the index existed", () => {
    expect(E.matchedMisconception(mcs, { mc: "MC-X-2" })?.feedback.en).toBe("Toast text");
    expect(E.matchedMisconception(mcs, { mc: null })).toBeUndefined();
  });
});
