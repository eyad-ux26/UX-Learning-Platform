"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { applyTheme, THEME_COOKIE, parseThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: ThemePref[] = ["system", "light", "dark"];

export function ThemeSwitch() {
  const t = useTranslations("common");
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
    setPref(parseThemePref(m?.[1]));
  }, []);

  const label: Record<ThemePref, string> = {
    system: t("themeSystem"),
    light: t("themeLight"),
    dark: t("themeDark"),
  };

  return (
    <div className="tabs" role="radiogroup" aria-label={t("theme")}>
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={pref === o}
          className={`tab${pref === o ? " is-on" : ""}`}
          onClick={() => {
            setPref(o);
            applyTheme(o);
          }}
        >
          {label[o]}
        </button>
      ))}
    </div>
  );
}
