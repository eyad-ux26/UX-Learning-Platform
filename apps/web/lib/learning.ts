// Reads the content bundle for the learner's current path. Pure, so the same code runs in pages and tests.
import { bundle as defaultBundle, type Bundle, type LessonVersion, type PathMeta, type UnitMeta } from "@uxgate/content";
import { lessonStates, type LessonState, type Progress } from "./progress";

export type PathLesson = { lesson: LessonVersion; unit: UnitMeta; indexInUnit: number; unitLessons: number; state: LessonState; xp: number };
export type PathView = {
  path: PathMeta;
  unitCount: number;
  units: { unit: UnitMeta; number: number; lessons: PathLesson[]; practiced: boolean }[];
  next: PathLesson | null;
  doneCount: number;
  totalCount: number;
};

/** The path to show: the recommended one when it has content, otherwise the first path with content. */
export function pickPath(recommendedId: string | null | undefined, b: Bundle = defaultBundle): PathMeta | undefined {
  const playable = b.paths.filter((p) => b.units.some((u) => u.pathId === p.id && u.lessons.length > 0));
  return playable.find((p) => p.id === recommendedId) ?? playable[0];
}

export function buildPathView(pathId: string, progress: Pick<Progress, "finishedLessons" | "startedLessons" | "xpByLesson">, practicedSkills: ReadonlySet<string>, b: Bundle = defaultBundle): PathView | null {
  const path = b.paths.find((p) => p.id === pathId);
  if (!path) return null;
  const units = b.units.filter((u) => u.pathId === pathId);
  const finished = new Set(progress.finishedLessons);
  const started = new Set(progress.startedLessons);
  const order = units.flatMap((u) => b.lessons.filter((l) => l.unitId === u.id).sort((a, c) => a.order - c.order).map((l) => l.lessonId));
  const states = lessonStates(order, finished, started);

  const rows = units.map((unit, i) => {
    const lessons = b.lessons.filter((l) => l.unitId === unit.id).sort((a, c) => a.order - c.order);
    return {
      unit, number: i + 1,
      practiced: unit.skills.length > 0 && unit.skills.every((s) => practicedSkills.has(s.id)),
      lessons: lessons.map((lesson, k): PathLesson => ({ lesson, unit, indexInUnit: k + 1, unitLessons: lessons.length, state: states[lesson.lessonId], xp: progress.xpByLesson[lesson.lessonId] ?? 0 })),
    };
  });
  const all = rows.flatMap((r) => r.lessons);
  return {
    path, unitCount: units.length, units: rows,
    next: all.find((l) => l.state === "available" || l.state === "in_progress") ?? null,
    doneCount: all.filter((l) => l.state === "done").length, totalCount: all.length,
  };
}
