// Content for the app. Only the small index is in code; each lesson is a separate JSON file (dist/lessons, named by a
// hash of its content) that the app reads on demand, so no request parses lessons it does not show and the Worker's
// script stays small (a Worker gets 10 ms of CPU per request on the free plan).
import raw from "../dist/index.json";
import type { ContentIndex, LessonMeta, LessonVersion, UnitMeta, PathMeta } from "./types";

export * from "./types";
export * from "./cast";
export const content = raw as unknown as ContentIndex;

/** Title, mode, minutes and order of a lesson or bank, without its steps. */
export const getLessonMeta = (lessonId: string): LessonMeta | undefined =>
  content.lessons.find((l) => l.lessonId === lessonId) ?? content.banks.find((l) => l.lessonId === lessonId);
export const getUnit = (unitId: string): UnitMeta | undefined => content.units.find((u) => u.id === unitId);
export const getPath = (pathId: string): PathMeta | undefined => content.paths.find((p) => p.id === pathId);
/** Lessons of a unit, in play order (without steps). */
export const unitLessons = (unitId: string): LessonMeta[] =>
  content.lessons.filter((l) => l.unitId === unitId).sort((a, b) => a.order - b.order);
/** Every video id any lesson uses. */
export const videoIds = new Set(content.videos);

export type LessonLoader = {
  /** The whole lesson (or bank), steps included. Read once per isolate. */
  getLessonVersion(lessonId: string): Promise<LessonVersion | undefined>;
  /** The unit's re-test bank (held-back steps for the mastery round). */
  getBank(unitId: string): Promise<LessonVersion | undefined>;
};

/** Lesson lookups over a reader of dist/lessons files. The app passes one that reads its static assets. */
export function createLessonLoader(read: (file: string) => Promise<unknown>): LessonLoader {
  const cache = new Map<string, Promise<LessonVersion | undefined>>();
  const getLessonVersion = (lessonId: string) => {
    const meta = getLessonMeta(lessonId);
    if (!meta) return Promise.resolve(undefined);
    let p = cache.get(meta.file);
    if (!p) {
      p = read(meta.file).then((v) => v as LessonVersion);
      p.catch(() => cache.delete(meta.file)); // a failed read is tried again next time
      cache.set(meta.file, p);
    }
    return p;
  };
  return {
    getLessonVersion,
    getBank: (unitId) => {
      const meta = content.banks.find((l) => l.unitId === unitId);
      return meta ? getLessonVersion(meta.lessonId) : Promise.resolve(undefined);
    },
  };
}
