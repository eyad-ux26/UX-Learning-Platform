"use client";
/* eslint-disable @next/next/no-img-element */

import { PathName } from "@/components/PathName";
import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { play } from "@/lib/sound";
import { chooseCurrentPath } from "@/app/[locale]/app/(shell)/paths/actions";
import type { Chip } from "./PathChips";
import { doneNavProgress, startNavProgress } from "@/lib/nav-progress";

/** The path map header: shows the path you are looking at and lets you switch to another joined path. */
export function PathSwitcher({ chips, currentId, sub }: { chips: (Chip & { where: string })[]; currentId: string; sub?: string }) {
  const t = useTranslations("map");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const here = chips.find((c) => c.id === currentId) ?? chips[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  if (chips.length < 2) {
    return <div className="sw-name"><span className="t-label" style={{ fontSize: 18 }}><PathName name={here?.name ?? ""} /></span>{sub ? <span className="t-small ink-3 sub-clamp" style={{ fontSize: 13 }}>{sub}</span> : null}</div>;
  }
  const pick = (c: Chip) => {
    setOpen(false);
    if (c.id === currentId) return;
    // The progress line runs from the tap, through the save, until the new path's map is on screen.
    startNavProgress();
    start(async () => {
      const res = await chooseCurrentPath({ pathId: c.id });
      if (res.ok) { play("ui-tap"); router.push(`/app/path/${c.id}`); router.refresh(); } else doneNavProgress();
    });
  };
  return (
    <div ref={box} style={{ position: "relative", minInlineSize: 0 }}>
      <button type="button" className={`sw-btn press${open ? " is-open" : ""}`} aria-haspopup="true" aria-expanded={open} aria-label={t("switchLabel", { name: here?.name ?? "" })} onClick={() => setOpen(!open)} disabled={pending} aria-busy={pending || undefined}>
        
        {here ? <img src={here.art} alt="" /> : null}
        <span className="sw-name"><span className="t-label" style={{ fontSize: 17 }}><PathName name={here?.name ?? ""} /></span>{sub ? <small>{sub}</small> : null}</span>
        <span className="ph ph-caret caret" aria-hidden="true" />
      </button>
      {open ? (
        <div className="card sw-pop" role="group" aria-label={t("switchTitle")}>
          <p className="t-label">{t("switchTitle")}</p>
          <p className="t-small ink-2">{t("switchBody")}</p>
          <div className="sw-list">
            {chips.map((c) => (
              <button key={c.id} type="button" className={`sw-row${c.id === currentId ? " is-on" : ""}`} aria-current={c.id === currentId ? "true" : undefined} onClick={() => pick(c)}>
                
                <img src={c.art} alt="" /><span className="grow"><b><PathName name={c.name ?? ""} /></b><small className="t-small ink-3">{c.where}</small></span>
                {c.id === currentId ? <span className="ph ph-check-circle-fill" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{t("close")}</button>
        </div>
      ) : null}
    </div>
  );
}
