import "server-only";
import { pickPath } from "@/lib/learning";
import type { Learner } from "@/lib/server/learner";

/**
 * What the shell needs on the billing pages: only the current path's name. The rail's unit list is left out so these
 * pages do no lesson work (issue #114, Worker CPU time).
 */
export function shellFor(me: Learner) {
  const path = pickPath(me.currentPathId ?? me.recommendedPathId)!;
  return { pathId: path.id, pathTitle: path.title.en };
}

export const countryName = (code: string, locale: string) => {
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code; } catch { return code; }
};

export const formatDate = (iso: string | null | undefined, locale: string, withYear = false) =>
  iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "Africa/Cairo", numberingSystem: "latn" }).format(new Date(iso)) : "";
