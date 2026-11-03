import { describe, expect, it } from "vitest";
import { getBank, getUnit } from "@uxgate/content";
import { firstTries, missedSkills, pickRound, unresolvedSkills } from "./mastery";

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
  it("gives each missed skill up to 2 fresh bank steps, never one already answered, and stops when none are left", () => {
    const bank = getBank("P10-U01")!;
    const first = pickRound(bank, [s1, s2], []);
    expect(first.filter((s) => s.skill === s1)).toHaveLength(2);
    expect(first.filter((s) => s.skill === s2)).toHaveLength(2);
    const second = pickRound(bank, [s1, s2], first.map((s) => s.id));
    expect(second.every((s) => !first.some((f) => f.id === s.id))).toBe(true);
    const all = bank.body.steps.map((s) => s.id);
    expect(pickRound(bank, [s1, s2], all)).toEqual([]);
    // Every bank step is a held-back re-test, never a lesson step.
    expect(bank.body.steps.every((s) => s.part === "retest")).toBe(true);
  });
  it("after 2 wrong mastery answers a skill stays Practiced and stops coming back", () => {
    const lessons = [{ lessonId: "L1", stepId: "S1", skillId: s1, correct: false }];
    const wrong = (stepId: string) => ({ lessonId: "B", stepId, skillId: s1, correct: false });
    expect(missedSkills(unit, lessons, [wrong("B1")])).toEqual([s1]);
    expect(missedSkills(unit, lessons, [wrong("B1"), wrong("B2")])).toEqual([]);
  });
  it("tells apart a unit with nothing missed from one whose missed skills have no round left", () => {
    const lessons = [{ lessonId: "L1", stepId: "S1", skillId: s1, correct: false }];
    const wrong = (stepId: string) => ({ lessonId: "B", stepId, skillId: s1, correct: false });
    expect(unresolvedSkills(unit, [{ ...lessons[0], correct: true }], [])).toEqual([]);
    expect(missedSkills(unit, lessons, [wrong("B1"), wrong("B2")])).toEqual([]);
    expect(unresolvedSkills(unit, lessons, [wrong("B1"), wrong("B2")])).toEqual([s1]);
    expect(unresolvedSkills(unit, lessons, [{ ...wrong("B1"), correct: true }])).toEqual([]);
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
