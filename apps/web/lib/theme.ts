export const THEME_COOKIE = "ug-theme";
export type ThemePref = "system" | "light" | "dark";

export const parseThemePref = (v: string | undefined): ThemePref =>
  v === "light" || v === "dark" ? v : "system";

// Runs before first paint so there is no flash: resolves "system" with the OS setting.
export const themeBootScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?m[1]:"system";var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

function setTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function applyTheme(pref: ThemePref) {
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
  setTheme(pref);
}

/** Same as the boot script, for after a client-side navigation has replaced the <html> element (a language switch). */
export function applyThemeFromCookie() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  setTheme(parseThemePref(m?.[1]));
}
