"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Lesson, Locale, Skill } from "@uxgate/content/types";
import { LessonPlayer } from "@uxgate/player";
import { resumeCheck, startLesson, type LessonState, type TryEvent } from "@uxgate/player/engine";
import { kvDel, kvGet, kvSet } from "@/lib/idb";
import { attemptIdFor, enqueueAttempt } from "@/lib/attempts";
import { initSound, play, readMuted, setMuted } from "@/lib/sound";
import { flush, kick, setSyncUser, startSync, useSyncStatus } from "@/lib/sync";
import { NextIntlClientProvider, useMessages, useTimeZone, useTranslations } from "next-intl";
import type { OtherLocale } from "@/lib/server/lesson-messages";
import { LessonEnd, type ProNext } from "./LessonEnd";
import { CheckPractice, CheckSummary, GuestEnd, MasteryEnd, ReviewEnd, type SyncShown } from "./LessonPages";
import { REVISE_COOKIE, reviseHref } from "@/lib/revise";
import { replayXp, type ReplayKind } from "@/lib/replay";
import type { PathEnd, UpNext } from "@/lib/up-next";
import { Loader } from "@/components/loading/Loader";
import { markTourSeen, tourKind } from "@/lib/lesson-tour";

export const GUEST_ID = "guest";

type Props = {
  lesson: Lesson; hash: string; locale: Locale; pathLabel: string; lessonNo: number; unitNo?: number; unitId: string; streak: number; userId: string; replay: ReplayKind | null;
  /**
   * "mastery": the mastery round of a unit, where `lesson` is its re-test bank cut down to the steps in `plan`.
   * "review": a spaced-review session, also a cut-down bank, with its own end page.
   */
  variant?: "lesson" | "mastery" | "review";
  plan?: string[];
  /** The sample lesson for someone who is not signed in: answers stay on this device until they sign up. */
  guest?: boolean;
  /** The unit's skills, for the result pages (the client never loads the whole content bundle). */
  unitSkills?: Skill[];
  /** The next lesson of the path, or null after its last one (then `pathEnd`). */
  upNext?: UpNext | null;
  pathEnd?: PathEnd | null;
  /** The next unit, when it is part of Pro and the learner is on the free plan. */
  proNext?: ProNext | null;
  /** The player's strings in the other language. With it, the header shows a language switch that works inside the lesson. */
  other?: OtherLocale;
  /** The learner's first lesson since signing up: the lesson tour runs once (see lib/lesson-tour.ts). */
  firstLesson?: boolean;
  /** Revise a unit (lib/revise.ts): a finished lesson played again from the path page's Revise button. */
  revising?: boolean;
};

const LOCALE_PREFIX = /^\/(en|ar)(?=\/|$)/;
const dirOf = (l: string) => (l === "ar" ? "rtl" : "ltr");

function OfflineBar() {
  const t = useTranslations("sync");
  return <p className="offline-bar" role="status"><span className="ph ph-wifi-slash" aria-hidden="true" />{t("offlineBanner")}</p>;
}

/**
 * Shows the lesson in `view` when the learner switched language inside it. The lesson text has both languages already;
 * the player's own strings come from `other`. The page keeps its place, its answers and any open sheet.
 */
function ViewLocale({ view, locale, other, children }: { view: Locale; locale: Locale; other?: OtherLocale; children: React.ReactNode }) {
  const base = useMessages() as Record<string, Record<string, unknown>>;
  const timeZone = useTimeZone();
  const messages = useMemo(() => {
    if (!other) return base;
    const out: Record<string, unknown> = { ...base };
    for (const [ns, v] of Object.entries(other.messages)) out[ns] = { ...(base[ns] ?? {}), ...(v as Record<string, unknown>) };
    return out;
  }, [base, other]);
  // The page's direction, language and font follow the language shown. When the learner leaves, the address decides.
  useEffect(() => {
    if (view === locale) return;
    const html = document.documentElement;
    html.lang = view; html.dir = dirOf(view);
    return () => {
      const shown = location.pathname.match(LOCALE_PREFIX)?.[1] ?? locale;
      html.lang = shown; html.dir = dirOf(shown);
    };
  }, [view, locale]);
  // Always the same element, so switching never remounts the player (that would lose the answer in progress).
  return <NextIntlClientProvider locale={view} messages={(view === locale ? base : messages) as never} timeZone={timeZone}>{children}</NextIntlClientProvider>;
}

export function LessonRunner({ lesson, hash, locale, pathLabel, lessonNo, unitNo, unitId, streak, userId, replay, variant = "lesson", plan, guest = false, unitSkills = [], upNext = null, pathEnd = null, proNext = null, other, firstLesson = false, revising = false }: Props) {
  const router = useRouter();
  // The language shown. It starts as the page's language; the switch in the player header flips it in place.
  const [view, setView] = useState<Locale>(locale);
  const t = useTranslations("sync");
  const sync = useSyncStatus();
  const [state, setState] = useState<LessonState | null>(null);
  const [finished, setFinished] = useState<LessonState | null>(null);
  // The tour runs at the start of the sample lesson and of the learner's first lesson, once (the answer is kept in this browser).
  const [tour, setTour] = useState<"guest" | "first" | undefined>(undefined);
  const [muted, setMutedState] = useState(false);
  const attemptId = useRef("");
  // The mastery round asks different steps each time, so its saved position is keyed by them.
  const key = `lesson:${userId}:${lesson.id}${plan ? `:${plan.join(",")}` : ""}`;
  const planKey = plan?.join(",");

  useEffect(() => {
    initSound();
    setSyncUser(userId);
    startSync();
    setMutedState(readMuted());
    let alive = true;
    (async () => {
      let saved: LessonState | undefined;
      try { saved = await kvGet<LessonState>(key); } catch { /* private mode: start fresh */ }
      // A skill check picks up at its first question without an answer; saved answers are kept (design S3-19 frame 5).
      const fresh = saved && saved.hash === hash && !saved.done && saved.steps.length === lesson.steps.length ? resumeCheck(lesson, saved) : startLesson(lesson, hash);
      attemptId.current = attemptIdFor(lesson.id, fresh.startedAt);
      if (alive) {
        setState(fresh);
        const kind = variant === "lesson" ? tourKind({ guest, firstLesson, userId, atStart: fresh.i === 0 }) : undefined;
        if (kind) setTour(kind);
      }
    })();
    return () => { alive = false; };
  }, [lesson, hash, key, userId, guest, firstLesson, variant]);

  // Revise a unit: remember the lesson it is on, so the Revise sheet can pick it up again after the learner leaves.
  useEffect(() => {
    if (!revising) return;
    try { document.cookie = `${REVISE_COOKIE}=${encodeURIComponent(`${unitId}~${lesson.id}`)}; path=/; max-age=2592000; samesite=lax`; } catch { /* the revise still runs */ }
  }, [revising, unitId, lesson.id]);
  // The revise ends on this lesson's end page when nothing of the unit is left to revise after it.
  useEffect(() => {
    if (!revising || !finished || upNext?.revise) return;
    try { document.cookie = `${REVISE_COOKIE}=; path=/; max-age=0; samesite=lax`; } catch { /* nothing to clear */ }
  }, [revising, finished, upNext]);
  const pathHref = `/app/paths/${lesson.id.split("-")[0]}`;

  const onState = useCallback((s: LessonState) => { kvSet(key, s).catch(() => {}); }, [key]);
  const onEvent = useCallback((e: TryEvent) => { enqueueAttempt(userId, attemptId.current, e, planKey ? planKey.split(",") : undefined, variant === "review" ? "review" : undefined).then(kick).catch(() => {}); }, [userId, planKey, variant]);
  const onFinish = useCallback((s: LessonState) => {
    kvDel(key).catch(() => {});
    play("lesson-complete");
    setFinished(s);
  }, [key]);

  // Give the last answers a moment to reach the server so Home shows the new XP and streak; offline, leave anyway.
  // Only an app path counts: a click event handed over by mistake goes Home, never to "/en[object]".
  const leave = async (to: unknown = "/app") => {
    const href = typeof to === "string" && to.startsWith("/") ? to : "/app";
    await Promise.race([flush().catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    router.push(href as never, { locale: view });
    router.refresh();
  };
  // The mastery round opens only once the server has the skill check, so wait for the save itself (QA #264), up to 15 s.
  // Offline or failed, go anyway: the mastery page sends what is still queued before it decides.
  const toMastery = async () => {
    await Promise.race([flush().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
    router.push(`/app/mastery/${unitId}` as never, { locale: view });
    router.refresh();
  };

  // A signed address for a clip, asked for when the step opens.
  const videoSource = useCallback(async (id: string) => {
    const res = await fetch(`/api/video/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as { src: string; kind: "hls" | "mp4" };
  }, []);

  // Ask for a human review of a graded answer. Stored on the server for the admin side.
  const onReview = useCallback(async (r: { stepId: string; answer: { sel: string[]; reason?: string[] }; reason: string; note: string }) => {
    try {
      const res = await fetch("/api/review-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id, hash, ...r }) });
      return res.ok;
    } catch { return false; }
  }, [lesson.id, hash]);

  // After a stretch offline, say once that everything reached the server.
  const [notice, setNotice] = useState<string | null>(null);
  const wasOffline = useRef(false);
  useEffect(() => {
    if (guest) return;
    if (!sync.online) { wasOffline.current = true; return; }
    if (wasOffline.current && sync.pending === 0) {
      wasOffline.current = false;
      setNotice(t("synced"));
      const id = setTimeout(() => setNotice(null), 4000);
      return () => clearTimeout(id);
    }
  }, [guest, sync.online, sync.pending, t]);

  const saveStatus = useMemo(() => {
    if (guest) return undefined;
    if (!sync.online) return "offline" as const;
    return sync.pending > 0 ? ("saving" as const) : ("saved" as const);
  }, [guest, sync.online, sync.pending]);

  // Switch the language inside the lesson: no reload, so the step, the answer picked and the timer all stay.
  // The address and the language cookie follow, so a refresh and the screens after the lesson keep the choice.
  const switchLocale = useCallback(() => {
    if (!other) return;
    const next: Locale = view === locale ? other.locale : locale;
    setView(next);
    play("ui-toggle-on");
    try {
      const url = location.pathname.replace(LOCALE_PREFIX, `/${next}`) + location.search + location.hash;
      history.replaceState(history.state?.lessonLayer ? { lessonLayer: true } : null, "", url);
      document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* the switch still works for this screen */ }
  }, [other, view, locale]);

  // End pages: "Saving your results…" while the answers are on their way, the offline note only when sending failed (QA #264).
  const syncShown: SyncShown = !sync.online || sync.failed ? true : sync.pending > 0 ? "saving" : false;

  function body() {
  if (!state) return <div className="player-loading" aria-busy="true"><Loader full /></div>;
  if (finished) {
    if (guest) return <GuestEnd lesson={lesson} state={finished} locale={view} />;
    if (variant === "review") return <ReviewEnd lesson={lesson} state={finished} locale={view} skills={unitSkills} offline={syncShown} onSound={play} onHome={() => leave()} onBadges={() => leave("/app/badges")} />;
    if (variant === "mastery") return <MasteryEnd lesson={lesson} state={finished} locale={view} unitSkills={unitSkills} unitId={unitId} onContinue={() => leave(`/app/path/${unitId.split("-")[0]}`)} />;
    // A finished skill check played again is practice: the results show, and no skill changes.
    if (lesson.mode === "check" && replay) return <CheckPractice lesson={lesson} state={finished} locale={view} unitSkills={unitSkills} offline={syncShown} onContinue={() => leave(pathHref)} xpOf={(n) => replayXp(n, replay)} />;
    if (lesson.mode === "check") return <CheckSummary lesson={lesson} state={finished} locale={view} unitSkills={unitSkills} offline={syncShown} onMastery={toMastery} onContinue={() => leave()} upNext={upNext} pathEnd={pathEnd} onGo={(to) => leave(to)} />;
    return <LessonEnd lesson={lesson} state={finished} locale={view} unitSkills={unitSkills} streak={streak} replay={replay} offline={syncShown} onContinue={() => leave(revising ? pathHref : undefined)} pathLabel={pathLabel} upNext={upNext} onNext={upNext ? () => leave(upNext.revise ? reviseHref(upNext.lessonId) : `/app/lesson/${upNext.lessonId}`) : undefined} proNext={proNext} revising={revising} />;
  }

  return (
    <>
    {!sync.online && !guest ? <OfflineBar /> : null}
    <LessonPlayer
      lesson={lesson} locale={view} initial={state} pathLabel={pathLabel} lessonNo={lessonNo} unitNo={unitNo}
      muted={muted}
      onToggleMute={() => { const v = !muted; setMuted(v); setMutedState(v); if (!v) play("ui-toggle-on"); }}
      onSound={play} onState={onState} onEvent={onEvent}
      onExit={() => (guest ? router.push("/", { locale: view }) : leave())}
      onFinish={onFinish}
      variant={variant} guest={guest} saveStatus={saveStatus}
      onReview={guest ? undefined : onReview}
      videoSource={videoSource} notice={notice}
      onSwitchLocale={other ? switchLocale : undefined}
      tour={tour} onTourDone={() => { if (tour) markTourSeen(tour, userId); setTour(undefined); }}
      revising={revising}
    />
    </>
  );
  }

  return <ViewLocale view={view} locale={locale} other={other}>{body()}</ViewLocale>;
}
