"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { resetTours } from "@/lib/lesson-tour";
import { markDone, resetPath, type TeamResult } from "@/app/[locale]/app/(shell)/settings/team/actions";

export type TeamPath = { id: string; name: string; units: number };

/** Testing tools for the team (admins): replay the tutorial, mark a path or its first units as done, reset a path. */
export function TeamTools({ userId, paths }: { userId: string; paths: TeamPath[] }) {
  const t = useTranslations("teamTools");
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [through, setThrough] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const run = (job: () => Promise<TeamResult>) => start(async () => {
    setMsg("");
    const r = await job();
    setMsg(r.ok ? t("done", { lessons: r.lessons, skipped: r.skipped }) : t("failed"));
    if (r.ok) router.refresh();
  });
  return (
    <div className="pg-stack">
      <p className="t-body ink-2">{t("lead")}</p>
      <div className="set">
        <button type="button" className="set-row" onClick={() => { resetTours(userId); router.push("/app"); }}>
          <span className="ph ph-arrow-counter-clockwise" aria-hidden="true" /><span className="set-l">{t("tour")}<small>{t("tourSub")}</small></span>
        </button>
      </div>
      {paths.map((p) => {
        const n = through[p.id] ?? 1;
        return (
          <section key={p.id} className="card" style={{ padding: 16, display: "grid", gap: 10 }} aria-labelledby={`tt-${p.id}`}>
            <h2 id={`tt-${p.id}`} className="t-h3">{p.name} <small className="ltr ink-2">{p.id}</small></h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <label htmlFor={`tt-n-${p.id}`} className="t-small ink-2">{t("through")}</label>
              <select id={`tt-n-${p.id}`} className="input" style={{ inlineSize: "auto" }} value={n} onChange={(e) => setThrough({ ...through, [p.id]: Number(e.target.value) })}>
                {Array.from({ length: p.units }, (_, i) => <option key={i + 1} value={i + 1}>{t("unit", { n: i + 1 })}</option>)}
              </select>
              <button type="button" className="btn btn-secondary btn-sm press" disabled={pending} onClick={() => run(() => markDone({ pathId: p.id, throughUnit: n }))}>{t("markThrough")}</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm press" disabled={pending} onClick={() => run(() => markDone({ pathId: p.id, throughUnit: null }))}>{t("markAll")}</button>
              <button type="button" className="btn btn-ghost btn-sm press" disabled={pending} onClick={() => run(() => resetPath({ pathId: p.id }))}>{t("reset")}</button>
            </div>
          </section>
        );
      })}
      <p className="t-small ink-2" role="status" aria-live="polite">{msg}</p>
    </div>
  );
}
