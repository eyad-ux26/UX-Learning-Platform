"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CompareStep, Lesson, Locale, Mock, Option, QuestionStep, Step, TuneStep, OrderStep, SortStep, MatchStep, SpotStep } from "@uxgate/content/types";
import { getCast } from "@uxgate/content/cast";
import * as E from "../engine";
import { faceSrc, sayFace } from "../say";
import { MockView } from "./MockView";
import { VideoStepView, type VideoSource } from "./VideoStepView";
import { VideoSummary, readSummary } from "./VideoSummary";
import { MatchAnswer, OrderAnswer, SortAnswer, SpotList } from "./Structured";
import { Rich } from "./Rich";
import { LessonTour } from "./LessonTour";
import { IdeaCards } from "./IdeaCards";
import { readIdea } from "./idea";

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
  variant?: "lesson" | "mastery" | "review";
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
  /** The mastery round counts its steps in the header ("Question n of m"). */
  /** Shows the lesson in the other language without leaving it. Without it the header has no language button. */
  onSwitchLocale?: () => void;
  /** Runs the first-lesson tour at the first question: "guest" for the sample lesson, "first" for the first lesson after sign-in. `onTourDone` runs when it ends or is skipped. */
  tour?: "guest" | "first";
  onTourDone?: () => void;
};

/** "Welcome back": a calm note that closes by itself after 5 seconds, or with its close button. The timer pauses on hover and focus. */
function ResumeNote({ text, close, onClose }: { text: string; close: string; onClose: () => void }) {
  const paused = useRef(false);
  useEffect(() => {
    let left = 5000;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (!paused.current) left -= now - last;
      last = now;
      if (left <= 0) onClose();
    }, 100);
    return () => clearInterval(id);
  }, [onClose]);
  const hold = (v: boolean) => () => { paused.current = v; };
  return (
    <p className="lp-banner is-resume" role="status" onPointerEnter={hold(true)} onPointerLeave={hold(false)} onFocus={hold(true)} onBlur={hold(false)}>
      <span className="ph ph-hand-waving" aria-hidden="true" />{text}
      <button type="button" className="icon-btn plain lp-banner-x" aria-label={close} onClick={onClose}><span className="ph ph-x" aria-hidden="true" /></button>
      <span className="lp-banner-timer" aria-hidden="true" />
    </p>
  );
}

const KEYS: Record<Locale, string[]> = { en: ["A", "B", "C", "D", "E"], ar: ["أ", "ب", "ج", "د", "هـ"] };
const VERDICT_DELAY = 150;

export function LessonPlayer({ lesson, locale, initial, pathLabel, lessonNo, muted, onToggleMute, onSound, onState, onEvent, onExit, onFinish, variant = "lesson", guest = false, saveStatus, onReview, videoSource, notice, onSwitchLocale, tour, onTourDone }: PlayerProps) {
  const t = useTranslations("player");
  const [state, setState] = useState(initial);
  const [whyOpen, setWhyOpen] = useState(false);
  const [layer, setLayer] = useState<null | "exit" | "review" | "example">(null);
  // The example opened full screen from its phone thumbnail (design audit L4).
  const [example, setExample] = useState<{ mock: Mock; label: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // "Watch again" on a video summary plays the clip in place; the main button then goes back to the summary.
  const [replay, setReplay] = useState(false);
  const welcomeBack = initial.i > 0 && initial.steps.some((x) => x.phase !== "answering" || x.tries > 0);
  const [showBack, setShowBack] = useState(welcomeBack);
  const closeBack = useCallback(() => setShowBack(false), []);
  const [tourOn, setTourOn] = useState(!!tour);
  const endTour = useCallback(() => { setTourOn(false); onTourDone?.(); requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true })); }, [onTourDone]);
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
  useEffect(() => { setWhyOpen(false); setReplay(false); headingRef.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [state.i]);
  // Feedback appeared: move focus to its main button so keyboard players keep going.
  useEffect(() => { if (st.phase === "wrong" || st.phase === "right" || st.phase === "revealed") sheetBtnRef.current?.focus({ preventScroll: true }); }, [st.phase, st.tries, state.i]);

  const doSelect = (id: string) => { onSound("select-snap"); commit({ state: E.select(lesson, state, id) }); };
  const doSelection = (sel: string[]) => { onSound("select-snap"); commit({ state: E.setSelection(lesson, state, sel) }); };
  const doReason = (id: string) => { onSound("select-snap"); commit({ state: E.selectReason(lesson, state, id) }); };
  // Design audit L2: on confidence steps each part of the split Check button sets the confidence and checks in one press.
  const doCheck = (conf?: number) => {
    onSound("check-press");
    const tr = E.check(lesson, conf === undefined ? state : E.setConfidence(state, conf));
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
    const close = () => { setLayer(null); setExample(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onPop = () => close();
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
  // Design audit L3: a later step of the same case (same speaker, same scenario as the step before) shows the speaker as a one-line chip.
  const prev = state.i > 0 ? lesson.steps[state.i - 1] : undefined;
  const laterInCase = !!(step.scenario && step.speaker && prev?.scenario && prev.speaker === step.speaker && prev.scenario.en === step.scenario.en);
  const finished = E.isFinished(step, st);
  // Design S2-14: a concept card right after a clip is its video summary, drawn as cards.
  const summary = step.type === "card" && step.part === "concept" && prev?.type === "video" ? readSummary(step, locale) : null;
  // Design S2-15: any other text-only card (a body, no mock, no video summary) is drawn as an idea card.
  const idea = step.type === "card" && !summary && !step.points?.length ? readIdea(step, locale) : null;
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
        {saveStatus ? <span className={`lp-save${saveStatus === "offline" ? " is-offline" : ""}`} role="status"><span className={`ph ${saveStatus === "saving" ? "ph-arrows-clockwise" : saveStatus === "saved" ? "ph-cloud-check" : "ph-wifi-slash"}`} aria-hidden="true" /><span className="lp-save-txt">{t(`save.${saveStatus}` as never)}</span></span> : null}
        {lesson.mode === "check" || variant !== "lesson" ? <span className="lp-mode"><span className={`ph ${variant === "mastery" ? "ph-target" : variant === "review" ? "ph-review" : "ph-seal-check"}`} aria-hidden="true" />{t(variant === "mastery" ? "modeMastery" : variant === "review" ? "modeReview" : "modeCheck")}</span> : null}
        {lessonNo && variant === "lesson" ? <span className="t-small ink-3 player-label" title={t("headLabel", { path: pathLabel, n: lessonNo, title: lesson.title[locale] })}><span className="hash" aria-hidden="true">#</span>{t("headLabel", { path: pathLabel, n: lessonNo, title: lesson.title[locale] })}</span> : null}
        <span className="t-label num ink-2 player-count">{state.i + 1}/{total}</span>
        {onSwitchLocale ? (
          <button type="button" className="lp-lang press" onClick={onSwitchLocale} aria-label={t("langSwitchAria")} title={t("langSwitchAria")}>
            <span className="ph ph-globe" aria-hidden="true" /><span lang={locale === "ar" ? "en" : "ar"} className="lp-lang-long">{t("langSwitch")}</span><span lang={locale === "ar" ? "en" : "ar"} className="lp-lang-short" aria-hidden="true">{t("langSwitchShort")}</span>
          </button>
        ) : null}
        <button type="button" className="icon-btn plain" onClick={onToggleMute} aria-pressed={!muted} aria-label={muted ? t("soundOff") : t("soundOn")}>
          <span className={`ph ${muted ? "ph-speaker-slash" : "ph-speaker-high"}`} aria-hidden="true" />
        </button>
      </header>

      {guest ? <p className="lp-banner" role="note"><span className="ph ph-user-plus" aria-hidden="true" />{t("guestBanner")}</p> : null}
      {showBack && !guest ? <ResumeNote text={t("welcomeBack")} close={t("close")} onClose={closeBack} /> : null}
      <main className={`player-main${(summary && !replay) || idea ? " is-sum" : ""}`}>
        <p className="t-over player-over"><PathLabel name={pathLabel} /> · {variant !== "lesson" ? t(variant === "review" ? "reviewQ" : "masteryQ", { n: state.i + 1, total }) : part}</p>

        {step.type === "video" ? (
          <VideoStepView step={step} locale={locale} t={t as never} getSource={videoSource} headingRef={headingRef} />
        ) : summary && replay && prev?.type === "video" ? (
          <VideoStepView step={prev} locale={locale} t={t as never} getSource={videoSource} headingRef={headingRef} />
        ) : summary && step.type === "card" ? (
          <VideoSummary step={step} summary={summary} locale={locale} t={t as never} clipLength={prev?.type === "video" ? prev.duration : undefined}
            onReplay={() => { setReplay(true); requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true })); }} headingRef={headingRef} />
        ) : idea && step.type === "card" ? (
          <IdeaCards step={step} idea={idea} locale={locale} t={t as never} headingRef={headingRef} />
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
            headingRef={headingRef} laterInCase={laterInCase}
            onSelect={doSelect} onReason={doReason} onSelection={doSelection}
            onOpenExample={(mock, label) => { onSound("sheet-up"); setExample({ mock, label }); setLayer("example"); }}
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
          {question ? <CheckBar step={step} st={st} t={t} onCheck={doCheck} /> : (
            replay ? (
            <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={() => { setReplay(false); requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true })); }}>{t("sumBack")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={doNext}>{state.i === total - 1 ? t("finish") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
          )
          )}
        </footer>
      )}

      {tour && tourOn && question && st.phase === "answering" ? <LessonTour kind={tour} t={t as never} onDone={endTour} /> : null}
      {layer === "example" && example ? <ExampleLayer mock={example.mock} label={example.label} locale={locale} t={t} onClose={() => { onSound("sheet-down"); setLayer(null); setExample(null); }} /> : null}
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

type Box = { x: number; y: number; w: number; h: number };

/** The parts of the preview that differ between two mocks: the body blocks that changed, as boxes inside `root`. */
function changedBoxes(before: Mock | undefined, now: Mock | undefined, root: HTMLElement | null, rtl: boolean): Box[] {
  if (!before || !now || !root) return [];
  const kids = Array.from(root.querySelectorAll<HTMLElement>(".xm-body > *"));
  if (before.blocks.length !== now.blocks.length || kids.length !== now.blocks.length) return [];
  const rr = root.getBoundingClientRect();
  const out: Box[] = [];
  now.blocks.forEach((b, i) => {
    if (out.length >= 3 || JSON.stringify(b) === JSON.stringify(before.blocks[i])) return;
    const r = kids[i].getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    out.push({ x: Math.round(rtl ? rr.right - r.right : r.left - rr.left) - 3, y: Math.round(r.top - rr.top) - 3, w: Math.round(r.width) + 6, h: Math.round(r.height) + 6 });
  });
  return out;
}

type TFn = ReturnType<typeof useTranslations<"player">>;

function Question({ step, st, locale, t, mockLabel, headingRef, laterInCase, onSelect, onReason, onSelection, onOpenExample }: {
  step: QuestionStep; st: E.StepState; locale: Locale; t: TFn; mockLabel: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>; laterInCase: boolean;
  onSelect: (id: string) => void; onReason: (id: string) => void; onSelection: (sel: string[]) => void;
  onOpenExample: (mock: Mock, label: string) => void;
}) {
  const [spotList, setSpotList] = useState(false);
  const [sayOpen, setSayOpen] = useState(false);
  useEffect(() => setSayOpen(false), [step.id]);
  const prevWrap = useRef<HTMLDivElement>(null);
  const prevSeen = useRef<{ step: string; id?: string; mock?: Mock }>({ step: step.id });
  const [flash, setFlash] = useState<{ n: number; boxes: Box[] } | null>(null);
  const [said, setSaid] = useState("");
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

  // Tune: when the picked choice changes the screen, say so. The frame glows once, the changed part gets a dashed outline and a tag
  // for about 1.5 s, and a polite line tells screen readers. Under reduced motion the glow is off (CSS); the tag and the chip stay.
  const tunePick = step.type === "tune" ? st.sel[0] : undefined;
  const tuneKey = tunePick ? KEYS[locale][(step as TuneStep).options.findIndex((o) => o.id === tunePick)] : undefined;
  useLayoutEffect(() => {
    if (step.type !== "tune") return;
    const before = prevSeen.current;
    prevSeen.current = { step: step.id, id: tunePick, mock: live };
    if (before.step !== step.id || before.id === tunePick || !tunePick) { setFlash(null); return; }
    const boxes = changedBoxes(before.mock, live, prevWrap.current, locale === "ar");
    setFlash({ n: Date.now(), boxes });
    const text = (step as TuneStep).options.find((o) => o.id === tunePick)?.text[locale] ?? "";
    setSaid(t("previewChanged", { key: tuneKey ?? "", text }));
    const id = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tunePick, step.id]);

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

  const reason = step.type === "compare" ? (step as CompareStep).reason : undefined;
  const ids = options.map((o) => o.id);
  // Four or more short options sit two to a row, as in the design.
  const twoCol = options.length >= 4 && options.every((o) => o.text.length <= 22);
  const tried = (id: string) => (st.tried ?? []).includes(id);
  const firstOpen = options.findIndex((o) => !tried(o.id));

  return (
    <section className="player-grid">
      {step.scenario ? <div className="player-say">
        {(
          speaker && laterInCase && !sayOpen ? (
            <button type="button" className="say-chip" aria-expanded={false} aria-label={t("sayAria", { name: locale === "ar" ? speaker.ar : speaker.en })} onClick={() => setSayOpen(true)}>
              <img src={faceSrc(speaker, face)} alt="" width={32} height={32} />
              <b>{locale === "ar" ? speaker.ar : speaker.en}</b>
              <span className="txt">{step.scenario[locale]}</span>
              <span className="ph ph-caret" aria-hidden="true" />
            </button>
          ) : speaker ? (
            <div className="say">
              {/* The picture only repeats the speaker's name, so it has no alt text. */}
              <img className="say-face" key={face} data-face={face} src={faceSrc(speaker, face)} alt="" width={88} height={88} />
              <div className="say-bubble">
                <span className="say-name">{locale === "ar" ? speaker.ar : speaker.en} · {locale === "ar" ? speaker.role_ar : speaker.role_en}</span>
                <p className="scn">{step.scenario[locale]}</p>
              </div>
            </div>
          ) : <p className="scn">{step.scenario[locale]}</p>
        )}
      </div> : null}
      <div className="player-visual">
        {source ? <Example mock={source} locale={locale} t={t} label={mockLabel} onOpen={onOpenExample} /> : null}
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
        ) : live && !isSpot ? (
          <div ref={prevWrap} className={`gd-prev${step.type === "tune" ? " is-tune" : ""}${flash ? " is-glow" : ""}`} key={step.type === "tune" ? `g${flash?.n ?? 0}` : undefined}>
            {step.type === "tune" ? (
              <div className="gd-prev-head">
                <span className="frame-label lp-live-label"><span className="ph ph-play-circle" aria-hidden="true" />{t("livePreview")}</span>
                {tuneKey ? <span className={`gd-showing${flash ? " is-new" : ""}`}><i className="gd-dot" aria-hidden="true" />{t("showing", { key: tuneKey })}</span> : null}
              </div>
            ) : null}
            <Example mock={live} locale={locale} t={t} label={step.type === "tune" ? t("livePreview") : mockLabel} onOpen={onOpenExample} />
            {flash ? flash.boxes.map((b, k) => (
              <span key={k} className="gd-changed-box" aria-hidden="true" style={{ insetInlineStart: b.x, insetBlockStart: b.y, inlineSize: b.w, blockSize: b.h }}>
                {k === 0 ? <span className="gd-changed">{t("changedTag")}</span> : null}
              </span>
            )) : null}
            {step.type === "tune" ? <span className="lp-sr" role="status" aria-live="polite">{said}</span> : null}
          </div>
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
                {step.type === "tune" && !icon ? (checked
                  ? <span className="gd-inprev"><span className="ph ph-eye" aria-hidden="true" />{t("inPreview")}</span>
                  : <span className="ph ph-eye gd-peek" aria-hidden="true" />) : null}
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

/** Design audit L2 + U4: the Check bar. Confidence steps get one split primary button (each part checks with that confidence);
 *  other steps keep Check, and a disabled Check says what is missing. */
function CheckBar({ step, st, t, onCheck }: { step: QuestionStep; st: E.StepState; t: TFn; onCheck: (conf?: number) => void }) {
  const helpId = `lp-help-${step.id}`;
  if (step.confidence && st.phase === "answering") {
    const ready = E.canCheck(step, { ...st, conf: 0 });
    const lblId = `lp-go-${step.id}`;
    return (
      <div className="lp-go">
        <div className="lp-go-head">
          <p className="lp-go-lbl" id={lblId}>{t("goLbl")}</p>
          {!ready ? <p className="lp-go-wait" id={helpId}>{t("pickFirstConf")}</p> : null}
        </div>
        <div className={`split-check${ready ? "" : " is-off"}`} role="group" aria-labelledby={lblId}>
          {[0, 1, 2].map((k) => {
            const label = t(`conf.${k}` as never) as string;
            return (
              <button key={k} type="button" className="split-seg" disabled={!ready} aria-label={t("confAria", { level: label.toLowerCase() })}
                aria-describedby={ready ? undefined : helpId} onClick={() => onCheck(k)}>{label}</button>
            );
          })}
        </div>
      </div>
    );
  }
  const ready = E.canCheck(step, st);
  const help = ready || st.phase !== "answering" ? null
    : step.type === "sort" ? t("placedOf", { n: st.sel.length, total: (step as SortStep).items.length })
    : step.type === "match" ? t("pairedOf", { n: st.sel.length, total: (step as MatchStep).left.length })
    : t("pickFirst");
  return (
    <>
      {st.phase === "main_ok" ? <p className="t-small ink-2 foot-note">{t("reasonNote")}</p> : null}
      {help ? <p className="lp-check-help" id={helpId}>{help}</p> : null}
      <button type="button" className="btn btn-primary btn-lg btn-block press" disabled={!ready} aria-describedby={help ? helpId : undefined} onClick={() => onCheck()}>{t("check")}<kbd className="key-hint" aria-hidden="true">{t("enterKey")}</kbd></button>
    </>
  );
}

/** Design audit L4 + A2: on a phone the example is a pinned thumbnail beside the question, and a tap opens it full screen.
 *  On a laptop the same markup shows the example at full size (CSS only, so nothing moves when the page loads). */
function Example({ mock, locale, t, label, onOpen }: { mock: Mock; locale: Locale; t: TFn; label: string; onOpen: (mock: Mock, label: string) => void }) {
  return (
    <div className="lp-ctx">
      <div className="lp-stage"><div className="lp-stage-in"><MockView mock={mock} locale={locale} label={label} tag={t("exampleTag")} chip={t("mockChip")} /></div></div>
      <span className="lp-thumb-txt" aria-hidden="true"><span className="cap">{label}</span><span className="go"><span className="ph ph-corners-out" aria-hidden="true" />{t("exOpen")}</span></span>
      <button type="button" className="lp-thumb-hit" aria-haspopup="dialog" aria-label={t("exAria", { frame: label })} onClick={() => onOpen(mock, label)} />
    </div>
  );
}

/** The example full screen, at a readable size, with pinch zoom. Esc, the close button and the back button close it. */
function ExampleLayer({ mock, label, locale, t, onClose }: { mock: Mock; label: string; locale: Locale; t: TFn; onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => opener?.focus?.({ preventScroll: true });
  }, []);
  return (
    <div className="lp-exfull" role="dialog" aria-modal="true" aria-label={label}>
      <div className="lp-full-head">
        <span className="frame-label"><span className="ph ph-frame-corners" aria-hidden="true" />{label}</span>
        <button type="button" ref={ref} className="icon-btn" aria-label={t("exClose")} onClick={onClose}><span className="ph ph-x" aria-hidden="true" /></button>
      </div>
      <div className="lp-full-mock"><MockView mock={mock} locale={locale} label={label} tag={t("exampleTag")} chip={t("mockChip")} /></div>
      <p className="lp-full-note">{t("exZoom")}</p>
    </div>
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

/** The path name in the over-label. A bracketed English term, as in «… (Usability Heuristics)», stays on one line and is not reordered. */
function PathLabel({ name }: { name: string }) {
  const m = /^(.*?)(\([A-Za-z][^()]*\))(.*)$/s.exec(name);
  if (!m) return <bdi>{name}</bdi>;
  return <bdi>{m[1]}<bdi style={{ whiteSpace: "nowrap" }}>{m[2]}</bdi>{m[3]}</bdi>;
}
