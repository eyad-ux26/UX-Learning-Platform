import { describe, expect, it } from "vitest";
import { buildPathView } from "./learning";
import { upNextOf } from "./up-next";
import { content } from "@uxgate/content";

const view = buildPathView("P01", { finishedLessons: [], startedLessons: [], xpByLesson: {} }, new Set())!;
const all = view.units.flatMap((u) => u.lessons);

describe("upNextOf", () => {
  it("points to the following lesson in the same unit", () => {
    const n = upNextOf(view, all[0].lesson.lessonId)!;
    expect(n.lessonId).toBe(all[1].lesson.lessonId);
    expect(n.newUnit).toBe(false);
    expect(n.unitNo).toBe(1);
  });
  it("crosses into the next unit after its last lesson", () => {
    const lastOfU1 = view.units[0].lessons.at(-1)!.lesson.lessonId;
    const n = upNextOf(view, lastOfU1)!;
    expect(n.newUnit).toBe(true);
    expect(n.unitNo).toBe(2);
    expect(n.lessonNo).toBe(1);
  });
  it("is null at the end of the path or for a lesson that is not in it", () => {
    expect(upNextOf(view, all.at(-1)!.lesson.lessonId)).toBeNull();
    expect(upNextOf(view, content.lessons.find((l) => l.pathId !== "P01")!.lessonId)).toBeNull();
  });
  it("revise: a replay goes on to the next finished lesson of the same unit, never to the skill check", () => {
    const u1 = view.units[0].lessons;
    const ids = u1.map((l) => l.lesson.lessonId);
    const doneView = buildPathView("P01", { finishedLessons: ids, startedLessons: ids, xpByLesson: {} }, new Set())!;
    const d1 = doneView.units[0].lessons;
    expect(upNextOf(doneView, d1[0].lesson.lessonId)!.revise).toBe(true);
    const lastLesson = d1.filter((l) => l.lesson.body.mode !== "check").at(-1)!;
    const after = upNextOf(doneView, lastLesson.lesson.lessonId)!;
    expect(after.revise).toBe(false);
    // Not finished yet: a first play leads on as before, and it is not a revise.
    expect(upNextOf(view, all[0].lesson.lessonId)!.revise).toBe(false);
  });
});
