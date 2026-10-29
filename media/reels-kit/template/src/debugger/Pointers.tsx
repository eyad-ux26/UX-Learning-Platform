import React from "react";
import { interpolate } from "remotion";
import { C, T } from "../brand/theme";
import { Key, pathAt, pressAt } from "../lib/timeline";

const fade = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, from + 8, to - 8, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/**
 * The debugger's own cursor (the "inspector"): a crisp arrow with an indigo selection badge.
 * Distinct from the user's touch point so viewers always know who is acting.
 * Coordinates are content-area screen space (already through the camera).
 */
export const InspectCursor: React.FC<{ frame: number; keys: Key[]; from: number; to: number }> = ({ frame, keys, from, to }) => {
  const o = fade(frame, from, to);
  if (o <= 0) return null;
  const { x, y } = pathAt(frame, keys);
  const p = pressAt(frame, keys, T.motion.clickFrames / 2);
  const clicks = keys.filter((k) => k.click && frame >= k.f && frame <= k.f + 18);
  return (
    <>
      {clicks.map((k) => {
        const q = (frame - k.f) / 18;
        return (
          <div key={k.f} style={{ position: "absolute", left: k.x - 34, top: k.y - 34, width: 68, height: 68, borderRadius: 34, border: `4px solid ${C.select}`, opacity: (1 - q) * 0.8, scale: String(0.4 + q) }} />
        );
      })}
      <svg width="54" height="62" viewBox="0 0 27 31" style={{ position: "absolute", left: x - 4, top: y - 3, opacity: o, scale: String(1 - p * 0.12), transformOrigin: "4px 3px", filter: "drop-shadow(0 4px 6px rgba(23,26,33,0.28))" }}>
        <path d="M2 2 L2 23 L8 17.5 L12 27 L16 25.3 L12 16 L20 16 Z" fill={C.text} stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="21" cy="24" r="5.5" fill={C.select} stroke="#FFFFFF" strokeWidth="1.6" />
      </svg>
    </>
  );
};

/** The user's touch point (the person using the product), with press + ripple on taps. */
export const UserTouch: React.FC<{ frame: number; keys: Key[]; from: number; to: number }> = ({ frame, keys, from, to }) => {
  const o = fade(frame, from, to);
  if (o <= 0) return null;
  const { x, y } = pathAt(frame, keys);
  const p = pressAt(frame, keys, 4);
  const taps = keys.filter((k) => k.click && frame >= k.f && frame <= k.f + 20);
  return (
    <>
      {taps.map((k) => {
        const q = (frame - k.f) / 20;
        return <div key={k.f} style={{ position: "absolute", left: k.x - 44, top: k.y - 44, width: 88, height: 88, borderRadius: 44, background: "rgba(23,26,33,0.10)", opacity: 1 - q, scale: String(0.5 + q * 0.9) }} />;
      })}
      <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 30, background: C.userTouch, border: "3px solid rgba(255,255,255,0.95)", boxShadow: "0 6px 16px rgba(23,26,33,0.22)", opacity: o, scale: String(1 - p * 0.2) }} />
    </>
  );
};
