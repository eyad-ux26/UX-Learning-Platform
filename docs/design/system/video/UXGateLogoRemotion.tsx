// UXGate logo motion for Remotion videos (frame-accurate; CSS animations do not render reliably in Remotion).
// Usage inside a composition: <UXGateLogoRemotion variant="intro" size={220} tone="white" />
import * as React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";

const DOOR = "M353.9,12.8c-3.6-3.5-223,26-257.8,30.7c-2.7,0.4-4.6,2.6-4.6,5.3v283.5c0,25.6,3.9,47.9,11.7,67c7.8,19.1,18.4,35,31.9,47.8c13.4,12.8,28.9,22.5,46.4,29c17.5,6.6,36.2,9.8,56.2,9.8c18.7,0,36.9-3.1,54.3-9.4c17.5-6.2,33-15.8,46.4-28.6c13.4-12.8,24-28.9,31.9-48.3c7.8-19.4,11.7-41.9,11.7-67.5V40.9C382,25.4,369.4,12.8,353.9,12.8L353.9,12.8z M344,388.1c-6.6,15.9-15.1,29-25.8,39.4c-10.6,10.3-23,18-37,23c-14.1,5-28.6,7.5-43.6,7.5c-15.6,0-30.6-2.7-45-8c-6.2-2.3-12-5-17.5-8.2c-12.5-7.3-20.2-20.7-20-35.2l2.4-269.8c0.1-11.2,6.9-21.3,17.2-25.7l167.4-70.3c5.6-2.3,11.8,1.8,11.8,7.8v283.8C353.9,353.6,350.6,372.2,344,388.1z";
const SMILE = "M202.9,414.4c-0.3,0-0.5,0-0.8,0c-3.6-0.2-6.2-3.5-5.7-7l1.2-8.5l-1,7.5l0.2-1.7c0.4-3.2,3.2-5.5,6.4-5.4c14.1,0.7,52-0.1,78.3-25.3c2.3-2.2,5.9-2.2,8.3,0l2,1.8c2.7,2.4,2.7,6.6,0.1,9.2C261.6,414,219.8,415.2,202.9,414.4z";

export type RemotionLogoVariant = "intro" | "loading" | "success" | "blink";

export const UXGateLogoRemotion: React.FC<{ variant?: RemotionLogoVariant; size?: number; tone?: "color" | "white"; delay?: number }> = ({
  variant = "intro",
  size = 220,
  tone = "white",
  delay = 0,
}) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const ease = Easing.bezier(0.2, 0, 0, 1);
  const ink = tone === "white" ? "#FFFFFF" : "#005F99";

  let doorRotate = 0, doorOpacity = 1, eyeScale = 1, eyeX = 0, eyeY = 0, eyeScaleY = 1, smileScaleX = 1, hop = 0;

  if (variant === "intro") {
    doorRotate = interpolate(frame, [0, 0.7 * fps], [-80, 0], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    doorOpacity = interpolate(frame, [0, 0.28 * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    eyeScale = spring({ frame: frame - 0.56 * fps, fps, config: { damping: 9, stiffness: 160 } });
    smileScaleX = interpolate(frame, [0.82 * fps, 1.2 * fps], [0, 1], { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else if (variant === "loading") {
    const t = ((frame % (1.6 * fps)) / (1.6 * fps)) * Math.PI * 2;
    eyeX = -34 * Math.sin(t);
    eyeY = -10 * (1 - Math.cos(t)) / 2;
    smileScaleX = 1 - 0.09 * (1 - Math.cos(t));
  } else if (variant === "blink") {
    const f = frame % Math.round(4.2 * fps);
    eyeScaleY = interpolate(f, [3.78 * fps, 3.95 * fps, 4.12 * fps], [1, 0.1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  } else if (variant === "success") {
    hop = interpolate(frame, [0, 0.27 * fps, 0.5 * fps, 0.63 * fps, 0.9 * fps], [0, -40, 0, -8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    smileScaleX = interpolate(frame, [0.22 * fps, 0.54 * fps], [1, 1.18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  return (
    <div style={{ width: size, height: (size * 495) / 487.5, perspective: 600 }}>
      <svg viewBox="0 0 487.5 495" width={size} height={(size * 495) / 487.5} style={{ overflow: "visible", transform: `translateY(${hop}px)` }}>
        <defs>
          <linearGradient id="ugr-g" gradientUnits="userSpaceOnUse" x1="30.47" y1="49.45" x2="396.55" y2="351.54">
            <stop offset="0" stopColor="#60BEBB" />
            <stop offset="0.663" stopColor="#187CA4" />
            <stop offset="1" stopColor="#005F99" />
          </linearGradient>
        </defs>
        <g style={{ transformOrigin: "91px 250px", transform: `perspective(600px) rotateY(${doorRotate}deg)`, opacity: doorOpacity }}>
          <path fill={tone === "white" ? "#FFFFFF" : "url(#ugr-g)"} d={DOOR} />
        </g>
        <circle fill={ink} cx={228.4 + eyeX} cy={286 + eyeY} r={23.9} style={{ transformOrigin: "228.4px 286px", transform: `scale(${eyeScale}, ${eyeScale * eyeScaleY})` }} />
        <path fill={ink} d={SMILE} style={{ transformOrigin: "196px 396px", transform: `scaleX(${smileScaleX})` }} />
      </svg>
    </div>
  );
};
