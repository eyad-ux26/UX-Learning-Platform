import { describe, expect, it } from "vitest";
import type { ContentIndex } from "@uxgate/content";
import { buildPathView, canPlay, pathBegun, pickPath, testOutCheck } from "./learning";

const t = (s: string) => ({ en: s, ar: s });
const lesson = (lessonId: string, unitId: string, order: number) => ({ lessonId, unitId, pathId: "P1", order, mode: "lesson", minutes: 5, hash: "h", body: {} as never });
const b = {
  paths: [{ id: "P0", title: t("Empty"), subtitle: t("") }, { id: "P1", title: t("One"), subtitle: t("") }],
  units: [
    { id: "U1", pathId: "P1", title: t("u1"), skill: t(""), free: true, skills: [{ id: "S1", title: t(""), can_do: t("") }], lessons: ["L1", "L2"] },
    { id: "U2", pathId: "P1", title: t("u2"), skill: t(""), free: false, skills: [], lessons: ["L3"] },
  ],
  lessons: [lesson("L2", "U1", 2), lesson("L1", "U1", 1), lesson("L3", "U2", 1)],
} as unknown as ContentIndex;

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

describe("pathBegun (Start path or Continue path)", () => {
  it("is false before any lesson is opened, true once one is started or finished", () => {
    const none = { finishedLessons: [], startedLessons: [], xpByLesson: {} };
    expect(pathBegun(buildPathView("P1", none, new Set(), b)!)).toBe(false);
    expect(pathBegun(buildPathView("P1", { ...none, startedLessons: ["L1"] }, new Set(), b)!)).toBe(true);
    expect(pathBegun(buildPathView("P1", { ...none, finishedLessons: ["L1"], startedLessons: ["L1"] }, new Set(), b)!)).toBe(true);
  });
});

describe("test out of a unit", () => {
  const order = (b: ReturnType<typeof buildPathView>) => b!.units.flatMap((u) => u.lessons);
  const fresh = buildPathView("P01", { finishedLessons: [], startedLessons: [], xpByLesson: {} }, new Set())!;
  const u1 = fresh.units[0].lessons;
  const check = u1.find((l) => l.lesson.mode === "check")!;
  it("the skill check of the unit the learner is in can be taken early; later units cannot", () => {
    expect(check.state).toBe("locked");
    expect(canPlay(fresh, check.lesson.lessonId)).toBe(true);
    expect(testOutCheck(fresh, 0)?.lesson.lessonId).toBe(check.lesson.lessonId);
    const u2check = fresh.units[1].lessons.find((l) => l.lesson.mode === "check")!;
    expect(canPlay(fresh, u2check.lesson.lessonId)).toBe(false);
    expect(canPlay(fresh, fresh.units[1].lessons[0].lesson.lessonId)).toBe(false);
  });
  it("passing it opens the next unit, and the skipped lessons stay open", () => {
    const after = buildPathView("P01", { finishedLessons: [u1[0].lesson.lessonId, check.lesson.lessonId], startedLessons: [], xpByLesson: {} }, new Set())!;
    const all = order(after);
    expect(after.units[1].lessons[0].state).toBe("available");
    expect(after.next?.lesson.lessonId).toBe(after.units[1].lessons[0].lesson.lessonId);
    expect(all.filter((l) => l.unit.id === u1[0].unit.id && l.state === "available").length).toBe(u1.length - 2);
    expect(after.units[1].lessons[1].state).toBe("locked");
  });
});
