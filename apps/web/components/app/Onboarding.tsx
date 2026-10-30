"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/Logo";
import { useRouter } from "@/i18n/navigation";
import { FOCUSES, GOALS, TIMES, type OnboardingInput } from "@/lib/onboarding";
import { play } from "@/lib/sound";
import { saveOnboarding } from "@/app/[locale]/onboarding/actions";

type Goal = (typeof GOALS)[number];
type Focus = (typeof FOCUSES)[number];
type Time = (typeof TIMES)[number];

const GOAL_ICON: Record<Goal, string> = { g1: "target", g2: "star", g3: "sparkle", g4: "map" };
const FOCUS_IMG: Record<Focus, string | null> = { forms: "path-forms", hier: "path-hierarchy", usab: "path-usability", none: null };
const FOCUS_NAME: Record<Focus, string> = { forms: "Forms That Flow", hier: "Visual Hierarchy in Action", usab: "Find and Fix Usability", none: "" };
const OPEN_PATHS = new Set<Focus>(["forms"]); // paths whose lessons exist today

export function Onboarding() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [time, setTime] = useState<Time | null>(null);
  const [dailyGoal, setDailyGoal] = useState<1 | 2 | 3>(1);
  const [reminder, setReminder] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const submit = (skipped: boolean) => {
    const input: OnboardingInput = {
      goal, focus, weeklyTime: time, dailyGoal, reminder: reminder || null, skipped,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    };
    setFailed(false);
    start(async () => {
      const res = await saveOnboarding(input);
      if (res.ok) router.push("/app"); else setFailed(true);
    });
  };
  const next = () => { play("ui-tap"); if (step === 3) submit(false); else setStep((step + 1) as 2 | 3); };
  const back = () => { play("ui-tap"); if (step > 1) setStep((step - 1) as 1 | 2); };

  const title = { 1: t("q1"), 2: t("q2"), 3: t("q3") }[step];
  const sub = { 1: t("q1sub"), 2: t("q2sub"), 3: t("q3sub") }[step];
  const rest = focus ? (focus === "none" ? <span>{t("sugg_none")}</span> : <>{t(`sugg_${focus}`).replace(/^[,،]\s*/, "")}</>) : null;
  const soon = focus && focus !== "none" && !OPEN_PATHS.has(focus) ? <span style={{ display: "block", marginBlockStart: 4 }}>{t("suggSoon")}</span> : null;
  const sugg = focus ? (
    <>
      {focus === "none" ? <span>{t("sugg_none")}</span> : <><b className="ltr">{FOCUS_NAME[focus]}</b>{t(`sugg_${focus}`)}</>}
      {focus !== "none" && !OPEN_PATHS.has(focus) ? <span style={{ display: "block", marginBlockStart: 4 }}>{t("suggSoon")}</span> : null}
    </>
  ) : null;

  return (
    <div className="ob">
      <header className="ob-head">
        {step > 1 ? <button type="button" className="icon-btn plain only-mobile" aria-label={t("back")} onClick={back}><span className="ph ph-arrow back" aria-hidden="true" /></button> : <span className="only-mobile" style={{ inlineSize: 44 }} />}
        <span className="only-desk"><Logo height={32} /></span>
        <div className="ob-bars" role="progressbar" aria-label={t("step", { n: step })} aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
          {[1, 2, 3].map((n) => <span key={n} className={n <= step ? "on" : undefined} />)}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ paddingInline: 12 }} onClick={() => submit(true)} disabled={pending}>{t("skip")}</button>
      </header>

      <div className="ob-main">
        <main className="ob-body">
          <p className="t-over num" style={{ color: "var(--link)" }}>{t("step", { n: step })}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBlockStart: -6 }}>
            <h1 className="t-h1 h1-s" aria-live="polite">{title}</h1>
            <p className="t-body ink-2">{sub}</p>
          </div>

          {step === 1 ? (
            <div className="ob-opts" role="radiogroup" aria-label={title}>
              {GOALS.map((g) => (
                <button key={g} type="button" role="radio" aria-checked={goal === g} className={`choice press sm${goal === g ? " is-selected" : ""}`} onClick={() => { setGoal(g); play("select-snap"); }}>
                  <span className="ob-ico"><span className={`ph ph-${GOAL_ICON[g]}`} aria-hidden="true" /></span>
                  <span className="grow ob-opt-t">{t(g)}</span>
                  <span className={`radio${goal === g ? " is-on" : ""}`} aria-hidden="true" style={{ minBlockSize: 0 }}><span className="dot" /></span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <>
              <div className="ob-opts" role="radiogroup" aria-label={title}>
                {FOCUSES.map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={focus === f} className={`choice press${focus === f ? " is-selected" : ""}`} onClick={() => { setFocus(f); play("select-snap"); }}>
                    <span className="ob-ico">{FOCUS_IMG[f] ? <img src={`/ill/uxgate-ill-${FOCUS_IMG[f]}.png`} alt="" /> : <span className="ph ph-question" aria-hidden="true" />}</span>
                    <span className="grow ob-opt-t">{t(`p_${f}`)}{f === "none" ? <small>{t("p_none_note")}</small> : null}</span>
                    <span className={`radio${focus === f ? " is-on" : ""}`} aria-hidden="true" style={{ minBlockSize: 0 }}><span className="dot" /></span>
                  </button>
                ))}
              </div>
              {sugg ? <div className="sugg only-mobile" role="status"><span className="ph ph-sparkle" aria-hidden="true" /><p className="t-small"><b>{t("weSuggest")}</b> {sugg}</p></div> : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="ob-label">{t("time")}</p>
              <div className="ob-opts" role="radiogroup" aria-label={t("time")}>
                {TIMES.map((x) => (
                  <button key={x} type="button" role="radio" aria-checked={time === x} className={`choice press sm${time === x ? " is-selected" : ""}`} onClick={() => { setTime(x); play("select-snap"); }}>
                    <span className="grow ob-opt-t" style={{ paddingInlineStart: 8 }}>{t(x)}</span>
                    <span className={`radio${time === x ? " is-on" : ""}`} aria-hidden="true" style={{ minBlockSize: 0 }}><span className="dot" /></span>
                  </button>
                ))}
              </div>
              <p className="ob-label">{t("goal")}</p>
              <div className="ob-opts" role="radiogroup" aria-label={t("goal")}>
                {([1, 2, 3] as const).map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={dailyGoal === n} className={`choice press sm${dailyGoal === n ? " is-selected" : ""}`} onClick={() => { setDailyGoal(n); play("select-snap"); }}>
                    <span className="grow ob-opt-t" style={{ paddingInlineStart: 8 }}>{t(`goal${n}`)}<small>{t(`goalNote${n}`)}</small></span>
                    <span className={`radio${dailyGoal === n ? " is-on" : ""}`} aria-hidden="true" style={{ minBlockSize: 0 }}><span className="dot" /></span>
                  </button>
                ))}
              </div>
              <div className="field">
                <label htmlFor="ob-reminder">{t("reminder")}</label>
                <div className="ob-time">
                  <div className="input" style={{ maxInlineSize: 200 }}><span className="ph ph-bell" aria-hidden="true" /><input id="ob-reminder" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} aria-describedby="ob-reminder-help" /></div>
                  {reminder ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReminder("")}>{t("reminderNone")}</button> : null}
                </div>
                <span id="ob-reminder-help" className="help">{t("reminderNote")}</span>
              </div>
            </>
          ) : null}
          {failed ? <p className="ob-err" role="alert">{t("saveFailed")}</p> : null}
        </main>

        {step === 2 && focus ? (
          <aside className="ob-side" aria-label={t("weSuggest")}>
            <span className="frame-label"><span className="ph ph-hash" aria-hidden="true" />{t("weSuggest")}</span>
            <section className="card-panel ob-side-card">
              {FOCUS_IMG[focus] ? <img src={`/ill/uxgate-ill-${FOCUS_IMG[focus]}.png`} alt="" /> : null}
              {FOCUS_NAME[focus] ? <p className="t-h3 ltr" style={{ color: "var(--panel-ink)" }}>{FOCUS_NAME[focus]}</p> : null}
              <p className="t-small" style={{ color: "var(--ink-2)" }}>{rest}{soon}</p>
            </section>
          </aside>
        ) : null}
      </div>

      <footer className="ob-foot">
        <div className="ob-foot-btns">
          <button type="button" className="btn btn-secondary btn-lg press" onClick={back} disabled={step === 1 || pending}>{t("back")}</button>
          <button type="button" className="btn btn-primary btn-lg press" onClick={next} disabled={pending || (step === 2 && !focus)}>{step === 3 ? t("finish") : t("cont")}</button>
        </div>
      </footer>
    </div>
  );
}
