import "server-only";
import type { Learner } from "@/lib/server/learner";

/** What the shell needs on the billing pages: the learner (slice 3's Shell reads the paths and rail from it). */
export function shellFor(me: Learner) {
  // Slice 3's Shell takes the learner and works out the paths and rail itself.
  return { me };
}

export const countryName = (code: string, locale: string) => {
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code; } catch { return code; }
};

export const formatDate = (iso: string | null | undefined, locale: string, withYear = false) =>
  iso ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "Africa/Cairo", numberingSystem: "latn" }).format(new Date(iso)) : "";
