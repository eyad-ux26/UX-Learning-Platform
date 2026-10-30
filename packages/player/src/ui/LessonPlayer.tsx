"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CompareStep, Lesson, Locale, Mock, Option, QuestionStep, Step, TuneStep } from "@uxgate/content/types";
import * as E from "../engine";
import { MockView } from "./MockView";
import { Rich } from "./Rich";

export type PlayerProps = {
  lesson: Lesson;
  locale: Locale;
  initial: E.LessonState;
  pathLabel: string;
  muted: boolean;
  onToggleMute: () => void;
  onSound: (name: string) => void;
  /** Called after every change so the app can save the position (resume). */
  onState: (s: E.LessonState) => void;
  /** Called for every committed answer; the app queues it for the server. */
  onEvent: (e: E.TryEvent) => void;
  onExit: () => void;
  onFinish: (s: E.LessonState) => void;
};

const KEYS: Record<Locale, string[]> = { en: ["A", "B", "C", "D", "E"], ar: ["أ", "ب", "ج", "د", "هـ"] };
const VERDICT_DELAY = 150;

export function LessonPlayer({ lesson, locale, initial, pathLabel, muted, onToggleMute, onSound, onState, onEvent, onExit, onFinish }: PlayerProps) {
  const t = useTranslations("player");
  const [state, setState] = useState(initial);
  const [whyOpen, setWhyOpen] = useState(false);
  const [mockOpen, setMockOpen] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sheetBtnRef = useRef<HTMLButtonElement>(null);

  const step = lesson.steps[state.i];
  const st = state.steps[state.i];
  const question = E.isQuestion(step);
  const total = lesson.steps.length;
  const mockLabel = t("exampleScreen");

  const commit = useCallback((tr: E.Transition) => {
    setState(tr.state);
    onState(tr.state);
    if (tr.event) onEvent(tr.event);
  }, [onState, onEvent]);

  // New step: reset local view state and move focus to the heading so screen readers announce it.
  useEffect(() => { setWhyOpen(false); setMockOpen(true); headingRef.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [state.i]);
  // Feedback appeared: move focus to its main button so keyboard players keep going.
  useEffect(() => { if (st.phase === "wrong" || st.phase === "right" || st.phase === "revealed") sheetBtnRef.current?.focus({ preventScroll: true }); }, [st.phase, st.tries, state.i]);

  const doSelect = (id: string) => { onSound("select-snap"); commit({ state: E.select(lesson, state, id) }); };
  const doReason = (id: string) => { onSound("select-snap"); commit({ state: E.selectReason(lesson, state, id) }); };
  const doConf = (k: number) => commit({ state: E.setConfidence(state, k) });
  const doCheck = () => {
    onSound("check-press");
    const tr = E.check(lesson, state);
    commit(tr);
    const nst = tr.state.steps[tr.state.i];
    const verdict = nst.phase === "right" ? (nst.alsoOk ? "answer-also-works" : "answer-right") : nst.phase === "wrong" ? "answer-wrong" : null;
    if (verdict) setTimeout(() => onSound(verdict), VERDICT_DELAY);
  };
  const doHint = () => { onSound("hint-open"); commit({ state: E.hint(lesson, state) }); };
  const doRetry = () => commit({ state: E.retry(state) });
  const doReveal = () => { onSound("reveal-answer"); commit(E.reveal(lesson, state)); };
  const doNext = () => {
    const next = E.advance(lesson, state);
    commit({ state: next });
    if (next.done) onFinish(next);
  };

  const part = t(`part.${step.part}` as never);
  const finished = E.isFinished(step, st);
  const showSheet = question && (st.phase === "wrong" || st.phase === "right" || st.phase === "revealed");

  return (
    <div className="player" data-phase={st.phase}>
      <header className="player-head">
        <button type="button" className="icon-btn plain" onClick={onExit} aria-label={t("exit")}><span className="ph ph-x" aria-hidden="true" /></button>
        <div className="progress" role="progressbar" aria-label={t("progress")} aria-valuenow={state.i + (finished ? 1 : 0)} aria-valuemin={0} aria-valuemax={total}>
          <i style={{ width: `${((state.i + (finished ? 1 : 0)) / total) * 100}%` }} />
        </div>
        <span className="t-label num ink-2 player-count">{state.i + 1}/{total}</span>
        <button type="button" className="icon-btn plain" onClick={onToggleMute} aria-pressed={!muted} aria-label={muted ? t("soundOff") : t("soundOn")}>
          <span className={`ph ${muted ? "ph-speaker-slash" : "ph-speaker-high"}`} aria-hidden="true" />
        </button>
      </header>

      <main className="player-main">
        <p className="t-over player-over"><span className="ltr">{pathLabel}</span> · {part}</p>

        {step.type === "card" ? (
          <section className="player-col">
            {step.title ? <h1 ref={headingRef} tabIndex={-1} className="t-h2">{step.title[locale]}</h1> : null}
            <Rich text={step.body} locale={locale} className="card-body" />
            {step.mock ? <MockView mock={step.mock} locale={locale} label={mockLabel} tag={t("exampleTag")} /> : null}
          </section>
        ) : (
          <Question
            step={step} st={st} locale={locale} t={t} mockLabel={mockLabel}
            headingRef={headingRef} mockOpen={mockOpen} setMockOpen={setMockOpen}
            onSelect={doSelect} onReason={doReason}
          />
        )}
      </main>

      {showSheet ? (
        <Sheet
          step={step as QuestionStep} st={st} locale={locale} t={t} whyOpen={whyOpen} setWhyOpen={setWhyOpen}
          btnRef={sheetBtnRef} onHint={doHint} onReveal={doReveal} onRetry={doRetry} onNext={doNext}
          last={state.i === total - 1}
        />
      ) : (
        <footer className="player-foot">
          {question && step.confidence ? (
            <div className="conf" role="group" aria-label={t("sure")}>
              <span className="t-small conf-label">{t("sure")}</span>
              {[0, 1, 2].map((k) => (
                <button key={k} type="button" className={`chip${st.conf === k ? " is-selected" : ""}`} aria-pressed={st.conf === k} onClick={() => doConf(k)}>{t(`conf.${k}` as never)}</button>
              ))}
            </div>
          ) : null}
          {question ? (
            <>
              {st.phase === "main_ok" ? <p className="t-small ink-2 foot-note">{t("reasonNote")}</p> : null}
              <button type="button" className="btn btn-primary btn-lg btn-block press" disabled={!E.canCheck(step, st)} onClick={doCheck}>{t("check")}</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={doNext}>{state.i === total - 1 ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
          )}
        </footer>
      )}
    </div>
  );
}

type TFn = ReturnType<typeof useTranslations<"player">>;

function Question({ step, st, locale, t, mockLabel, headingRef, mockOpen, setMockOpen, onSelect, onReason }: {
  step: QuestionStep; st: E.StepState; locale: Locale; t: TFn; mockLabel: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>; mockOpen: boolean; setMockOpen: (v: boolean) => void;
  onSelect: (id: string) => void; onReason: (id: string) => void;
}) {
  const locked = st.phase !== "answering";
  const options: { id: string; text: string; mock?: Mock }[] =
    step.type === "compare"
      ? (["a", "b"] as const).map((k) => ({ id: k, text: (step as CompareStep)[k].label?.[locale] ?? t(k === "a" ? "optionA" : "optionB") }))
      : (step as TuneStep).options.map((o: Option) => ({ id: o.id, text: o.text[locale], mock: o.mock }));

  // Tune: one live screen. It starts as the "now" example (or the start option) and is replaced by the picked option.
  let live: Mock | undefined;
  let source: Mock | undefined;
  if (step.type === "tune") {
    const tune = step as TuneStep;
    const cur = tune.options.find((o) => o.id === st.sel[0]) ?? tune.options.find((o) => o.id === tune.start) ?? (tune.mock ? undefined : tune.options[0]);
    live = cur ? cur.mock : tune.mock;
    if (tune.mock?.frame === "wide" && cur?.mock && cur.mock.frame !== "wide") source = tune.mock;
  } else if (step.mock) live = step.mock;

  const answerIds = step.type === "compare" ? [(step as CompareStep).answer] : (step as TuneStep).answer;
  const cls = (id: string) => {
    const picked = st.sel.includes(id);
    if (st.phase === "revealed") return answerIds.includes(id) ? "is-right" : "is-dim";
    if (st.phase === "right") return picked ? "is-right" : "is-dim";
    if (st.phase === "wrong" && picked && !(step.type === "compare" && (step as CompareStep).reason && st.reason.length)) return "is-wrong";
    if (st.phase === "main_ok") return picked ? "is-right" : "is-dim";
    return picked ? "is-selected" : "";
  };
  const verdictIcon = (id: string) => (cls(id) === "is-right" ? "ph-check-circle-fill" : cls(id) === "is-wrong" ? "ph-x-circle-fill" : null);

  const onKeys = (e: React.KeyboardEvent, ids: string[], pick: (id: string) => void, current: string | undefined) => {
    const rtl = locale === "ar";
    const fwd = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const back = e.key === "ArrowUp" || e.key === (rtl ? "ArrowRight" : "ArrowLeft");
    if (!fwd && !back) return;
    e.preventDefault();
    const at = Math.max(0, ids.indexOf(current ?? ids[0]));
    const to = ids[(at + (fwd ? 1 : ids.length - 1)) % ids.length];
    pick(to);
    requestAnimationFrame(() => (e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-id="${to}"]`)?.focus());
  };

  const showMock = live && (mockOpen || step.type === "tune" || step.type === "compare");
  const reason = step.type === "compare" ? (step as CompareStep).reason : undefined;
  const ids = options.map((o) => o.id);

  return (
    <section className="player-grid">
      <div className="player-visual">
        {step.scenario ? <p className="t-small ink-2 scenario">{step.scenario[locale]}</p> : null}
        {source ? <MockView mock={source} locale={locale} label={mockLabel} tag={t("exampleTag")} /> : null}
        {step.type === "compare" ? (
          <div className="cmp">
            {(["a", "b"] as const).map((k, n) => (
              <figure key={k} className="cmp-item">
                <figcaption className="frame-label"><span className="ph ph-frame-corners" aria-hidden="true" />{options[n].text}</figcaption>
                <MockView mock={(step as CompareStep)[k].mock} locale={locale} label={`${mockLabel}: ${options[n].text}`} tag={t("exampleTag")} />
              </figure>
            ))}
          </div>
        ) : showMock && live ? (
          <div aria-live={step.type === "tune" ? "polite" : undefined}>
            {step.type === "tune" ? <span className="frame-label"><span className="ph ph-play-circle" aria-hidden="true" />{t("livePreview")}</span> : null}
            <MockView mock={live} locale={locale} label={mockLabel} tag={t("exampleTag")} />
          </div>
        ) : live ? (
          <button type="button" className="mock-again" onClick={() => setMockOpen(true)}><span className="mock-tag">{t("exampleTag")}</span><span>{t("mockAgain")}</span><span className="ph ph-eye" aria-hidden="true" /></button>
        ) : null}
      </div>

      <div className="player-ask">
        <h1 ref={headingRef} tabIndex={-1} className="t-h3 prompt">{step.prompt[locale]}</h1>
        {st.hints > 0 && st.phase === "answering" ? <Hints step={step} count={st.hints} locale={locale} t={t} /> : null}
        <div className="choices" role="radiogroup" aria-label={step.prompt[locale]} onKeyDown={(e) => !locked && onKeys(e, ids, onSelect, st.sel[0])}>
          {options.map((o, n) => {
            const icon = verdictIcon(o.id);
            const checked = st.sel.includes(o.id);
            return (
              <button
                key={o.id} type="button" role="radio" data-id={o.id}
                className={`choice press ${cls(o.id)}`} aria-checked={checked} aria-disabled={locked || undefined}
                tabIndex={checked || (!st.sel.length && n === 0) ? 0 : -1}
                onClick={() => !locked && onSelect(o.id)}
              >
                <span className="key">{KEYS[locale][n]}</span>
                <span className="grow">{o.text}</span>
                {icon ? <span className="verdict"><span className={`ph ${icon}`} aria-hidden="true" /></span> : null}
              </button>
            );
          })}
        </div>

        {reason && (st.phase === "main_ok" || (st.phase === "wrong" && st.reason.length) || (st.phase === "right" && st.reason.length)) ? (
          <div className="reason">
            <p className="reason-note">{t("reasonNow")}</p>
            <h2 className="t-label">{reason.prompt[locale]}</h2>
            <div className="choices" role="radiogroup" aria-label={reason.prompt[locale]}
              onKeyDown={(e) => st.phase === "main_ok" && onKeys(e, reason.options.map((o) => o.id), onReason, st.reason[0])}>
              {reason.options.map((o, n) => {
                const checked = st.reason.includes(o.id);
                const done = st.phase === "right";
                return (
                  <button key={o.id} type="button" role="radio" data-id={o.id}
                    className={`choice press ${done ? (checked ? "is-right" : "is-dim") : st.phase === "wrong" && checked ? "is-wrong" : checked ? "is-selected" : ""}`}
                    aria-checked={checked} aria-disabled={st.phase !== "main_ok" || undefined}
                    tabIndex={checked || (!st.reason.length && n === 0) ? 0 : -1}
                    onClick={() => st.phase === "main_ok" && onReason(o.id)}>
                    <span className="key">{KEYS[locale][n]}</span>
                    <span className="grow">{o.text[locale]}</span>
                    {done && checked ? <span className="verdict"><span className="ph ph-check-circle-fill" aria-hidden="true" /></span> : null}
                    {st.phase === "wrong" && checked ? <span className="verdict"><span className="ph ph-x-circle-fill" aria-hidden="true" /></span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Hints({ step, count, locale, t }: { step: QuestionStep; count: number; locale: Locale; t: TFn }) {
  return (
    <>
      {(step.hints ?? []).slice(0, count).map((h, k) => (
        <div key={k} className="comment">
          <span className="pin"><span className="ph ph-bulb-fill" aria-hidden="true" /></span>
          <div className="comment-body"><span className="comment-title">{t("hintN", { n: k + 1, total: Math.min(2, step.hints?.length ?? 0) })}</span><span className="t-small">{h[locale]}</span></div>
        </div>
      ))}
    </>
  );
}

function Sheet({ step, st, locale, t, whyOpen, setWhyOpen, btnRef, onHint, onReveal, onRetry, onNext, last }: {
  step: QuestionStep; st: E.StepState; locale: Locale; t: TFn; whyOpen: boolean; setWhyOpen: (v: boolean) => void;
  btnRef: React.RefObject<HTMLButtonElement | null>; onHint: () => void; onReveal: () => void; onRetry: () => void; onNext: () => void; last: boolean;
}) {
  if (st.phase === "wrong") {
    const reasonStep = step.type === "compare" ? (step as CompareStep).reason : undefined;
    const partial = !!reasonStep && st.reason.length > 0;
    const mcList = partial ? reasonStep!.misconceptions : step.misconceptions;
    const mc = (mcList ?? []).find((m) => m.id === st.mc);
    return (
      <section className="sheet sheet-wrong sheet-in player-sheet" role="alert">
        <div className="sheet-row">
          <p className="verdict-row"><span className="ph ph-x-circle-fill" aria-hidden="true" />{partial ? t("partialTitle") : t("wrongTitle")}</p>
          <span className="t-small num try-count">{t("tryOf", { n: Math.min(st.tries, 3) })}</span>
        </div>
        <p className="t-body sheet-text">{mc ? mc.feedback[locale] : t("genericWrong")}</p>
        <p className="t-small ink-2">{t("kept")}</p>
        <Hints step={step} count={st.hints} locale={locale} t={t} />
        <div className="sheet-actions">
          {E.canHint(step, st) ? <button type="button" className="btn btn-secondary press" onClick={onHint}><span className="ph ph-bulb" aria-hidden="true" />{t("hint")}</button> : null}
          {E.canReveal(st) ? <button type="button" className="btn btn-secondary press" onClick={onReveal}><span className="ph ph-eye" aria-hidden="true" />{t("reveal")}</button> : null}
          <button type="button" ref={btnRef} className="btn btn-primary press" onClick={onRetry}>{t("retry")}</button>
        </div>
      </section>
    );
  }
  if (st.phase === "right") {
    return (
      <section className="sheet sheet-right sheet-in player-sheet" role="status">
        <div className="sheet-row">
          <p className="verdict-row"><span className="ph ph-check-circle-fill" aria-hidden="true" />{st.alsoOk ? t("alsoTitle") : t("rightTitle")}</p>
          <span className="pill pop"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr">+{st.xp} XP</span></span>
        </div>
        <p className="t-body sheet-text strong">{st.alsoOk ? st.alsoOk[locale] : step.correct[locale]}</p>
        {whyOpen ? <p className="t-small why-text">{step.explain[locale]}</p> : null}
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary press" aria-expanded={whyOpen} onClick={() => setWhyOpen(!whyOpen)}>{t("why")}</button>
          <button type="button" ref={btnRef} className="btn btn-primary press" onClick={onNext}>{last ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
        </div>
      </section>
    );
  }
  return (
    <section className="sheet sheet-warn sheet-in player-sheet" role="status">
      <div className="sheet-row"><p className="verdict-row"><span className="ph ph-eye" aria-hidden="true" />{t("revealedTitle")}</p></div>
      <p className="t-body sheet-text">{step.explain[locale]}</p>
      <div className="sheet-actions">
        <button type="button" ref={btnRef} className="btn btn-primary press" onClick={onNext}>{last ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
      </div>
    </section>
  );
}

export type { Step };
