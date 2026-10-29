import type React from "react";
import tokens from "./theme.tokens.json";
import series from "./series.json";

// Single sources of truth: edit theme.tokens.json (visuals) and series.json (identity), not this file.
export const T = tokens;
export const S = series;

type Palette = Record<string, string>;
const LIGHT_C = tokens.color as Palette;
const LIGHT_D = tokens.demo as Palette;
const DARK_C = tokens.colorDark as Palette;
const DARK_D = tokens.demoDark as Palette;

/**
 * Colours are CSS custom properties with the light value as fallback, so every component is light by default and a
 * scene can switch any subtree to the dark palette (or blend between them) by setting themeVars(t) on a wrapper.
 */
const asVars = <P extends Palette>(p: P, prefix: string): P =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, k.startsWith("$") ? v : `var(--${prefix}-${k}, ${v})`])) as P;
export const C = asVars(tokens.color as typeof tokens.color & Palette, "c") as typeof tokens.color;
export const D = asVars(tokens.demo as typeof tokens.demo & Palette, "d") as typeof tokens.demo;

const parse = (c: string): [number, number, number, number] => {
  if (c.startsWith("#")) {
    const h = c.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return [0, 0, 0, 1];
  const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
};
const mix = (a: string, b: string, t: number) => {
  const A = parse(a), B = parse(b);
  const v = A.map((x, i) => x + (B[i] - x) * t);
  return `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${v[3].toFixed(3)})`;
};
/** CSS variables for a light → dark blend (t = 0 light, 1 dark). Spread into a wrapper's style. */
export const themeVars = (t: number): React.CSSProperties => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(LIGHT_C)) if (!k.startsWith("$") && DARK_C[k]) out[`--c-${k}`] = mix(v, DARK_C[k], t);
  for (const [k, v] of Object.entries(LIGHT_D)) if (!k.startsWith("$") && DARK_D[k]) out[`--d-${k}`] = mix(v, DARK_D[k], t);
  return out as React.CSSProperties;
};

export const FONT = `"${tokens.font.family}", ${tokens.font.fallback}`;
export const VP = tokens.layout.viewport;
/** Product content area inside the debugger viewport (below the toolbar), in canvas pixels. */
export const CONTENT = { x: VP.x, y: VP.y + VP.toolbarH, w: VP.w, h: VP.h - VP.toolbarH };
export const EASE_OUT = tokens.motion.easeOut as [number, number, number, number];
export const EASE_IN_OUT = tokens.motion.easeInOut as [number, number, number, number];
