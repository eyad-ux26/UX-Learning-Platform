import { describe, expect, it } from "vitest";
import { getBank, getLessonVersion } from "@uxgate/content/full";
import type { TuneStep } from "@uxgate/content/types";
import { processEvents, bodySchema, type AttemptBody } from "./process-attempts";

const lv = getLessonVersion("P01-U01-L01")!;
const tune = lv.body.steps.find((s) => s.id === "S02") as TuneStep;
const wrong = tune.options.find((o) => !tune.answer.includes(o.id))!.id;
const ev = (over: Partial<AttemptBody["events"][number]>): AttemptBody["events"][number] => ({
  stepId: "S02",
  tryNo: 1,
  kind: "check",
  answer: { sel: [tune.answer[0]] },
  hintsUsed: 0,
  confidence: null,
  clientTs: 1000,
  ...over,
});
const body = (events: AttemptBody["events"]): AttemptBody => ({
  attemptId: "A@1",
  lessonId: lv.lessonId,
  hash: lv.hash,
  startedAt: 1,
  events,
});

describe("processEvents", () => {
  it("scores a right first try as 10 XP and stores it", () => {
    const r = processEvents(lv.body, body([ev({})]));
    expect(r.xp).toEqual([{ step_id: "S02", outcome: "independent", amount: 10 }]);
    expect(r.results[0]).toMatchObject({ correct: true, try_no: 1, idempotency_key: "A@1:S02:1:check" });
  });
  it("ignores a client that claims a wrong answer was right: correctness is recomputed", () => {
    const r = processEvents(lv.body, body([ev({ answer: { sel: [wrong] } })]));
    expect(r.results[0].correct).toBe(false);
    expect(r.xp).toEqual([]);
  });
  it("a wrong try then a right one after a hint is supported, 5 XP", () => {
    const r = processEvents(
      lv.body,
      body([ev({ answer: { sel: [wrong] }, clientTs: 1 }), ev({ tryNo: 2, hintsUsed: 1, clientTs: 2 })]),
    );
    expect(r.xp).toEqual([{ step_id: "S02", outcome: "supported", amount: 5 }]);
  });
  it("scores across requests using events already stored", () => {
    const first = processEvents(lv.body, body([ev({ answer: { sel: [wrong] } })]));
    expect(first.xp).toEqual([]);
    const prior = [{ stepId: "S02", tryNo: 1, kind: "check" as const, answer: { sel: [wrong] }, hintsUsed: 0 }];
    const second = processEvents(lv.body, body([ev({ tryNo: 2, clientTs: 2000 })]), prior);
    expect(second.xp).toEqual([{ step_id: "S02", outcome: "supported", amount: 5 }]);
  });
  it("sending the same event twice stores it once", () => {
    const prior = [
      { stepId: "S02", tryNo: 1, kind: "check" as const, answer: { sel: [tune.answer[0]] }, hintsUsed: 0 },
    ];
    expect(processEvents(lv.body, body([ev({})]), prior).results).toHaveLength(0);
  });
  it("rejects steps that are not questions in this lesson", () => {
    const r = processEvents(lv.body, body([ev({ stepId: "S01" }), ev({ stepId: "S99" })]));
    expect(r.rejected).toHaveLength(2);
    expect(r.results).toHaveLength(0);
  });
  it("the lesson is finished only when every question has an outcome", () => {
    const events = lv.body.steps
      .filter((s) => s.type !== "card")
      .map((s) => {
        const a =
          s.type === "compare" ? { sel: [s.answer], reason: s.reason?.answer } : { sel: [(s as TuneStep).answer[0]] };
        return ev({ stepId: s.id, answer: a });
      });
    expect(processEvents(lv.body, body(events.slice(0, 2))).finished).toBe(false);
    expect(processEvents(lv.body, body(events)).finished).toBe(true);
  });
  it("the request schema rejects oversize or malformed bodies", () => {
    expect(bodySchema.safeParse({ ...body([ev({})]), hash: "short" }).success).toBe(false);
    expect(bodySchema.safeParse(body([ev({ hintsUsed: 9 })])).success).toBe(false);
  });
});

describe("bodySchema purpose", () => {
  const base = {
    attemptId: "r@1760000000000",
    lessonId: "P01-U01-BANK",
    hash: "a".repeat(64),
    startedAt: 1760000000000,
    events: [
      {
        stepId: "s1",
        tryNo: 1,
        kind: "check",
        answer: { sel: ["a"] },
        hintsUsed: 0,
        confidence: null,
        clientTs: 1760000000001,
      },
    ],
  };
  it("a review session says so; anything else is not a purpose", () => {
    expect(bodySchema.safeParse({ ...base, purpose: "review" }).success).toBe(true);
    expect(bodySchema.safeParse(base).success).toBe(true);
    expect(bodySchema.safeParse({ ...base, purpose: "mastery" }).success).toBe(false);
  });
});

describe("bodySchema times", () => {
  const ok = {
    attemptId: "A@1",
    lessonId: lv.lessonId,
    hash: "a".repeat(64),
    startedAt: Date.now(),
    events: [ev({ clientTs: Date.now() })],
  };
  it("accepts real times", () => {
    expect(bodySchema.safeParse(ok).success).toBe(true);
  });
  it("rejects a startedAt that cannot be a date (it used to crash the route with a 500)", () => {
    expect(bodySchema.safeParse({ ...ok, startedAt: 9e15 }).success).toBe(false);
  });
  it("rejects a clientTs far in the future or before the product existed", () => {
    expect(bodySchema.safeParse({ ...ok, events: [ev({ clientTs: 9e15 })] }).success).toBe(false);
    expect(bodySchema.safeParse({ ...ok, events: [ev({ clientTs: 1000 })] }).success).toBe(false);
  });
});

const T0 = 1760000000000;
describe("skill check and mastery round scoring", () => {
  const check = getLessonVersion("P10-U01-L04")!;
  const questions = check.body.steps.filter((s) => s.type !== "card");
  const answerOf = (s: (typeof questions)[number], right: boolean) => {
    if (s.type === "compare")
      return { sel: [right ? s.answer : s.answer === "a" ? "b" : "a"], reason: s.reason?.answer };
    if (s.type === "order") return { sel: right ? s.answer : [...s.answer].reverse() };
    const opts = (s as TuneStep).options.map((o) => o.id);
    return { sel: [right ? (s as TuneStep).answer[0] : opts.find((o) => !(s as TuneStep).answer.includes(o))!] };
  };
  const ev1 = (s: (typeof questions)[number], right: boolean, tryNo = 1) => ({
    stepId: s.id,
    tryNo,
    kind: "check" as const,
    answer: answerOf(s, right),
    hintsUsed: 0,
    confidence: null,
    clientTs: T0 + tryNo,
  });
  const body = (events: ReturnType<typeof ev1>[], plan?: string[]) =>
    bodySchema.parse({
      attemptId: "a@1760000000000",
      lessonId: check.lessonId,
      hash: check.hash,
      startedAt: 1760000000000,
      events,
      plan,
    });

  it("a skill check counts only the first answer: right is 10 XP, wrong is a missed step with 0", () => {
    const [a, b] = questions;
    const r = processEvents(check.body, body([ev1(a, true), ev1(b, false), ev1(b, true, 2)]));
    expect(r.xp.find((x) => x.step_id === a.id)).toEqual({ step_id: a.id, outcome: "independent", amount: 10 });
    expect(r.xp.find((x) => x.step_id === b.id)).toEqual({ step_id: b.id, outcome: "missed", amount: 0 });
  });
  it("a skill check is finished when every question has its one answer", () => {
    expect(processEvents(check.body, body(questions.map((s) => ev1(s, false)))).finished).toBe(true);
    expect(processEvents(check.body, body(questions.slice(1).map((s) => ev1(s, true)))).finished).toBe(false);
  });
  it("a mastery round only asks the steps in its plan, and finishes when those are answered", () => {
    const bank = getBank("P10-U01")!;
    const steps = bank.body.steps.filter((s) => s.type !== "card");
    const plan = [steps[0].id, steps[1].id];
    const ev = (s: (typeof steps)[number], right: boolean) => ({ ...ev1(s as never, right), stepId: s.id });
    const b = bodySchema.parse({
      attemptId: "m@1760000000000",
      lessonId: bank.lessonId,
      hash: bank.hash,
      startedAt: 1760000000000,
      plan,
      events: [ev(steps[0], true)],
    });
    const half = processEvents(bank.body, b, [], plan);
    expect(half.finished).toBe(false);
    expect(half.xp).toEqual([{ step_id: steps[0].id, outcome: "independent", amount: 10 }]);
    const full = processEvents(bank.body, { ...b, events: [ev(steps[0], true), ev(steps[1], false)] }, [], plan);
    expect(full.finished).toBe(true);
    expect(full.xp.map((x) => x.outcome)).toEqual(["independent", "missed"]);
    const stray = processEvents(bank.body, { ...b, events: [ev(steps[2], true)] }, [], plan);
    expect(stray.rejected).toHaveLength(1);
  });
});
