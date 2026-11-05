"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CompareStep, Lesson, Locale, Mock, Option, QuestionStep, Step, TuneStep, OrderStep, SortStep, MatchStep, SpotStep } from "@uxgate/content/types";
import { getCast } from "@uxgate/content/cast";
import * as E from "../engine";
import { faceSrc, sayFace } from "../say";
import { MockView } from "./MockView";
import { VideoStepView, type VideoSource } from "./VideoStepView";
import { MatchAnswer, OrderAnswer, SortAnswer, SpotList } from "./Structured";
import { Rich } from "./Rich";

export type PlayerProps = {
  lesson: Lesson;
  locale: Locale;
  initial: E.LessonState;
  pathLabel: string;
  /** 1-based place of the lesson in its unit, for the header label. */
  lessonNo?: number;
  muted: boolean;
  onToggleMute: () => void;
  onSound: (name: string) => void;
  /** Called after every change so the app can save the position (resume). */
  onState: (s: E.LessonState) => void;
  /** Called for every committed answer; the app queues it for the server. */
  onEvent: (e: E.TryEvent) => void;
  onExit: () => void;
  onFinish: (s: E.LessonState) => void;
  /** "mastery": the round at the end of a unit (steps come from the re-test bank). Skill checks are `lesson.mode === "check"`. */
  variant?: "lesson" | "mastery";
  /** Sample lesson for a guest: no review requests, no confidence taps, a banner on top. */
  guest?: boolean;
  /** Saving chip in the header; undefined shows nothing. */
  saveStatus?: "saving" | "saved" | "offline";
  /** Sends "ask for a review". Resolves true when it was stored. Without it the link is hidden. */
  onReview?: (r: { stepId: string; answer: E.Answer; reason: string; note: string }) => Promise<boolean>;
  /** Asks the app for a signed address for a clip. Without it video steps show the "could not load" state. */
  videoSource?: (id: string) => Promise<VideoSource>;
  /** A short message from the app (for example "every answer is synced"), shown as a toast. */
  notice?: string | null;
  /** "Start over" in the welcome-back banner. Without it the banner has no button. */
  onStartOver?: () => void;
  /** The mastery round counts its steps in the header ("Question n of m"). */
};

const KEYS: Record<Locale, string[]> = { en: ["A", "B", "C", "D", "E"], ar: ["أ", "ب", "ج", "د", "هـ"] };
const VERDICT_DELAY = 150;

export function LessonPlayer({ lesson, locale, initial, pathLabel, lessonNo, muted, onToggleMute, onSound, onState, onEvent, onExit, onFinish, variant = "lesson", guest = false, saveStatus, onReview, onStartOver, videoSource, notice }: PlayerProps) {
  const t = useTranslations("player");
  const [state, setState] = useState(initial);
  const [whyOpen, setWhyOpen] = useState(false);
  const [mockOpen, setMockOpen] = useState(true);
  const [layer, setLayer] = useState<null | "exit" | "review">(null);
  const [toast, setToast] = useState<string | null>(null);
  const welcomeBack = initial.i > 0 && initial.steps.some((x) => x.phase !== "answering" || x.tries > 0);
  const [showBack, setShowBack] = useState(welcomeBack);
  const singleTry = E.isSingleTry(lesson);
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
  // On a phone the example screen folds into a "Show it again" bar once feedback is up, so the options and feedback fit (choose steps only).
  useEffect(() => {
    if (st.phase === "answering") setMockOpen(true);
    else if (question && step.type === "choose" && window.matchMedia("(max-width: 1023px)").matches) setMockOpen(false);
  }, [st.phase, st.tries, state.i, question, step.type]);
  // Feedback appeared: move focus to its main button so keyboard players keep going.
  useEffect(() => { if (st.phase === "wrong" || st.phase === "right" || st.phase === "revealed") sheetBtnRef.current?.focus({ preventScroll: true }); }, [st.phase, st.tries, state.i]);

  const doSelect = (id: string) => { onSound("select-snap"); commit({ state: E.select(lesson, state, id) }); };
  const doSelection = (sel: string[]) => { onSound("select-snap"); commit({ state: E.setSelection(lesson, state, sel) }); };
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
  const answered = state.steps.some((x) => x.tries > 0 || x.phase !== "answering");
  // Closing before any answer leaves at once; after the first answer it asks first. Esc and the back button close the question.
  const tryExit = () => (answered ? setLayer("exit") : onExit());
  useEffect(() => {
    if (!layer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLayer(null); };
    const onPop = () => setLayer(null);
    history.pushState({ lessonLayer: true }, "");
    window.addEventListener("keydown", onKey); window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("popstate", onPop); if (history.state?.lessonLayer) history.back(); };
  }, [layer]);
  const doRetry = () => commit({ state: E.retry(lesson, state) });
  const doReveal = () => { onSound("reveal-answer"); commit(E.reveal(lesson, state)); };
  const doNext = () => {
    const next = E.advance(lesson, state);
    commit({ state: next });
    if (next.done) onFinish(next);
  };

  const part = t(`part.${step.part}` as never);
  const finished = E.isFinished(step, st);
  const showSheet = question && (st.phase === "wrong" || st.phase === "right" || st.phase === "revealed" || st.phase === "saved" || st.phase === "missed");

  // Enter checks the answer from the answers list (the desktop hint on the Check button).
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || !question || st.phase !== "answering") return;
    const el = e.target as HTMLElement;
    if (!el.closest(".choices") || !E.canCheck(step, st)) return;
    e.preventDefault();
    doCheck();
  };

  return (
    <div className="player" data-phase={st.phase} onKeyDown={onEnter}>
      <header className="player-head">
        <button type="button" className="icon-btn plain" onClick={tryExit} aria-label={t("exit")}><span className="ph ph-x" aria-hidden="true" /></button>
        <div className="progress" role="progressbar" aria-label={t("progress")} aria-valuenow={state.i + (finished ? 1 : 0)} aria-valuemin={0} aria-valuemax={total}>
          <i style={{ width: `${((state.i + (finished ? 1 : 0)) / total) * 100}%` }} />
        </div>
        {saveStatus ? <span className={`lp-save${saveStatus === "offline" ? " is-offline" : ""}`} role="status"><span className={`ph ${saveStatus === "saving" ? "ph-arrows-clockwise" : saveStatus === "saved" ? "ph-cloud-check" : "ph-wifi-slash"}`} aria-hidden="true" />{t(`save.${saveStatus}` as never)}</span> : null}
        {lesson.mode === "check" || variant === "mastery" ? <span className="lp-mode"><span className={`ph ${variant === "mastery" ? "ph-target" : "ph-seal-check"}`} aria-hidden="true" />{t(variant === "mastery" ? "modeMastery" : "modeCheck")}</span> : null}
        {lessonNo && variant !== "mastery" ? <span className="t-small ink-3 player-label" title={t("headLabel", { path: pathLabel, n: lessonNo, title: lesson.title[locale] })}><span className="hash" aria-hidden="true">#</span>{t("headLabel", { path: pathLabel, n: lessonNo, title: lesson.title[locale] })}</span> : null}
        <span className="t-label num ink-2 player-count">{state.i + 1}/{total}</span>
        <button type="button" className="icon-btn plain" onClick={onToggleMute} aria-pressed={!muted} aria-label={muted ? t("soundOff") : t("soundOn")}>
          <span className={`ph ${muted ? "ph-speaker-slash" : "ph-speaker-high"}`} aria-hidden="true" />
        </button>
      </header>

      {guest ? <p className="lp-banner" role="note"><span className="ph ph-user-plus" aria-hidden="true" />{t("guestBanner")}</p> : null}
      {showBack && !guest ? (
        <p className="lp-banner" role="status"><span className="ph ph-hand-waving" aria-hidden="true" />{t("welcomeBack")}
          <button type="button" className="act" onClick={() => { setShowBack(false); setLayer(null); onStartOver?.(); }}>{t("startOver")}</button></p>
      ) : null}
      <main className="player-main">
        <p className="t-over player-over"><span className="ltr">{pathLabel}</span> · {variant === "mastery" ? t("masteryQ", { n: state.i + 1, total }) : part}</p>

        {step.type === "video" ? (
          <VideoStepView step={step} locale={locale} t={t as never} getSource={videoSource} headingRef={headingRef} />
        ) : step.type === "card" ? (
          <section className="player-col">
            {step.title ? <h1 ref={headingRef} tabIndex={-1} className="t-h2">{step.title[locale]}</h1> : null}
            {step.points?.length ? (
              <ul className="card-points">
                {step.points.map((p, k) => (
                  <li key={k}><span className={`ph ph-${p.icon}`} aria-hidden="true" /><span>{p[locale]}</span></li>
                ))}
              </ul>
            ) : step.body ? <Rich text={step.body} locale={locale} className="card-body" /> : null}
            {step.mock ? <MockView mock={step.mock} locale={locale} label={mockLabel} tag={t("exampleTag")} chip={t("mockChip")} /> : null}
          </section>
        ) : (
          <Question
            step={step} st={st} locale={locale} t={t} mockLabel={mockLabel}
            headingRef={headingRef} mockOpen={mockOpen} setMockOpen={setMockOpen}
            onSelect={doSelect} onReason={doReason} onSelection={doSelection}
            concept={step.part === "concept"}
          />
        )}
      </main>

      {showSheet ? (
        <Sheet
          step={step as QuestionStep} st={st} locale={locale} t={t} whyOpen={whyOpen} setWhyOpen={setWhyOpen}
          btnRef={sheetBtnRef} onHint={doHint} onReveal={doReveal} onRetry={doRetry} onNext={doNext}
          last={state.i === total - 1} lesson={lesson} onFlag={onReview ? () => setLayer("review") : undefined}
          dots={{ total, at: state.i }}
        />
      ) : (
        <footer className="player-foot">
          {question && step.confidence ? (
            <div className="conf" role="group" aria-label={t("sure")}>
              <span className="t-small conf-label">{st.conf === null && st.phase === "answering" ? t("surePick") : t("sure")}</span>
              {[0, 1, 2].map((k) => (
                <button key={k} type="button" className={`chip${st.conf === k ? " is-selected" : ""}`} aria-pressed={st.conf === k} onClick={() => doConf(k)}>{t(`conf.${k}` as never)}</button>
              ))}
            </div>
          ) : null}
          {question ? (
            <>
              {st.phase === "main_ok" ? <p className="t-small ink-2 foot-note">{t("reasonNote")}</p> : null}
              <button type="button" className="btn btn-primary btn-lg btn-block press" disabled={!E.canCheck(step, st)} onClick={doCheck}>{t("check")}<kbd className="key-hint" aria-hidden="true">{t("enterKey")}</kbd></button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={doNext}>{state.i === total - 1 ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
          )}
        </footer>
      )}

      {layer === "exit" ? <ExitLayer t={t} onKeep={() => setLayer(null)} onLeave={() => { setLayer(null); onExit(); }} /> : null}
      {layer === "review" && onReview ? (
        <ReviewLayer t={t} onClose={() => setLayer(null)} onSend={async (reason, note) => {
          const ok = await onReview({ stepId: step.id, answer: { sel: st.first?.sel ?? st.sel, reason: st.first?.reason ?? st.reason }, reason, note });
          setLayer(null);
          setToast(ok ? t("reviewSent") : t("reviewFailed"));
          setTimeout(() => setToast(null), 4000);
          return ok;
        }} />
      ) : null}
      {toast || notice ? <p className="lp-toast" role="status">{toast ?? notice}</p> : null}
    </div>
  );
}

function ExitLayer({ t, onKeep, onLeave }: { t: TFn; onKeep: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <>
      <div className="lp-scrim" onClick={onKeep} aria-hidden="true" />
      <div className="lp-over" role="dialog" aria-modal="true" aria-labelledby="exit-title">
        <h2 id="exit-title">{t("exitTitle")}</h2>
        <p className="t-body ink-2">{t("exitBody")}</p>
        <div className="actions">
          <button type="button" ref={ref} className="btn btn-primary btn-lg press" onClick={onKeep}>{t("exitKeep")}</button>
          <button type="button" className="btn btn-secondary btn-lg press" onClick={onLeave}>{t("exitLeave")}</button>
        </div>
      </div>
    </>
  );
}

const REASONS = ["answer_works", "unclear", "broken", "other"] as const;
export const NOTE_MAX = 280;

function ReviewLayer({ t, onClose, onSend }: { t: TFn; onClose: () => void; onSend: (reason: string, note: string) => Promise<boolean> }) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return (
    <>
      <div className="lp-scrim" onClick={onClose} aria-hidden="true" />
      <div className="lp-over" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <h2 id="review-title">{t("reviewTitle")}</h2>
        <p className="t-body ink-2">{t("reviewBody")}</p>
        <div className="lp-reasons" role="radiogroup" aria-label={t("reviewTitle")}>
          {REASONS.map((r, k) => (
            <button key={r} ref={k === 0 ? first : undefined} type="button" role="radio" aria-checked={reason === r} className="lp-radio" onClick={() => setReason(r)}>
              <span className={`ph ${reason === r ? "ph-radio-button-fill" : "ph-circle"}`} aria-hidden="true" />{t(`reason.${r}` as never)}
            </button>
          ))}
        </div>
        <label className="t-small ink-2" htmlFor="review-note">{t("reviewNote")}</label>
        <textarea id="review-note" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} />
        <p className="count num" aria-live="polite">{t("noteCount", { n: note.length, max: NOTE_MAX })}</p>
        <div className="actions">
          <button type="button" className="btn btn-primary btn-lg press" disabled={!reason || busy} onClick={async () => { setBusy(true); await onSend(reason, note); setBusy(false); }}><span className="ph ph-paper-plane-tilt" aria-hidden="true" />{t("reviewSend")}</button>
          <button type="button" className="btn btn-secondary btn-lg press" onClick={onClose}>{t("cancel")}</button>
        </div>
      </div>
    </>
  );
}

type TFn = ReturnType<typeof useTranslations<"player">>;

function Question({ step, st, locale, t, mockLabel, headingRef, mockOpen, setMockOpen, onSelect, onReason, onSelection }: {
  step: QuestionStep; st: E.StepState; locale: Locale; t: TFn; mockLabel: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>; mockOpen: boolean; setMockOpen: (v: boolean) => void;
  onSelect: (id: string) => void; onReason: (id: string) => void; onSelection: (sel: string[]) => void; concept?: boolean;
}) {
  const [spotList, setSpotList] = useState(false);
  const locked = st.phase !== "answering";
  const speaker = getCast(step.speaker);
  const face = sayFace(st);
  const options: { id: string; text: string; mock?: Mock }[] =
    step.type === "compare"
      ? (["a", "b"] as const).map((k) => ({ id: k, text: (step as CompareStep)[k].label?.[locale] ?? t(k === "a" ? "optionA" : "optionB") }))
      : "options" in step ? (step as TuneStep).options.map((o: Option) => ({ id: o.id, text: o.text[locale], mock: o.mock })) : [];
  const structured = step.type === "sort" || step.type === "order" || step.type === "match";
  const isSpot = step.type === "spot";

  // Tune: one live screen. It starts as the "now" example (or the start option) and is replaced by the picked option.
  let live: Mock | undefined;
  let source: Mock | undefined;
  if (step.type === "tune") {
    const tune = step as TuneStep;
    const cur = tune.options.find((o) => o.id === st.sel[0]) ?? tune.options.find((o) => o.id === tune.start) ?? (tune.mock ? undefined : tune.options[0]);
    live = cur ? cur.mock : tune.mock;
    if (tune.mock?.frame === "wide" && cur?.mock && cur.mock.frame !== "wide") source = tune.mock;
  } else if (step.mock) live = step.mock;

  const answerIds = step.type === "compare" ? [(step as CompareStep).answer] : Array.isArray(step.answer) ? (step.answer as string[]) : [];
  const cls = (id: string) => {
    const picked = st.sel.includes(id);
    if (st.phase === "answering" && (st.tried ?? []).includes(id)) return "is-dim";
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
  // Four or more short options sit two to a row, as in the design.
  const twoCol = options.length >= 4 && options.every((o) => o.text.length <= 22);
  const tried = (id: string) => (st.tried ?? []).includes(id);
  const firstOpen = options.findIndex((o) => !tried(o.id));

  return (
    <section className="player-grid">
      <div className="player-visual">
        {step.scenario ? (
          speaker ? (
            <div className="say">
              {/* The picture only repeats the speaker's name, so it has no alt text. */}
              <img className="say-face" key={face} data-face={face} src={faceSrc(speaker, face)} alt="" width={88} height={88} />
              <div className="say-bubble">
                <span className="say-name">{locale === "ar" ? speaker.ar : speaker.en} · {locale === "ar" ? speaker.role_ar : speaker.role_en}</span>
                <p className="scn">{step.scenario[locale]}</p>
              </div>
            </div>
          ) : <p className="scn">{step.scenario[locale]}</p>
        ) : null}
        {source ? <MockView mock={source} locale={locale} label={mockLabel} tag={t("exampleTag")} chip={t("mockChip")} /> : null}
        {step.type === "compare" ? (
          <div className="cmp">
            {(["a", "b"] as const).map((k, n) => (
              <figure key={k} className="cmp-item">
                <figcaption className="frame-label"><span className="ph ph-frame-corners" aria-hidden="true" />{options[n].text}</figcaption>
                <MockView mock={(step as CompareStep)[k].mock} locale={locale} label={`${mockLabel}: ${options[n].text}`} tag={t("exampleTag")} chip={t("mockChip")} />
              </figure>
            ))}
          </div>
        ) : isSpot && live && !spotList ? (
          <MockView
            mock={live} locale={locale} label={t("spotAria")} tag={t("exampleTag")} chip={t("mockChip")}
            regions={{
              selected: st.sel, locked,
              labels: Object.fromEntries((step as SpotStep).regions.map((r) => [r.id, r.label[locale]])),
              state: (id) => (st.phase === "answering" || st.phase === "main_ok" ? "" : st.sel.includes(id) ? ((step as SpotStep).answer.includes(id) ? "is-right" : "is-wrong") : st.phase === "revealed" && (step as SpotStep).answer.includes(id) ? "is-right" : ""),
              onPick: onSelect, rightWord: t("rightWord"), wrongWord: t("wrongWord"),
            }}
          />
        ) : showMock && live && !isSpot ? (
          <div aria-live={step.type === "tune" ? "polite" : undefined}>
            {step.type === "tune" ? <span className="frame-label"><span className="ph ph-play-circle" aria-hidden="true" />{t("livePreview")}</span> : null}
            <MockView mock={live} locale={locale} label={mockLabel} tag={t("exampleTag")} chip={t("mockChip")} />
          </div>
        ) : live ? (
          <button type="button" className="mock-again" onClick={() => setMockOpen(true)}><span className="mock-tag">{t("mockChip")}</span><span>{t("mockAgain")}</span><span className="ph ph-eye" aria-hidden="true" /></button>
        ) : null}
      </div>

      <div className="player-ask">
        <h1 ref={headingRef} tabIndex={-1} className="t-h3 prompt">{step.prompt[locale]}</h1>
        {st.hints > 0 && st.phase === "answering" ? <Hints step={step} count={st.hints} locale={locale} t={t} /> : null}
        {step.type === "sort" ? <SortAnswer step={step as SortStep} st={st} locale={locale} t={t as never} onChange={onSelection} /> : null}
        {step.type === "order" ? <OrderAnswer step={step as OrderStep} st={st} locale={locale} t={t as never} onChange={onSelection} /> : null}
        {step.type === "match" ? <MatchAnswer step={step as MatchStep} st={st} locale={locale} t={t as never} onChange={onSelection} /> : null}
        {isSpot ? (
          <>
            {spotList ? <SpotList step={step as SpotStep} st={st} locale={locale} t={t as never} onPick={onSelect} /> : null}
            <button type="button" className="lp-switch" onClick={() => setSpotList(!spotList)}><span className={`ph ${spotList ? "ph-eye" : "ph-list-bullets"}`} aria-hidden="true" />{t(spotList ? "spotScreen" : "spotUseList")}</button>
          </>
        ) : null}
        {!structured && !isSpot ? <div className={`choices${twoCol ? " two" : ""}`} role="radiogroup" aria-label={step.prompt[locale]} onKeyDown={(e) => !locked && onKeys(e, ids, onSelect, st.sel[0])}>
          {options.map((o, n) => {
            const icon = verdictIcon(o.id);
            const checked = st.sel.includes(o.id);
            return (
              <button
                key={o.id} type="button" role="radio" data-id={o.id}
                className={`choice press ${cls(o.id)}`} aria-checked={checked} aria-disabled={locked || tried(o.id) || undefined}
                tabIndex={checked || (!st.sel.length && n === firstOpen) ? 0 : -1}
                onClick={() => !locked && !tried(o.id) && onSelect(o.id)}
              >
                <span className="key" aria-hidden="true">{KEYS[locale][n]}</span>
                <span className="grow">{o.text}</span>
                {icon ? <span className="verdict"><span className={`ph ${icon}`} aria-hidden="true" /></span> : null}
              </button>
            );
          })}
        </div> : null}

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
                    <span className="key" aria-hidden="true">{KEYS[locale][n]}</span>
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
          <div className="comment-body"><span className="comment-title hint-title">{t("hintN", { n: k + 1, total: Math.min(2, step.hints?.length ?? 0) })}</span><span className="t-small">{h[locale]}</span></div>
        </div>
      ))}
    </>
  );
}

function Sheet({ step, st, locale, t, whyOpen, setWhyOpen, btnRef, onHint, onReveal, onRetry, onNext, last, lesson, onFlag, dots }: {
  step: QuestionStep; st: E.StepState; locale: Locale; t: TFn; whyOpen: boolean; setWhyOpen: (v: boolean) => void;
  btnRef: React.RefObject<HTMLButtonElement | null>; onHint: () => void; onReveal: () => void; onRetry: () => void; onNext: () => void; last: boolean;
  lesson: Lesson; onFlag?: () => void; dots: { total: number; at: number };
}) {
  const next = (
    <button type="button" ref={btnRef} className="btn btn-primary press" onClick={onNext}>{last ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
  );
  const flag = onFlag ? <button type="button" className="lp-flag" onClick={onFlag}><span className="ph ph-flag" aria-hidden="true" />{t("flag")}</button> : null;
  // Skill check: the answer is taken, nothing is judged.
  if (st.phase === "saved") {
    return (
      <section className="sheet sheet-in player-sheet" role="status">
        <div className="sheet-main">
          <div className="sheet-row"><p className="verdict-row"><span className="ph ph-cloud-check" aria-hidden="true" />{t("savedTitle")}</p></div>
          <p className="t-small ink-2">{t("noVerdict")}</p>
          <div className="lp-dots" aria-hidden="true">{Array.from({ length: dots.total }, (_, k) => <i key={k} className={k < dots.at ? "is-done" : k === dots.at ? "is-now" : ""} />)}</div>
        </div>
        <div className="sheet-actions">{next}</div>
      </section>
    );
  }
  // Mastery round: one try. The verdict shows, and the skill comes back once more.
  if (st.phase === "missed") {
    const mc = (step.misconceptions ?? []).find((m) => m.id === st.mc);
    return (
      <section className="sheet sheet-wrong sheet-in player-sheet" role="alert">
        <div className="sheet-main">
          <div className="sheet-row"><p className="verdict-row"><span className="ph ph-x-circle-fill" aria-hidden="true" />{t("wrongTitle")}</p></div>
          <p className="t-body sheet-text">{mc ? mc.feedback[locale] : t("genericWrong")}</p>
          <p className="t-small ink-2">{t("comesBack")}</p>
          {flag}
        </div>
        <div className="sheet-actions">{next}</div>
      </section>
    );
  }
  if (st.phase === "wrong") {
    const reasonStep = step.type === "compare" ? (step as CompareStep).reason : undefined;
    const partial = !!reasonStep && st.reason.length > 0;
    const mcList = partial ? reasonStep!.misconceptions : step.misconceptions;
    const mc = (mcList ?? []).find((m) => m.id === st.mc);
    return (
      <section className={`sheet sheet-wrong sheet-in player-sheet${st.hints > 0 ? " has-hints" : ""}`} role="alert">
        <div className="sheet-main">
          <div className="sheet-row">
            <p className="verdict-row"><span className="ph ph-x-circle-fill" aria-hidden="true" />{partial ? t("partialTitle") : t("wrongTitle")}</p>
            <span className="t-small num try-count">{t("tryOf", { n: Math.min(st.tries, 3) })}</span>
          </div>
          <p className="t-body sheet-text">{mc ? mc.feedback[locale] : t("genericWrong")}</p>
          <p className="t-small ink-2">{t("kept")}</p>
          {st.conf === 2 ? <p className="lp-sure"><span className="ph ph-warning-circle" aria-hidden="true" />{t("sureFirst")}</p> : null}
          {flag}
        </div>
        {st.hints > 0 ? <div className="sheet-hints"><Hints step={step} count={st.hints} locale={locale} t={t} /></div> : null}
        <div className="sheet-actions">
          {E.canHint(step, st, lesson) ? <button type="button" className="btn btn-secondary press" onClick={onHint}><span className="ph ph-bulb" aria-hidden="true" />{t("hint")}</button> : null}
          {E.canReveal(st) ? <button type="button" className="btn btn-secondary press" onClick={onReveal}><span className="ph ph-eye" aria-hidden="true" />{t("reveal")}</button> : null}
          <button type="button" ref={btnRef} className="btn btn-primary press" onClick={onRetry}>{t("retry")}</button>
        </div>
      </section>
    );
  }
  if (st.phase === "right") {
    return (
      <section className="sheet sheet-right sheet-in player-sheet" role="status">
        <div className="sheet-main">
          <div className="sheet-row">
            <p className="verdict-row"><span className="ph ph-check-circle-fill" aria-hidden="true" />{st.alsoOk ? t("alsoTitle") : t("rightTitle")}</p>
            <span className="pill pop"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr">+{st.xp} XP</span></span>
          </div>
          <p className="t-body sheet-text strong">{st.alsoOk ? st.alsoOk[locale] : step.correct[locale]}</p>
          {whyOpen ? <p className="t-small why-text">{step.explain[locale]}</p> : null}
        </div>
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary press" aria-expanded={whyOpen} onClick={() => setWhyOpen(!whyOpen)}>{t("why")}</button>
          <button type="button" ref={btnRef} className="btn btn-primary press" onClick={onNext}>{last ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
        </div>
      </section>
    );
  }
  return (
    <section className="sheet sheet-warn sheet-in player-sheet" role="status">
      <div className="sheet-main">
        <div className="sheet-row"><p className="verdict-row"><span className="ph ph-eye" aria-hidden="true" />{t("revealedTitle")}</p></div>
        <Rich text={step.explain} locale={locale} className="sheet-text card-body" />
      </div>
      <div className="sheet-actions">
        <button type="button" ref={btnRef} className="btn btn-primary press" onClick={onNext}>{last ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
      </div>
    </section>
  );
}

export type { Step };
export type { VideoSource };
