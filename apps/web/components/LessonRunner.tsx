"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Lesson, Locale, Skill } from "@uxgate/content/types";
import { LessonPlayer } from "@uxgate/player";
import { startLesson, type LessonState, type TryEvent } from "@uxgate/player/engine";
import { kvDel, kvGet, kvSet } from "@/lib/idb";
import { attemptIdFor, enqueueAttempt } from "@/lib/attempts";
import { initSound, play, readMuted, setMuted } from "@/lib/sound";
import { flush, kick, setSyncUser, startSync, useSyncStatus } from "@/lib/sync";
import { useTranslations } from "next-intl";
import { LessonEnd, type ProNext } from "./LessonEnd";
import { CheckSummary, GuestEnd, MasteryEnd, ReviewEnd } from "./LessonPages";
import type { ReplayKind } from "@/lib/replay";
import type { PathEnd, UpNext } from "@/lib/up-next";
import { Loader } from "@/components/loading/Loader";

export const GUEST_ID = "guest";

type Props = {
  lesson: Lesson; hash: string; locale: Locale; pathLabel: string; lessonNo: number; unitId: string; streak: number; userId: string; replay: ReplayKind | null;
  /** The mastery round of a unit: `lesson` is its re-test bank cut down to the steps in `plan`. */
  /** "review": a spaced-review session, also a cut-down bank, with its own end page. */
  variant?: "lesson" | "mastery" | "review";
  plan?: string[];
  /** The sample lesson for someone who is not signed in: answers stay on this device until they sign up. */
  guest?: boolean;
  /** The unit's skills, for the result pages (the client never loads the whole content bundle). */
  unitSkills?: Skill[];
  /** The next lesson of the path, or null after its last one (then `pathEnd`). */
  upNext?: UpNext | null;
  pathEnd?: PathEnd | null;
  /** The next unit, when it is part of Pro and the learner is on the free plan (slice 5). */
  proNext?: ProNext | null;
};

export function LessonRunner({ lesson, hash, locale, pathLabel, lessonNo, unitId, streak, userId, replay, variant = "lesson", plan, guest = false, unitSkills = [], upNext = null, pathEnd = null, proNext = null }: Props) {
  const router = useRouter();
  const t = useTranslations("sync");
  const sync = useSyncStatus();
  const [state, setState] = useState<LessonState | null>(null);
  const [finished, setFinished] = useState<LessonState | null>(null);
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
      const fresh = saved && saved.hash === hash && !saved.done && saved.steps.length === lesson.steps.length ? saved : startLesson(lesson, hash);
      attemptId.current = attemptIdFor(lesson.id, fresh.startedAt);
      if (alive) setState(fresh);
    })();
    return () => { alive = false; };
  }, [lesson, hash, key, userId]);

  const onState = useCallback((s: LessonState) => { kvSet(key, s).catch(() => {}); }, [key]);
  const onEvent = useCallback((e: TryEvent) => { enqueueAttempt(userId, attemptId.current, e, planKey ? planKey.split(",") : undefined, variant === "review" ? "review" : undefined).then(kick).catch(() => {}); }, [userId, planKey, variant]);
  const onFinish = useCallback((s: LessonState) => {
    kvDel(key).catch(() => {});
    play("lesson-complete");
    setFinished(s);
  }, [key]);

  // Give the last answers a moment to reach the server so Home shows the new XP and streak; offline, leave anyway.
  const leave = async (to = "/app") => {
    await Promise.race([flush().catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    router.push(to as never);
    router.refresh();
  };

  const startOver = useCallback(async () => {
    await kvDel(key).catch(() => {});
    const fresh = startLesson(lesson, hash);
    attemptId.current = attemptIdFor(lesson.id, fresh.startedAt);
    setState(null);
    setTimeout(() => setState(fresh), 0);
  }, [key, lesson, hash]);

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

  if (!state) return <div className="player-loading" aria-busy="true"><Loader full /></div>;
  if (finished) {
    if (guest) return <GuestEnd lesson={lesson} state={finished} locale={locale} />;
    if (variant === "review") return <ReviewEnd lesson={lesson} state={finished} locale={locale} skills={unitSkills} offline={!sync.online || sync.pending > 0} onSound={play} onHome={() => leave()} onBadges={() => leave("/app/badges")} />;
    if (variant === "mastery") return <MasteryEnd lesson={lesson} state={finished} locale={locale} unitSkills={unitSkills} unitId={unitId} onContinue={() => leave(`/app/path/${unitId.split("-")[0]}`)} />;
    if (lesson.mode === "check") return <CheckSummary lesson={lesson} state={finished} locale={locale} unitSkills={unitSkills} offline={!sync.online || sync.pending > 0} onMastery={() => leave(`/app/mastery/${unitId}`)} onContinue={() => leave()} upNext={upNext} pathEnd={pathEnd} onGo={(to) => leave(to)} />;
    return <LessonEnd lesson={lesson} state={finished} locale={locale} unitSkills={unitSkills} streak={streak} replay={replay} offline={!sync.online || sync.pending > 0} onContinue={leave} pathLabel={pathLabel} upNext={upNext} onNext={upNext ? () => leave(`/app/lesson/${upNext.lessonId}`) : undefined} proNext={proNext} />;
  }

  return (
    <>
    {!sync.online && !guest ? <p className="offline-bar" role="status"><span className="ph ph-wifi-slash" aria-hidden="true" />{t("offlineBanner")}</p> : null}
    <LessonPlayer
      lesson={lesson} locale={locale} initial={state} pathLabel={pathLabel} lessonNo={lessonNo}
      muted={muted}
      onToggleMute={() => { const v = !muted; setMuted(v); setMutedState(v); if (!v) play("ui-toggle-on"); }}
      onSound={play} onState={onState} onEvent={onEvent}
      onExit={() => (guest ? router.push("/") : leave())}
      onFinish={onFinish}
      variant={variant} guest={guest} saveStatus={saveStatus}
      onReview={guest ? undefined : onReview}
      onStartOver={startOver}
      videoSource={videoSource} notice={notice}
    />
    </>
  );
}
