"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { initSound, play } from "@/lib/sound";

export type SampleStepProps = {
  where: string;
  face: string;
  speaker: string;
  scenario: string;
  question: string;
  keys: string[];
  options: string[];
  answer: number;
  why: string;
};

/** The one client island on a public path page: pick an option and Check, no account. Nothing is saved.
 *  Sounds only on a right answer (check-press, then answer-right); a wrong answer is silent. */
export function SampleStep({ where, face, speaker, scenario, question, keys, options, answer, why }: SampleStepProps) {
  const t = useTranslations("pathpage");
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => { initSound(); }, []);

  const right = checked && pick === answer;
  const choose = (i: number) => { setPick(i); setChecked(false); };
  const check = () => {
    if (pick === null) return;
    setChecked(true);
    if (pick === answer) { play("check-press"); window.setTimeout(() => play("answer-right"), 120); }
  };

  return (
    <div className="card pub-sample">
      <span className="frame-label"><span className="ph ph-frame-corners" aria-hidden="true" />{where}</span>
      <div className="say">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="say-face" src={face} alt="" width={56} height={56} loading="lazy" />
        <div className="say-bubble"><span className="say-name">{speaker}</span><p className="scn">{scenario}</p></div>
      </div>
      <p className="pub-sample-q" id="pp-sample-q">{question}</p>
      <div className="pub-sample-opts" role="group" aria-labelledby="pp-sample-q">
        {options.map((label, i) => {
          const state = checked ? (i === answer ? " is-right" : pick === i ? " is-wrong" : "") : pick === i ? " is-selected" : "";
          return (
            <button key={label} type="button" aria-pressed={pick === i} className={`choice press${state}`} onClick={() => choose(i)}>
              <span className="key" aria-hidden="true">{keys[i]}</span><span className="grow">{label}</span>
            </button>
          );
        })}
      </div>
      <div role="status" className="pub-sample-live">
        {checked ? <p className={`pub-sample-fb ${right ? "is-right" : "is-wrong"}`}><b>{right ? t("sRight") : t("sWrong")}</b> {why}</p> : null}
      </div>
      {!checked ? (
        <>
          <button type="button" className="btn btn-primary btn-block press" disabled={pick === null} onClick={check}>{t("checkInLesson")}</button>
          <p className="t-small ink-2 pub-center">{t("sampleNote")}</p>
        </>
      ) : (
        <Link href="/signup" className="btn btn-primary btn-block press">{t("startFree")}</Link>
      )}
    </div>
  );
}
