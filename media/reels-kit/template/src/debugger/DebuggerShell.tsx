import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, S, T, VP } from "../brand/theme";

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
        backgroundSize: "28px 28px",
        opacity: 0.55,
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: T.type.toolbar, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>
          <InspectGlyph />
          {S.displayName}
        </div>
        <div
          dir="ltr"
          style={{ flex: 1, maxWidth: 240, minWidth: 0, height: 44, borderRadius: T.radius.pill, background: C.surfaceAlt, color: C.textMuted, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", whiteSpace: "nowrap", padding: "0 16px" }}
        >
          {address}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {illustrative ? <span style={{ ...chip, background: C.warningSoft, color: C.warning }}>{S.labels.illustrative}</span> : null}
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
      <div style={{ position: "absolute", top: VP.toolbarH, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>{children}</div>
      {overlay ? <div style={{ position: "absolute", top: VP.toolbarH, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none" }}>{overlay}</div> : null}
    </div>
  </AbsoluteFill>
);
