"use client";
/* eslint-disable @next/next/no-img-element */

import { PathName } from "@/components/PathName";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { play } from "@/lib/sound";
import { chooseCurrentPath } from "@/app/[locale]/app/(shell)/paths/actions";

/** `where`: "Unit 2 · 30%" style line under the bar. */
export type Chip = { id: string; name: string; art: string; pct: number; current: boolean; where: string };

/**
 * "Your paths" on Home (design S3-2, PathsPages view home): one card per joined path with its art, name, a progress bar and
 * where the learner is. One tap makes another joined path current; nothing is lost on the others. "All paths" sits in the
 * section header. Phone: a swipe row with no scrollbar. Laptop: up to 3 cards (the current one first), then a dashed
 * "Add a path" tile.
 */
export function PathChips({ chips, label, addLabel, allLabel }: { chips: Chip[]; label: string; addLabel: string; allLabel: string }) {
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
      <div className="pg-sec"><p className="t-over">{label}</p><Link href="/app/paths" className="pg-link">{allLabel}</Link></div>
      <div className="prow">
        {chips.map((c, k) => (
          <button key={c.id} type="button" className={`pchip press${c.current ? " is-current" : ""}${k >= 3 ? " is-more" : ""}`} aria-pressed={c.current} aria-label={c.current ? t("currentAria", { name: c.name }) : t("switchTo", { name: c.name })} onClick={() => pick(c)} disabled={pending} aria-busy={(pending && busyId === c.id) || undefined}>
            <span className="pchip-top"><img src={c.art} alt="" /><span className="pchip-name"><PathName name={c.name ?? ""} /></span></span>
            <span className="progress progress-sm" aria-hidden="true"><i style={{ inlineSize: `${c.pct}%` }} /></span>
            <span className="pchip-sub">{c.current ? <span className="ph ph-check-circle-fill" style={{ color: "var(--link)" }} aria-hidden="true" /> : null}<span>{c.current ? `${t("current")} · ${c.where}` : c.where}</span></span>
          </button>
        ))}
        <Link href="/app/paths" className="pchip is-add press"><span className="ph ph-plus" aria-hidden="true" />{addLabel}</Link>
      </div>
      {failed ? <p className="ob-err" role="alert">{t("failed")}</p> : null}
    </section>
  );
}
