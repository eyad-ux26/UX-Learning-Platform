"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LogoMotion } from "./LogoMotion";

const TIPS = ["tip1", "tip2", "tip3", "tip4"] as const;

/**
 * UXGate's loading moment, drawn as a design-tool artboard: a frame with its name tag (the screen being opened),
 * a selection outline with corner handles, the logo's eye looking around inside, and a wireframe being sketched below by a
 * design-tool cursor.
 * A short line under the frame changes every two seconds. It fades in after 400 ms, so a fast load never flashes it.
 */
export function Loader({
  name,
  variant = "loading",
  full = false,
}: {
  name?: string;
  variant?: "loading" | "thinking";
  full?: boolean;
}) {
  const t = useTranslations("loading");
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`ug-loader${full ? " is-full" : ""}`}>
      <span className="sr-only" role="status">
        {t("label")}
      </span>
      <div className="ug-loader-art" aria-hidden="true">
        <span className="ug-loader-tag">
          <span className="ph ph-hash" />
          {name ?? "UXGate"}
        </span>
        <div className="ug-loader-frame sel-frame">
          <LogoMotion variant={variant} size={56} />
          <span className="skel ug-loader-line" />
          <span className="skel ug-loader-line is-short" />
          <span className="ug-loader-cursor">
            <span className="ph ph-cursor-fill" />
          </span>
        </div>
      </div>
      <p className="ug-loader-tip" aria-hidden="true" key={tip}>
        {t(TIPS[tip])}
      </p>
    </div>
  );
}
