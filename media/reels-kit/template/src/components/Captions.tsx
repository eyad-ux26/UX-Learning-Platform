import React from "react";
import { measureText } from "@remotion/layout-utils";
import { interpolate } from "remotion";
import { C, FONT, T } from "../brand/theme";
import { CaptionPage } from "../lib/timeline";

const MAX_W = T.layout.width - T.layout.safe.captionSide * 2 - 64; // inner width of the caption box (clear of right-edge platform icons)

/**
 * Two-line Arabic captions in a fixed band under the debugger viewport (never over UI or annotations).
 * Text = spoken.txt (what was actually said), timed by forced alignment of the recording.
 * Lines are pre-split by make_timeline.py; a line that would overflow is scaled down
 * (and marked data-shrunk for QC) instead of wrapping into a third line.
 */
export const Captions: React.FC<{ pages: CaptionPage[]; ms: number }> = ({ pages, ms }) => {
  const page = pages.find((p) => ms >= p.startMs && ms < p.endMs);
  if (!page) return null;
  const fadeIn = interpolate(ms, [page.startMs, page.startMs + 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const base = T.type.caption;
  return (
    <div
      style={{
        position: "absolute",
        top: T.layout.captions.y,
        height: T.layout.captions.h,
        left: T.layout.safe.captionSide,
        right: T.layout.safe.captionSide,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        dir="rtl"
        style={{
          background: C.captionBg,
          borderRadius: T.radius.lg,
          boxShadow: T.shadow.caption,
          padding: "18px 32px 22px",
          maxWidth: MAX_W + 64,
          opacity: fadeIn,
          fontFamily: FONT,
          textAlign: "center",
        }}
      >
        {page.lines.map((line, li) => {
          const text = line.map((w) => w.text).join(" ");
          const width = measureText({ text, fontFamily: FONT, fontSize: base, fontWeight: "600" }).width;
          const size = width > MAX_W ? Math.floor((base * MAX_W) / width) : base;
          return (
            <div
              key={li}
              data-shrunk={size < base ? "1" : "0"}
              style={{ fontSize: size, lineHeight: T.type.lineHeight, fontWeight: 600, whiteSpace: "nowrap", color: C.captionText }}
            >
              {line.map((w, wi) => {
                const active = T.captions.highlightActiveWord && ms >= w.startMs && ms < w.endMs;
                return (
                  <React.Fragment key={wi}>
                    <span style={{ color: active ? C.captionActive : C.captionText }}>{w.text}</span>
                    {wi < line.length - 1 ? " " : null}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
