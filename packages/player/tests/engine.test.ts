import { describe, expect, it } from "vitest";
import { bundle, getLessonVersion } from "@uxgate/content";
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
    s = E.retry(s);
    s = E.select(lesson, s, tune.answer[0]);
    const r = E.check(lesson, s);
    expect(r.state.steps[idx("S02")]).toMatchObject({ phase: "right", outcome: "supported", xp: 5, tries: 2, first: { sel: [wrongId] } });
  });
  it("Show the answer appears only after 3 tries and scores 0", () => {
    let s = at(start(), "S02");
    for (let k = 0; k < 3; k++) {
      s = E.select(lesson, s, wrongId);
      expect(E.canReveal(s.steps[s.i])).toBe(false);
      s = E.check(lesson, s).state;
      if (k < 2) s = E.retry(s);
    }
    expect(E.canReveal(s.steps[s.i])).toBe(true);
    const r = E.reveal(lesson, s);
    expect(r.state.steps[idx("S02")]).toMatchObject({ phase: "revealed", outcome: "revealed", xp: 0 });
    expect(r.event?.kind).toBe("reveal");
  });
  it("cannot advance past an unanswered question", () => {
    const s = at(start(), "S02");
    expect(E.advance(lesson, s).i).toBe(s.i);
  });
});

describe("compare with a reason", () => {
  const cmp = lesson.steps[idx("S07")] as CompareStep;
  const other = cmp.answer === "a" ? "b" : "a";
  it("a right main answer opens the reason and is not yet judged", () => {
    let s = E.select(lesson, at(start(), "S07"), cmp.answer);
    const r = E.check(lesson, s);
    expect(r.state.steps[idx("S07")].phase).toBe("main_ok");
    expect(r.state.steps[idx("S07")].tries).toBe(0);
    expect(r.event?.kind).toBe("main_ok");
  });
  it("a wrong reason is a wrong try; the right reason finishes it", () => {
    let s = E.select(lesson, at(start(), "S07"), cmp.answer);
    s = E.check(lesson, s).state;
    const bad = cmp.reason!.options.find((o) => !cmp.reason!.answer.includes(o.id))!.id;
    s = E.selectReason(lesson, s, bad);
    s = E.check(lesson, s).state;
    expect(s.steps[idx("S07")]).toMatchObject({ phase: "wrong", tries: 1 });
    s = E.retry(s);
    expect(s.steps[idx("S07")].phase).toBe("main_ok");
    s = E.selectReason(lesson, s, cmp.reason!.answer[0]);
    s = E.check(lesson, s).state;
    expect(s.steps[idx("S07")]).toMatchObject({ phase: "right", outcome: "supported", xp: 5 });
  });
  it("a wrong main answer is judged straight away", () => {
    const s = E.check(lesson, E.select(lesson, at(start(), "S07"), other)).state;
    expect(s.steps[idx("S07")]).toMatchObject({ phase: "wrong", tries: 1 });
  });
});

describe("server scoring matches the client", () => {
  it("replays a client session's events to the same outcome and XP", () => {
    let s = at(start(), "S02");
    const events: E.TryEvent[] = [];
    const run = (t: E.Transition) => { s = t.state; if (t.event) events.push(t.event); };
    s = E.select(lesson, s, wrongId); run(E.check(lesson, s));
    s = E.hint(lesson, s); s = E.retry(s); s = E.select(lesson, s, tune.answer[0]); run(E.check(lesson, s));
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
