// Content for the app. Only the small index is parsed up front; each lesson is its own file, loaded on demand,
// so a request never parses content it does not show (a Worker gets 10 ms of CPU per request on the free plan).
import raw from "../dist/index.json";
import { loaders } from "../dist/loaders";
import type { ContentIndex, LessonMeta, LessonVersion, UnitMeta, PathMeta } from "./types";

export * from "./types";
export * from "./cast";
export const content = raw as unknown as ContentIndex;

/** Title, mode, minutes and order of a lesson or bank, without its steps. */
export const getLessonMeta = (lessonId: string): LessonMeta | undefined =>
  content.lessons.find((l) => l.lessonId === lessonId) ?? content.banks.find((l) => l.lessonId === lessonId);

const cache = new Map<string, Promise<LessonVersion | undefined>>();
/** The whole lesson (or bank), steps included. Parsed once per isolate. */
export function getLessonVersion(lessonId: string): Promise<LessonVersion | undefined> {
  const load = Object.hasOwn(loaders, lessonId) ? loaders[lessonId] : undefined;
  if (!load) return Promise.resolve(undefined);
  let p = cache.get(lessonId);
  if (!p) { p = load().then((m) => m.default as LessonVersion); cache.set(lessonId, p); }
  return p;
}
/** The unit's re-test bank (held-back steps for the mastery round). */
export const getBank = (unitId: string): Promise<LessonVersion | undefined> => {
  const meta = content.banks.find((l) => l.unitId === unitId);
  return meta ? getLessonVersion(meta.lessonId) : Promise.resolve(undefined);
};
export const getUnit = (unitId: string): UnitMeta | undefined => content.units.find((u) => u.id === unitId);
export const getPath = (pathId: string): PathMeta | undefined => content.paths.find((p) => p.id === pathId);
/** Lessons of a unit, in play order (without steps). */
export const unitLessons = (unitId: string): LessonMeta[] =>
  content.lessons.filter((l) => l.unitId === unitId).sort((a, b) => a.order - b.order);
/** Every video id any lesson uses. */
export const videoIds = new Set(content.videos);
