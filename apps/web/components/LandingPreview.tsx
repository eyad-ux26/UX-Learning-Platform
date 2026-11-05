"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { play } from "@/lib/sound";

type Pick = "b" | "c" | null;
const ANSWER = "c";

/** The landing's lesson preview: a working mini step. Pick one of two options, Check, then feedback in the card. Nothing is saved. */
export function LandingPreview() {
  const t = useTranslations("landing");
  const ar = useLocale() === "ar";
  const [pick, setPick] = useState<Pick>(null);
  const [checked, setChecked] = useState(false);
  const right = checked && pick === ANSWER;
  // Design audit P3: the two options shown are lettered A and B (not B and C).
  const keys = { b: ar ? "أ" : "A", c: ar ? "ب" : "B" } as const;
  const labels = { b: t("optB"), c: t("optC") } as const;

  const choose = (k: "b" | "c") => { if (checked) return; setPick(k); play("select-snap"); };
  const check = () => { if (!pick) return; setChecked(true); play(pick === ANSWER ? "answer-right" : "answer-wrong"); };
  const again = () => { setPick(null); setChecked(false); play("ui-tap"); };

  return (
    <>
      <section className="card preview-card" aria-label={t("previewLabel")}>
        {right ? <span className="cursor-tag preview-xp" aria-hidden="true"><span className="ph ph-cursor" /><b dir="ltr">+10 XP</b></span> : null}
        <div className="preview-top"><div className="progress progress-sm"><i style={{ width: "40%" }} /></div><span className="t-small num ink-3">4/10</span></div>
        <p className="t-over" style={{ color: "var(--link)" }}>{t("pOver")}</p>
        <p className="t-label preview-q" id="lp-q">{t("pQ")}</p>
        <div role="radiogroup" aria-labelledby="lp-q" className="preview-choices">
          {(["b", "c"] as const).map((k) => {
            // A wrong Check marks only the picked answer; the right one stays hidden for Try again, as in the lesson.
            const state = !checked ? (pick === k ? "is-selected" : "") : pick === k ? (k === ANSWER ? "is-right" : "is-wrong") : "is-dim";
            return (
              <button key={k} type="button" role="radio" aria-checked={pick === k} aria-disabled={checked} className={`choice press ${state}${!pick && k === "c" ? " is-hover" : ""}`} onClick={() => choose(k)}>
                <span className="key" aria-hidden="true">{keys[k]}</span><span className="grow">{labels[k]}</span>
                {checked && pick === k && k === ANSWER ? <span className="verdict"><span className="ph ph-check-circle-fill" aria-hidden="true" /></span> : null}
                {checked && pick === k && k !== ANSWER ? <span className="verdict"><span className="ph ph-x-circle-fill" aria-hidden="true" /></span> : null}
                {!pick && k === "c" ? (
                  <span className="you-cursor" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 3l16 7-7 2.5L10 20z" fill="#F59E2B" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg><span className="you-tag">{t("you")}</span></span>
                ) : null}
              </button>
            );
          })}
        </div>
        {!checked ? (
          <>
            <p className="t-small ink-2 try-it"><span className="ph ph-hand-tap" aria-hidden="true" />{t("tryIt")}</p>
            <button type="button" className="btn btn-primary btn-block press" disabled={!pick} onClick={check}>{t("check")}</button>
          </>
        ) : (
          <div className={`preview-fb ${right ? "is-right" : "is-wrong"}`} role="status">
            <p className="verdict-row"><span className={`ph ${right ? "ph-check-circle-fill" : "ph-x-circle-fill"}`} aria-hidden="true" />{right ? t("fbRight") : t("fbWrong")}</p>
            <p className="t-small ink-2">{right ? t("fbRightWhy") : t("fbWrongWhy")}</p>
            {right
              ? <Link href="/try" className="btn btn-right btn-block press">{t("keepGoing")}</Link>
              : <button type="button" className="btn btn-secondary btn-block press" onClick={again}>{t("tryAgain")}</button>}
          </div>
        )}
      </section>
      {!checked && !pick ? <div className="comment preview-hint" aria-hidden="true"><span className="pin"><span className="ph ph-bulb-fill" /></span><span className="t-small">{t("previewHint")}</span></div> : null}
    </>
  );
}
