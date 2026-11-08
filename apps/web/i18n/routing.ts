import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  // Arabic first: the platform opens in Arabic for everyone; a visitor who switches to English keeps it (the NEXT_LOCALE cookie).
  defaultLocale: "ar",
});

export type Locale = (typeof routing.locales)[number];
export const isRtl = (locale: string) => locale === "ar";
