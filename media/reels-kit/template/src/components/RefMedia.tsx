import React from "react";
import { Img, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { C, FONT, T } from "../brand/theme";

/**
 * Episode reference media (screenshots, images, clips) placed inside the debugger viewport.
 * Reference videos are MUTED by default: their narration must never mix with Eyad's recording.
 * Set allowAudio only when Eyad explicitly asks for it in the storyboard.
 * `credit` is shown small on top of the media; full credits go in sources.md.
 */
export const RefMedia: React.FC<{
  src: string; // path under public/
  kind: "image" | "video";
  credit?: string;
  allowAudio?: boolean;
  fit?: "contain" | "cover";
  trimBeforeFrames?: number;
  style?: React.CSSProperties;
}> = ({ src, kind, credit, allowAudio = false, fit = "contain", trimBeforeFrames, style }) => (
  <div style={{ position: "absolute", inset: 0, background: C.surfaceAlt, ...style }}>
    {kind === "image" ? (
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: fit }} />
    ) : (
      <Video src={staticFile(src)} muted={!allowAudio} volume={allowAudio ? 1 : 0} trimBefore={trimBeforeFrames} style={{ width: "100%", height: "100%", objectFit: fit }} />
    )}
    {credit ? (
      <div dir="auto" style={{ position: "absolute", left: 16, bottom: 16, padding: "6px 14px", borderRadius: T.radius.sm, background: "rgba(23,26,33,0.72)", color: "#FFFFFF", fontFamily: FONT, fontSize: 22 }}>
        {credit}
      </div>
    ) : null}
  </div>
);
