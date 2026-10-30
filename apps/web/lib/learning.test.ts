import { describe, expect, it } from "vitest";
import type { Bundle } from "@uxgate/content";
import { buildPathView, pickPath } from "./learning";

const t = (s: string) => ({ en: s, ar: s });
const lesson = (lessonId: string, unitId: string, order: number) => ({ lessonId, unitId, pathId: "P1", order, mode: "lesson", minutes: 5, hash: "h", body: {} as never });
const b = {
  paths: [{ id: "P0", title: t("Empty"), subtitle: t("") }, { id: "P1", title: t("One"), subtitle: t("") }],
  units: [
    { id: "U1", pathId: "P1", title: t("u1"), skill: t(""), free: true, skills: [{ id: "S1", title: t(""), can_do: t("") }], lessons: ["L1", "L2"] },
    { id: "U2", pathId: "P1", title: t("u2"), skill: t(""), free: false, skills: [], lessons: ["L3"] },
  ],
  lessons: [lesson("L2", "U1", 2), lesson("L1", "U1", 1), lesson("L3", "U2", 1)],
} as unknown as Bundle;

describe("pickPath", () => {
  it("skips paths without lessons", () => expect(pickPath(null, b)?.id).toBe("P1"));
  it("honours a recommendation that has content", () => expect(pickPath("P1", b)?.id).toBe("P1"));
  it("ignores a recommendation with no content", () => expect(pickPath("P0", b)?.id).toBe("P1"));
});

describe("buildPathView", () => {
  const none = { finishedLessons: [], startedLessons: [], xpByLesson: {} };
  it("opens the first lesson for a new learner", () => {
    const v = buildPathView("P1", none, new Set(), b)!;
    expect(v.next?.lesson.lessonId).toBe("L1");
    expect(v.units[0].lessons.map((l) => l.state)).toEqual(["available", "locked"]);
    expect(v.units[1].lessons[0].state).toBe("locked");
    expect(v.totalCount).toBe(3);
  });
  it("moves on across units and counts what is done", () => {
    const v = buildPathView("P1", { finishedLessons: ["L1", "L2"], startedLessons: ["L1", "L2", "L3"], xpByLesson: { L1: 60 } }, new Set(["S1"]), b)!;
    expect(v.next?.lesson.lessonId).toBe("L3");
    expect(v.next?.state).toBe("in_progress");
    expect(v.doneCount).toBe(2);
    expect(v.units[0].practiced).toBe(true);
    expect(v.units[0].lessons[0].xp).toBe(60);
  });
  it("has no next lesson when everything is done", () => {
    expect(buildPathView("P1", { finishedLessons: ["L1", "L2", "L3"], startedLessons: [], xpByLesson: {} }, new Set(), b)!.next).toBeNull();
  });
});
