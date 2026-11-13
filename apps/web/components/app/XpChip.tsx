"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * The XP count in the Home header. A tap (or keyboard focus and Enter) opens a small note that says what XP is for,
 * with a link to how today's XP was counted (design S3-19 frame 2, view homeXpTip). Esc or a tap outside closes it. Hover opens it too on a laptop.
 */
export function XpChip({ xp }: { xp: number }) {
  const t = useTranslations("home");
  // `hover` opens it while the pointer is over it (laptops); `pinned` keeps it open after a tap or click.
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;
  const setOpen = (v: boolean) => {
    setHover(v);
    setPinned(v);
  };
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <div
      ref={box}
      className="xp-tip-box"
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) setHover(true);
      }}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="stat stat-btn press"
        aria-expanded={open}
        aria-controls={id}
        aria-label={t("xpAria", { count: xp })}
        onClick={() => {
          if (pinned) setOpen(false);
          else setPinned(true);
        }}
      >
        <span className="ph ph-bolt-fill" style={{ color: "var(--hl-ledge)" }} aria-hidden="true" />
        <span className="num ltr">{xp} XP</span>
        <span className="ph ph-info ink-3" style={{ fontSize: 16 }} aria-hidden="true" />
      </button>
      <div id={id} className="xp-tip" role="dialog" aria-label={t("xpTipTitle")} hidden={!open}>
        <b className="xp-tip-t">
          <span className="ph ph-bolt-fill" aria-hidden="true" />
          {t("xpTipTitle")}
        </b>
        <span>{t("xpTipBody")}</span>
        <ul className="xp-tip-l">
          <li>{t("xpTip1")}</li>
          <li>{t("xpTip2")}</li>
          <li>{t("xpTip3")}</li>
        </ul>
        <Link href="/app/streak#numbers" className="pg-link">
          {t("xpTipLink")}
          <span className="ph ph-caret-right flip" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
