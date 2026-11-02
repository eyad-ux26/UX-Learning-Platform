import { describe, expect, it } from "vitest";
import { applyReview, applyShown, badgeOf, reviewDue, type SkillRow } from "./skill-state";
import { buildQueue, confidentErrorSkills } from "./review";

const day = (s: string) => new Date(`${s}T10:00:00Z`);
const shown = (at: string): SkillRow => applyShown(undefined, day(at));

describe("skill states", () => {
  it("Shown schedules review 3 days later and gives the blue badge", () => {
    const r = shown("2026-11-02");
    expect(r.state).toBe("shown");
    expect(r.nextReviewAt).toEqual(day("2026-11-05"));
    expect(badgeOf(r.state)).toBe("blue");
  });
  it("never downgrades Kept or resets Shown dates", () => {
    const kept: SkillRow = { state: "kept", shownAt: day("2026-10-01"), keptAt: day("2026-10-05"), nextReviewAt: null };
    expect(applyShown(kept, day("2026-11-02"))).toBe(kept);
    const s = shown("2026-11-02");
    expect(applyShown(s, day("2026-11-03"))).toBe(s);
  });
  it("a right answer 3 or more days later moves it to Kept (gold)", () => {
    const r = applyReview(shown("2026-11-02"), true, day("2026-11-05"));
    expect(r.state).toBe("kept");
    expect(badgeOf(r.state)).toBe("gold");
  });
  it("a right answer before the date changes nothing", () => {
    const s = shown("2026-11-02");
    expect(applyReview(s, true, day("2026-11-04"))).toBe(s);
    expect(reviewDue(s, day("2026-11-04"))).toBe(false);
  });
  it("a miss keeps it Shown and brings it back tomorrow", () => {
    const r = applyReview(shown("2026-11-02"), false, day("2026-11-06"));
    expect(r.state).toBe("shown");
    expect(r.nextReviewAt).toEqual(day("2026-11-07"));
  });
  it("a Practiced skill is not reviewed", () => {
    expect(reviewDue({ state: "practiced", nextReviewAt: null }, day("2026-11-09"))).toBe(false);
  });
});

describe("review queue", () => {
  const row = (skillId: string, pathId: string, at: string) => ({ skillId, pathId, ...shown(at) });
  it("puts confident errors first, then the longest waiting, and labels each with its path", () => {
    const q = buildQueue(
      [row("SK-P01-U01-01", "P01", "2026-10-20"), row("SK-P10-U01-02", "P10", "2026-10-25"), row("SK-P01-U01-03", "P01", "2026-10-22"), row("SK-P10-U01-04", "P10", "2026-11-01")],
      new Set(["SK-P10-U01-02"]), day("2026-11-03"),
    );
    expect(q.map((x) => x.skillId)).toEqual(["SK-P10-U01-02", "SK-P01-U01-01", "SK-P01-U01-03"]); // the last one is not due until 11-04
    expect(q.map((x) => x.pathId)).toEqual(["P10", "P01", "P01"]);
    expect(q[0].confidentError).toBe(true);
  });
  it("finds confident errors: Sure and wrong, with no right answer after", () => {
    const set = confidentErrorSkills([
      { skillId: "a", correct: false, confidence: 2, at: 1 },
      { skillId: "b", correct: false, confidence: 2, at: 1 }, { skillId: "b", correct: true, confidence: 2, at: 2 },
      { skillId: "c", correct: false, confidence: 0, at: 1 },
    ]);
    expect([...set]).toEqual(["a"]);
  });
});
