"use client";

import { useLayoutEffect } from "react";
import { useLocale } from "next-intl";
import { applyThemeFromCookie } from "@/lib/theme";

/** A language switch replaces the <html> element, and the boot script does not run again, so the saved theme is applied here. */
export function ThemeSync() {
  const locale = useLocale();
  useLayoutEffect(() => {
    applyThemeFromCookie();
  }, [locale]);
  return null;
}
