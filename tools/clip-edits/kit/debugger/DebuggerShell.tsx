import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FONT, PRODUCT_FONT, T, themeVars, VP } from "../brand/theme";

/**
 * Example products: each fictional app keeps its own industry identity, never the UXGate look, so learners can tell
 * our notes from the product. Picked from the scene's address (its first part names the app).
 */
type Example = { name: string; brand: string; brandSoft: string; onBrand: string };
const EXAMPLES: Record<string, Example> = {
  shop: { name: "سوق لين", brand: "#111111", brandSoft: "#FFE3EE", onBrand: "#FFFFFF" },
  wasla: { name: "وصلة", brand: "#F2B705", brandSoft: "#FFF6D6", onBrand: "#1F2328" },
  maps: { name: "درب", brand: "#2E7D32", brandSoft: "#E3F1E4", onBrand: "#FFFFFF" },
  music: { name: "نغمة", brand: "#C2185B", brandSoft: "#FCE4EC", onBrand: "#FFFFFF" },
  chat: { name: "حكاوي", brand: "#5B3CC4", brandSoft: "#ECE8FB", onBrand: "#FFFFFF" },
  mail: { name: "بريدي", brand: "#7A1F5C", brandSoft: "#F6E6F0", onBrand: "#FFFFFF" },
  rides: { name: "مشوار", brand: "#E8590C", brandSoft: "#FFF0E6", onBrand: "#FFFFFF" },
};
export const exampleFor = (address: string): Example => EXAMPLES[address.split(/[./]/)[0]] ?? EXAMPLES.shop;
/** Light product palette plus the example's brand, for the product subtree only. */
export const exampleVars = (address: string): React.CSSProperties => {
  const e = exampleFor(address);
  return { ...themeVars(0), "--d-brand": e.brand, "--d-brandSoft": e.brandSoft, "--d-onBrand": e.onBrand, fontFamily: PRODUCT_FONT } as React.CSSProperties;
};

export type DebugMode = "live" | "paused" | "inspect" | "change" | "replay" | "compare";

const MODE_LABEL: Record<DebugMode, string> = { live: "", paused: "متوقف", inspect: "فحص", change: "تعديل", replay: "إعادة التجربة", compare: "مقارنة" };

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 44,
  padding: "0 18px",
  borderRadius: T.radius.pill,
  fontSize: T.type.chip,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

/** Small inspect glyph: a selection square with a pointer. Used as the series mark. */
export const InspectGlyph: React.FC<{ size?: number; color?: string }> = ({ size = 30, color = C.select }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 3H5a2 2 0 0 0-2 2v9" strokeDasharray="3 2.4" />
    <path d="M10 10l10 4-4 1.6L14.4 20z" fill={color} />
  </svg>
);

const ModeIcon: React.FC<{ mode: DebugMode }> = ({ mode }) => {
  const s = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2.4, strokeLinecap: "round" as const };
  if (mode === "paused")
    return (<svg {...s} stroke={C.text}><path d="M9 5v14M15 5v14" /></svg>);
  if (mode === "inspect")
    return (<svg {...s} stroke={C.selectText}><circle cx="12" cy="12" r="7" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>);
  if (mode === "replay")
    return (<svg {...s} stroke={C.select}><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></svg>);
  if (mode === "change")
    return (<svg {...s} stroke={C.selectText}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>);
  if (mode === "compare")
    return (<svg {...s} stroke={C.select}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M12 4.5v15" /></svg>);
  return null;
};

/**
 * The series frame: neutral workspace, one prototype viewport, a minimal toolbar.
 * Children are the product content, positioned in CONTENT coordinates (0,0 = top-left under the toolbar).
 */
export const DebuggerShell: React.FC<{
  mode: DebugMode;
  modeOpacity?: number;
  address: string;
  illustrative: boolean;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}> = ({ mode, modeOpacity = 1, address, illustrative, children, overlay }) => (
  <AbsoluteFill style={{ background: C.workspace, fontFamily: FONT }}>
    {/* faint dot grid: reads as a workspace, not a decoration */}
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${C.border} 1.6px, transparent 1.6px)`,
        backgroundSize: "24px 24px",
        opacity: 0.8,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: VP.x,
        top: VP.y,
        width: VP.w,
        height: VP.h,
        borderRadius: T.radius.viewport,
        background: C.surface,
        boxShadow: T.shadow.viewport,
        border: `2px solid ${C.border}`,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* toolbar */}
      <div
        dir="rtl"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: VP.toolbarH,
          background: C.toolbar,
          borderBottom: `2px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          gap: 14,
          zIndex: 5,
        }}
      >
        <Img src={staticFile("brand/uxgate-logo-white.svg")} style={{ height: 34 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {illustrative ? <span style={{ ...chip, background: C.surfaceAlt, color: C.textMuted, border: `2px solid ${C.border}` }}>مثال · {exampleFor(address).name}</span> : null}
          {mode !== "live" ? (
            <span
              style={{
                ...chip,
                opacity: modeOpacity,
                background: mode === "inspect" || mode === "change" ? C.select : mode === "replay" || mode === "compare" ? C.selectSoft : C.surfaceAlt,
                color: mode === "inspect" || mode === "change" ? C.selectText : mode === "replay" || mode === "compare" ? C.select : C.text,
              }}
            >
              <ModeIcon mode={mode} />
              {MODE_LABEL[mode]}
            </span>
          ) : null}
        </div>
      </div>
      {/* product content */}
      <div style={{ position: "absolute", top: VP.toolbarH, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, ...exampleVars(address) }}>{children}</div>
      </div>
      {overlay ? <div style={{ position: "absolute", top: VP.toolbarH, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>{overlay}</div> : null}
    </div>
  </AbsoluteFill>
);
