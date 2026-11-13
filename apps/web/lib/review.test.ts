import { describe, expect, it } from "vitest";
import { pickReviewSteps, reviewPlanOk, sessionSkills, REVIEW_SESSION_MAX, type ReviewItem } from "./review";

const item = (skillId: string, confidentError = false): ReviewItem => ({
  skillId,
  pathId: skillId.slice(3, 6),
  confidentError,
  dueAt: new Date(0),
});
const unitOf = (id: string) => id.match(/P\d{2}-U\d{2}/)?.[0];

describe("review session", () => {
  it("covers the unit of the first queued skill, with that unit's due skills in queue order", () => {
    const q = [item("SK-P10-U02-03", true), item("SK-P01-U01-01"), item("SK-P10-U02-01"), item("SK-P01-U01-02")];
    expect(sessionSkills(q, unitOf)).toEqual({ unitId: "P10-U02", skills: ["SK-P10-U02-03", "SK-P10-U02-01"] });
  });
  it("is null when nothing is due and never longer than the cap", () => {
    expect(sessionSkills([], unitOf)).toBeNull();
    const many = Array.from({ length: 9 }, (_, i) => item(`SK-P01-U01-0${i + 1}`));
    expect(sessionSkills(many, unitOf)!.skills).toHaveLength(REVIEW_SESSION_MAX);
  });
  it("asks one new case per skill, and the oldest seen case once every case was seen", () => {
    const bank = [
      { id: "R1", skill: "A" },
      { id: "R2", skill: "A" },
      { id: "R3", skill: "B" },
      { id: "R4", skill: "B" },
      { id: "R5", skill: "C" },
    ];
    const seen = new Map([
      ["R1", 10],
      ["R3", 30],
      ["R4", 20],
      ["R5", 5],
    ]);
    expect(pickReviewSteps(bank, ["A", "B", "C", "D"], seen).map((s) => s.id)).toEqual(["R2", "R4", "R5"]);
  });
});

describe("reviewPlanOk (#141)", () => {
  const bank = [
    { id: "a1", skill: "A" },
    { id: "a2", skill: "A" },
    { id: "b1", skill: "B" },
    { id: "c1", skill: "C" },
  ];
  const due = new Set(["A", "B"]);
  it("takes unseen cases of due skills, one per skill", () => {
    expect(reviewPlanOk(["a2", "b1"], bank, due, new Map([["a1", 1]]))).toBe(true);
  });
  it("refuses a case already answered while an unseen one of that skill is left", () => {
    expect(reviewPlanOk(["a1"], bank, due, new Map([["a1", 1]]))).toBe(false);
  });
  it("accepts a seen case once every case of the skill was answered", () => {
    expect(reviewPlanOk(["b1"], bank, due, new Map([["b1", 1]]))).toBe(true);
  });
  it("refuses skills that are not due, two cases of one skill, or unknown steps", () => {
    expect(reviewPlanOk(["c1"], bank, due, new Map())).toBe(false);
    expect(reviewPlanOk(["a1", "a2"], bank, due, new Map())).toBe(false);
    expect(reviewPlanOk(["zz"], bank, due, new Map())).toBe(false);
  });
});
