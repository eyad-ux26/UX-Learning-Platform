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
});
