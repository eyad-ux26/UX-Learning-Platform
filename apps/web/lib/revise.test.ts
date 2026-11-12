import { describe, expect, it } from "vitest";
import { buildPathView } from "./learning";
import { canRevise, reviseLessons, reviseNext, reviseResume } from "./revise";

const empty = buildPathView("P01", { finishedLessons: [], startedLessons: [], xpByLesson: {} }, new Set())!;
const u1 = empty.units[0].lessons.map((l) => l.lesson.lessonId);
const checkId = empty.units[0].lessons.find((l) => l.lesson.body.mode === "check")!.lesson.lessonId;
const lessonsU1 = u1.filter((id) => id !== checkId);

describe("revise a unit", () => {
  it("opens once a lesson of the unit is finished, never on a locked unit", () => {
    expect(canRevise(empty.units[0])).toBe(false);
    const v = buildPathView("P01", { finishedLessons: [u1[0]], startedLessons: [], xpByLesson: {} }, new Set())!;
    expect(canRevise(v.units[0])).toBe(true);
    expect(canRevise(v.units[1])).toBe(false);
  });

  it("goes through the finished lessons in order and ends with the skill check as practice", () => {
    const v = buildPathView("P01", { finishedLessons: u1, startedLessons: [], xpByLesson: {} }, new Set())!;
    const first = reviseNext(v, u1[0])!;
    expect(first.lessonId).toBe(u1[1]);
    expect(first.revise).toBe(true);
    expect(first.newUnit).toBe(false);
    const lastLesson = lessonsU1.at(-1)!;
    expect(reviseNext(v, lastLesson)?.lessonId).toBe(checkId);
    // The switch off: revising ends after the last lesson.
    expect(reviseNext(v, lastLesson, false)).toBeNull();
    expect(reviseLessons(v.units[0], false).map((l) => l.lesson.lessonId)).toEqual(lessonsU1);
    // Never runs into the next unit.
    expect(reviseNext(v, u1.at(-1)!)).toBeNull();
  });

  it("hands over to the next new lesson in the current unit, as a normal play", () => {
    const v = buildPathView("P01", { finishedLessons: [u1[0]], startedLessons: [], xpByLesson: {} }, new Set())!;
    const n = reviseNext(v, u1[0])!;
    expect(n.lessonId).toBe(u1[1]);
    expect(n.revise).toBe(false);
  });

  it("resumes only a lesson of the same unit that can still be revised", () => {
    const v = buildPathView("P01", { finishedLessons: u1, startedLessons: [], xpByLesson: {} }, new Set())!;
    const u = v.units[0];
    expect(reviseResume(u, `${u.unit.id}~${u1[1]}`)?.lesson.lessonId).toBe(u1[1]);
    expect(reviseResume(u, `${v.units[1].unit.id}~${u1[1]}`)).toBeNull();
    expect(reviseResume(u, undefined)).toBeNull();
  });
});
