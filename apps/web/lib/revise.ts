// Revise a unit (design S3-19 frame 4, Eyad 12 Nov D3): play an opened unit again from its first lesson, with the
// replay rules (half XP once a day, skill results never change), without moving the learner's next lesson.
import type { PathView } from "./learning";
import type { UpNext } from "./up-next";

/**
 * The one switch for the end of a revised unit. On: the unit's skill check comes after its last lesson, as practice
 * (answers checked at the end, skill results unchanged). Off: revising ends after the last lesson.
 */
export const REVISE_WITH_CHECK = true;

/** Cookie that remembers where a revise stopped ("<unitId>~<lessonId>"), so the Revise sheet can pick it up again. */
export const REVISE_COOKIE = "ug_revise";

type Unit = PathView["units"][number];

/** A unit can be revised once one of its lessons is finished (a done unit, or the current one). Locked units cannot. */
export const canRevise = (unit: Unit): boolean => unit.lessons.some((l) => l.state === "done");

/** The lessons a revise of this unit goes through: its finished lessons, plus its finished skill check when the switch is on. */
export function reviseLessons(unit: Unit, withCheck = REVISE_WITH_CHECK) {
  return unit.lessons.filter((l) => l.state === "done" && (withCheck || l.lesson.body.mode !== "check"));
}

/**
 * Where the end page of a revised lesson leads: the next lesson of the same unit. A finished one is played as a revise
 * (`revise: true`); the unit's next new lesson is offered as a normal play; a locked one, or the end of the unit, ends it.
 */
export function reviseNext(view: PathView, lessonId: string, withCheck = REVISE_WITH_CHECK): UpNext | null {
  const unit = view.units.find((u) => u.lessons.some((l) => l.lesson.lessonId === lessonId));
  if (!unit) return null;
  const i = unit.lessons.findIndex((l) => l.lesson.lessonId === lessonId);
  const next = unit.lessons[i + 1];
  if (!next || next.state === "locked") return null;
  const done = next.state === "done";
  if (done && next.lesson.body.mode === "check" && !withCheck) return null;
  const t = next.lesson.body.title;
  return { lessonId: next.lesson.lessonId, title: { en: t.en, ar: t.ar }, unitNo: unit.number, lessonNo: next.indexInUnit, minutes: next.lesson.minutes, newUnit: false, revise: done };
}

/** The lesson a stored revise stopped on, if it still belongs to this unit and can be revised. */
export function reviseResume(unit: Unit, cookie: string | undefined | null): Unit["lessons"][number] | null {
  if (!cookie) return null;
  const [unitId, lessonId] = cookie.split("~");
  if (unitId !== unit.unit.id) return null;
  return reviseLessons(unit).find((l) => l.lesson.lessonId === lessonId) ?? null;
}

/** The address of a lesson played in revise mode. */
export const reviseHref = (lessonId: string) => `/app/lesson/${lessonId}?revise=1`;
