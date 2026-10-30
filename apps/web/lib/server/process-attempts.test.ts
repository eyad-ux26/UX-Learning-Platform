import { describe, expect, it } from "vitest";
import { getLessonVersion } from "@uxgate/content";
import type { TuneStep } from "@uxgate/content/types";
import { processEvents, bodySchema, type AttemptBody } from "./process-attempts";

const lv = getLessonVersion("P01-U01-L01")!;
const tune = lv.body.steps.find((s) => s.id === "S02") as TuneStep;
const wrong = tune.options.find((o) => !tune.answer.includes(o.id))!.id;
const ev = (over: Partial<AttemptBody["events"][number]>): AttemptBody["events"][number] =>
  ({ stepId: "S02", tryNo: 1, kind: "check", answer: { sel: [tune.answer[0]] }, hintsUsed: 0, confidence: null, clientTs: 1000, ...over });
const body = (events: AttemptBody["events"]): AttemptBody => ({ attemptId: "A@1", lessonId: lv.lessonId, hash: lv.hash, startedAt: 1, events });

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
    const r = processEvents(lv.body, body([ev({ answer: { sel: [wrong] }, clientTs: 1 }), ev({ tryNo: 2, hintsUsed: 1, clientTs: 2 })]));
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
    const prior = [{ stepId: "S02", tryNo: 1, kind: "check" as const, answer: { sel: [tune.answer[0]] }, hintsUsed: 0 }];
    expect(processEvents(lv.body, body([ev({})]), prior).results).toHaveLength(0);
  });
  it("rejects steps that are not questions in this lesson", () => {
    const r = processEvents(lv.body, body([ev({ stepId: "S01" }), ev({ stepId: "S99" })]));
    expect(r.rejected).toHaveLength(2);
    expect(r.results).toHaveLength(0);
  });
  it("the lesson is finished only when every question has an outcome", () => {
    const events = lv.body.steps.filter((s) => s.type !== "card").map((s) => {
      const a = s.type === "compare" ? { sel: [s.answer], reason: s.reason?.answer } : { sel: [(s as TuneStep).answer[0]] };
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
