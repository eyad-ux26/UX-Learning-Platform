import { describe, expect, it } from "vitest";
import { getBank, getUnit } from "@uxgate/content";
import { firstTries, missedSkills, pickRound } from "./mastery";

const unit = getUnit("P10-U01")!;
const [s1, s2, s3] = unit.skills.map((k) => k.id);

describe("mastery round rules", () => {
  it("a skill is missed when any first try in the unit was wrong, and comes back until a first try is right", () => {
    const lessons = [
      { lessonId: "L1", stepId: "S1", skillId: s1, correct: false },
      { lessonId: "L2", stepId: "S1", skillId: s2, correct: true },
      { lessonId: "L4", stepId: "S1", skillId: s3, correct: false },
    ];
    expect(missedSkills(unit, lessons, [])).toEqual([s1, s3]);
    expect(missedSkills(unit, lessons, [{ lessonId: "B", stepId: "S1", skillId: s1, correct: false }])).toEqual([s1, s3]);
    expect(missedSkills(unit, lessons, [{ lessonId: "B", stepId: "S1", skillId: s1, correct: true }])).toEqual([s3]);
  });
  it("nothing missed means no round", () => {
    expect(missedSkills(unit, [{ lessonId: "L1", stepId: "S1", skillId: s1, correct: true }], [])).toEqual([]);
  });
  it("brings back one bank step per missed skill, never one the learner already saw while another exists", () => {
    const bank = getBank("P10-U01")!;
    const first = pickRound(bank, [s1, s2], []);
    expect(first.map((s) => s.skill)).toEqual([s1, s2]);
    const second = pickRound(bank, [s1, s2], first.map((s) => s.id));
    expect(second.map((s) => s.skill)).toEqual([s1, s2]);
    expect(second.every((s, k) => s.id !== first[k].id)).toBe(true);
    // Every bank step is a held-back re-test, never a lesson step.
    expect(bank.body.steps.every((s) => s.part === "retest")).toBe(true);
  });
  it("reads the first judged try of each step per attempt, ignoring the main_ok event", () => {
    const rows = [
      { attempt_id: "a", lesson_id: "L1", step_id: "S1", skill_id: s1, try_no: 2, kind: "check", correct: true },
      { attempt_id: "a", lesson_id: "L1", step_id: "S1", skill_id: s1, try_no: 1, kind: "check", correct: false },
      { attempt_id: "a", lesson_id: "L1", step_id: "S1", skill_id: s1, try_no: 0, kind: "main_ok", correct: false },
    ];
    expect(firstTries(rows)).toEqual([{ lessonId: "L1", stepId: "S1", skillId: s1, correct: false }]);
  });
});
