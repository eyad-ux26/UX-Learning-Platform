import "server-only";
import { COUNTRIES } from "@/lib/billing/pricing";
import { buildPathView, pickPath } from "@/lib/learning";
import type { Learner } from "@/lib/server/learner";

/** What the shell needs on the billing pages: the learner's current path and its units. */
export function shellFor(me: Learner, locale: string) {
  const path = pickPath(me.currentPathId ?? me.recommendedPathId)!;
  const view = buildPathView(path.id, me.progress, me.practicedSkills)!;
  return { pathId: path.id, pathTitle: path.title.en, units: view.units.map((u) => ({ id: u.unit.id, title: u.unit.title[locale as "en" | "ar"] })) };
}

export const countryName = (code: string, locale: string) => {
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code; } catch { return code; }
};

/** The billing country list: Egypt, the Gulf, other Arab countries, then the learner's own country if it is elsewhere. */
export function countryOptions(locale: string, current: string) {
  const codes = COUNTRIES.includes(current) ? COUNTRIES : [...COUNTRIES, current];
  return codes.map((code) => ({ code, name: countryName(code, locale) }));
}

export const formatDate = (iso: string | null | undefined, locale: string, withYear = false) =>
  iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "Africa/Cairo", numberingSystem: "latn" }).format(new Date(iso)) : "";
