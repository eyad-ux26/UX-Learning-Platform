// UXGate logo motion for the web app (Next.js / React).
// Usage: <UXGateLogoMotion variant="loading" size={48} />  and import "./uxgate-logo-motion.css" once.
// Built from the original UXGate icon mark (door, eye, smile). Do not change the paths.
import * as React from "react";

export type LogoMotionVariant = "intro" | "loading" | "thinking" | "success" | "blink" | "still";

const DOOR = "M353.9,12.8c-3.6-3.5-223,26-257.8,30.7c-2.7,0.4-4.6,2.6-4.6,5.3v283.5c0,25.6,3.9,47.9,11.7,67c7.8,19.1,18.4,35,31.9,47.8c13.4,12.8,28.9,22.5,46.4,29c17.5,6.6,36.2,9.8,56.2,9.8c18.7,0,36.9-3.1,54.3-9.4c17.5-6.2,33-15.8,46.4-28.6c13.4-12.8,24-28.9,31.9-48.3c7.8-19.4,11.7-41.9,11.7-67.5V40.9C382,25.4,369.4,12.8,353.9,12.8L353.9,12.8z M344,388.1c-6.6,15.9-15.1,29-25.8,39.4c-10.6,10.3-23,18-37,23c-14.1,5-28.6,7.5-43.6,7.5c-15.6,0-30.6-2.7-45-8c-6.2-2.3-12-5-17.5-8.2c-12.5-7.3-20.2-20.7-20-35.2l2.4-269.8c0.1-11.2,6.9-21.3,17.2-25.7l167.4-70.3c5.6-2.3,11.8,1.8,11.8,7.8v283.8C353.9,353.6,350.6,372.2,344,388.1z";
const SMILE = "M202.9,414.4c-0.3,0-0.5,0-0.8,0c-3.6-0.2-6.2-3.5-5.7-7l1.2-8.5l-1,7.5l0.2-1.7c0.4-3.2,3.2-5.5,6.4-5.4c14.1,0.7,52-0.1,78.3-25.3c2.3-2.2,5.9-2.2,8.3,0l2,1.8c2.7,2.4,2.7,6.6,0.1,9.2C261.6,414,219.8,415.2,202.9,414.4z";
const SPARKS: Array<[number, number]> = [(30, 40), (410, 60), (20, 300), (420, 320), (230, -10)];

export function UXGateLogoMotion({
  variant = "intro",
  tone = "color",
  size = 48,
  label = "UXGate",
  className = "",
}: {
  variant?: LogoMotionVariant;
  /** "color" on light grounds, "white" on dark grounds and videos */
  tone?: "color" | "white";
  size?: number;
  /** Accessible name; pass "" when the logo is decorative next to a text label */
  label?: string;
  className?: string;
}) {
  const id = React.useId();
  const ink = tone === "white" ? "#FFFFFF" : "#005F99";
  const door = tone === "white" ? "#FFFFFF" : `url(#${id}-g)`;
  return (
    <svg
      viewBox="0 0 487.5 495"
      width={size}
      height={(size * 495) / 487.5}
      className={`ugm ugm--${variant} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1="30.47" y1="49.45" x2="396.55" y2="351.54">
          <stop offset="0" stopColor="#60BEBB" />
          <stop offset="0.102" stopColor="#54B3B7" />
          <stop offset="0.663" stopColor="#187CA4" />
          <stop offset="0.93" stopColor="#00669C" />
          <stop offset="1" stopColor="#005F99" />
        </linearGradient>
      </defs>
      {variant === "success" &&
        SPARKS.map(([x, y], i) => (
          <rect key={i} className={`spark s${i}`} x={x} y={y} width={26} height={26} rx={4} fill="#78E4FC" transform={`rotate(45 ${x + 13} ${y + 13})`} />
        ))}
      <g className="door">
        <path fill={door} d={DOOR} />
      </g>
      <circle className="eye" fill={ink} cx={228.4} cy={286} r={23.9} />
      <path className="smile" fill={ink} d={SMILE} />
    </svg>
  );
}
