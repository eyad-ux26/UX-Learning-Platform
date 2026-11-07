import { getMessages } from "next-intl/server";
import type { Locale } from "@uxgate/content/types";

/** The strings the lesson player and its end pages use, in the other language, so the in-lesson language switch is instant. */
export type OtherLocale = { locale: Locale; messages: Record<string, unknown> };

// Only what the player, its end pages and the loader read. Anything missing falls back to the page's own language.
const NAMESPACES = ["player", "sync", "end", "review", "pages", "common", "loading", "nav", "push"] as const;
const BILLING_KEYS = ["nextUnit", "endPro", "seePlans"] as const;

export async function otherLocaleMessages(locale: string): Promise<OtherLocale> {
  const other: Locale = locale === "ar" ? "en" : "ar";
  const all = (await getMessages({ locale: other })) as Record<string, Record<string, unknown> | undefined>;
  const messages: Record<string, unknown> = {};
  for (const ns of NAMESPACES) if (all[ns]) messages[ns] = all[ns];
  const billing = all.billing ?? {};
  messages.billing = Object.fromEntries(BILLING_KEYS.filter((k) => k in billing).map((k) => [k, billing[k]]));
  return { locale: other, messages };
}
