// What a plan opens. Unit 1 of every path is free (content marks it `free`); every other unit, and certificates,
// need Pro. The lesson and mastery pages, the attempts API (lessons and re-test banks) and the video API check this on the server, so the screen is never the only guard.
import { getLessonMeta, getUnit, videoUnits } from "@uxgate/content";

export const unitOpen = (unit: { free: boolean } | null | undefined, pro: boolean): boolean => !!unit && (unit.free || pro);

/** Can this learner play this lesson on their plan? Unknown lessons are not open. */
export function lessonOpen(lessonId: string, pro: boolean): boolean {
  const v = getLessonMeta(lessonId);
  return !!v && unitOpen(getUnit(v.unitId), pro);
}

/** Can this learner watch this video? It is open when any unit that uses it is open on their plan (issue #137). */
export function videoOpen(videoId: string, pro: boolean): boolean {
  return videoUnits(videoId).some((u) => unitOpen(getUnit(u), pro));
}

/** Certificates come with Pro: a certificate needs every skill in the path, and most of them are past Unit 1. */
export const certificateOpen = (pro: boolean) => pro;
