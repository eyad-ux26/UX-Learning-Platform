// Reads the content bundle for the learner's current path. Pure, so the same code runs in pages and tests.
import {
  content as defaultContent,
  type ContentIndex,
  type LessonMeta,
  type PathMeta,
  type UnitMeta,
} from "@uxgate/content";
import { lessonStates, type LessonState, type Progress } from "./progress";

export type PathLesson = {
  lesson: LessonMeta;
  unit: UnitMeta;
  indexInUnit: number;
  unitLessons: number;
  state: LessonState;
  xp: number;
};
export type PathView = {
  path: PathMeta;
  unitCount: number;
  units: { unit: UnitMeta; number: number; lessons: PathLesson[]; practiced: boolean }[];
  next: PathLesson | null;
  doneCount: number;
  totalCount: number;
};

/** The path to show: the recommended one when it has content, otherwise the first path with content. */
export function pickPath(
  recommendedId: string | null | undefined,
  b: ContentIndex = defaultContent,
): PathMeta | undefined {
  const playable = b.paths.filter((p) => b.units.some((u) => u.pathId === p.id && u.lessons.length > 0));
  return playable.find((p) => p.id === recommendedId) ?? playable[0];
}

/** The current path when it is joined and playable; otherwise the first joined playable path; otherwise the recommended one. */
export function pickCurrent(
  currentId: string | null | undefined,
  joined: readonly string[],
  recommendedId: string | null | undefined,
  b: ContentIndex = defaultContent,
): PathMeta | undefined {
  const ok = (id: string | null | undefined) => (id ? pickPath(id, b)?.id === id : false);
  if (ok(currentId) && (joined.length === 0 || joined.includes(currentId!))) return pickPath(currentId, b);
  const first = joined.find(ok);
  return pickPath(first ?? recommendedId, b);
}

const frontier = (all: PathLesson[]) => {
  let last = -1;
  all.forEach((l, i) => {
    if (l.state === "done") last = i;
  });
  return all.slice(last + 1).find((l) => l.state === "available");
};

/**
 * Whether a lesson can be played now: any lesson that is not locked, and also the skill check of the unit the learner
 * is in, taken early to test out of the rest of that unit.
 */
export function canPlay(view: PathView, lessonId: string): boolean {
  const unit = view.units.find((u) => u.lessons.some((l) => l.lesson.lessonId === lessonId));
  const l = unit?.lessons.find((x) => x.lesson.lessonId === lessonId);
  if (!unit || !l) return false;
  if (l.state !== "locked") return true;
  return l.lesson.mode === "check" && unit.lessons.some((x) => x.state !== "locked");
}

/** The skill check of a unit that can be taken early (test out), when the unit is reached but not finished. */
export function testOutCheck(view: PathView, unitIndex: number): PathLesson | null {
  const u = view.units[unitIndex];
  const check = u?.lessons.find((l) => l.lesson.mode === "check");
  return check && check.state === "locked" && canPlay(view, check.lesson.lessonId) ? check : null;
}

export function buildPathView(
  pathId: string,
  progress: Pick<Progress, "finishedLessons" | "startedLessons" | "xpByLesson">,
  practicedSkills: ReadonlySet<string>,
  b: ContentIndex = defaultContent,
): PathView | null {
  const path = b.paths.find((p) => p.id === pathId);
  if (!path) return null;
  const units = b.units.filter((u) => u.pathId === pathId);
  const finished = new Set(progress.finishedLessons);
  const started = new Set(progress.startedLessons);
  const order = units.flatMap((u) =>
    b.lessons
      .filter((l) => l.unitId === u.id)
      .sort((a, c) => a.order - c.order)
      .map((l) => l.lessonId),
  );
  const states = lessonStates(order, finished, started);

  const rows = units.map((unit, i) => {
    const lessons = b.lessons.filter((l) => l.unitId === unit.id).sort((a, c) => a.order - c.order);
    return {
      unit,
      number: i + 1,
      practiced: unit.skills.length > 0 && unit.skills.every((s) => practicedSkills.has(s.id)),
      lessons: lessons.map(
        (lesson, k): PathLesson => ({
          lesson,
          unit,
          indexInUnit: k + 1,
          unitLessons: lessons.length,
          state: states[lesson.lessonId],
          xp: progress.xpByLesson[lesson.lessonId] ?? 0,
        }),
      ),
    };
  });
  const all = rows.flatMap((r) => r.lessons);
  return {
    path,
    unitCount: units.length,
    units: rows,
    // The lesson in progress first, then the next one after the furthest finished lesson, then any skipped one.
    next:
      all.find((l) => l.state === "in_progress") ?? frontier(all) ?? all.find((l) => l.state === "available") ?? null,
    doneCount: all.filter((l) => l.state === "done").length,
    totalCount: all.length,
  };
}

/** The learner has started at least one lesson of this path (finished or not): its main button says Continue, not Start. */
export function pathBegun(view: PathView): boolean {
  return view.units.some((u) => u.lessons.some((l) => l.state === "done" || l.state === "in_progress"));
}
