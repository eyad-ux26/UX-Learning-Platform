"use client";
/* eslint-disable @next/next/no-img-element */

import { PathName } from "@/components/PathName";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { play } from "@/lib/sound";
import { chooseCurrentPath } from "@/app/[locale]/app/(shell)/paths/actions";

export type Chip = { id: string; name: string; art: string; pct: number; current: boolean };

/** "Your paths": one tap makes another joined path current. Nothing is lost on the others. */
export function PathChips({ chips, label, addLabel }: { chips: Chip[]; label: string; addLabel: string }) {
  const t = useTranslations("paths");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pick = (c: Chip) => {
    if (c.current) return;
    setBusyId(c.id);
    start(async () => {
      setFailed(false);
      const res = await chooseCurrentPath({ pathId: c.id });
      if (!res.ok) { setFailed(true); return; }
      play("ui-tap");
      router.refresh();
    });
  };
  return (
    <section aria-label={label} className="path-chips">
      <p className="t-over">{label}</p>
      <div className="chips-row">
        {chips.map((c) => (
          <button key={c.id} type="button" className={`chip press${c.current ? " is-selected" : ""}`} aria-pressed={c.current} aria-label={c.current ? t("currentAria", { name: c.name }) : t("switchTo", { name: c.name })} onClick={() => pick(c)} disabled={pending} aria-busy={(pending && busyId === c.id) || undefined}>
            
            <img src={c.art} alt="" style={{ inlineSize: 24, blockSize: 24 }} /><PathName name={c.name ?? ""} /><span className="num t-small">{c.pct}%</span>
          </button>
        ))}
        <a className="chip" href="paths" onClick={(e) => { e.preventDefault(); router.push("/app/paths"); }}><span className="ph ph-plus" aria-hidden="true" />{addLabel}</a>
      </div>
      {failed ? <p className="ob-err" role="alert">{t("failed")}</p> : null}
    </section>
  );
}
