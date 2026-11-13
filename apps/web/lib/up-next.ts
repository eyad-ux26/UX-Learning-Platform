// What a lesson's end page points to next: the following lesson of the same path, or the end of the path.
import type { PathView } from "./learning";

export type UpNext = {
  lessonId: string;
  title: { en: string; ar: string };
  unitNo: number;
  lessonNo: number;
  minutes: number;
  newUnit: boolean;
  /** Revise a unit: the next lesson is a finished one, played again in revise mode. */
  revise?: boolean;
};
/** The last lesson of a path. `certReady`: every skill of the path outside this unit is Shown already, so passing this unit's check earns the certificate. */
export type PathEnd = { pathId: string; pathTitle: string; skills: number; certReady: boolean };

/** The lesson after `lessonId` in path order (across units), or null at the end of the path. */
export function upNextOf(view: PathView, lessonId: string): UpNext | null {
  const all = view.units.flatMap((u) => u.lessons.map((l) => ({ ...l, unitNo: u.number })));
  const i = all.findIndex((l) => l.lesson.lessonId === lessonId);
  const next = i >= 0 ? all[i + 1] : undefined;
  if (!next) return null;
  const t = next.lesson.body.title;
  return {
    lessonId: next.lesson.lessonId,
    title: { en: t.en, ar: t.ar },
    unitNo: next.unitNo,
    lessonNo: next.indexInUnit,
    minutes: next.lesson.minutes,
    newUnit: next.unitNo !== all[i].unitNo,
  };
}
