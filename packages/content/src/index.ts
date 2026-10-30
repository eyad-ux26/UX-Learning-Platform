import raw from "../dist/bundle.json";
import type { Bundle, LessonVersion, UnitMeta, PathMeta } from "./types";

export * from "./types";
export const bundle = raw as unknown as Bundle;

export const getLessonVersion = (lessonId: string): LessonVersion | undefined => bundle.lessons.find((l) => l.lessonId === lessonId);
export const getUnit = (unitId: string): UnitMeta | undefined => bundle.units.find((u) => u.id === unitId);
export const getPath = (pathId: string): PathMeta | undefined => bundle.paths.find((p) => p.id === pathId);
/** Lessons of a unit, in play order. */
export const unitLessons = (unitId: string): LessonVersion[] =>
  bundle.lessons.filter((l) => l.unitId === unitId).sort((a, b) => a.order - b.order);
