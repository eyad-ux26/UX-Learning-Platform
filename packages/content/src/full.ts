// The whole compiled bundle, every lesson with its steps. For tests and build tools only: the app imports "@uxgate/content".
import raw from "../dist/bundle.json";
import type { Bundle } from "./types";

export const bundle = raw as unknown as Bundle;
/** Synchronous lookups over the whole bundle, for tests. */
export const getLessonVersion = (lessonId: string) =>
  bundle.lessons.find((l) => l.lessonId === lessonId) ?? bundle.banks.find((l) => l.lessonId === lessonId);
export const getBank = (unitId: string) => bundle.banks.find((l) => l.unitId === unitId);
