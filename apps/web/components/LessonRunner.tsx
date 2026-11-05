"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Lesson, Locale } from "@uxgate/content/types";
import { LessonPlayer } from "@uxgate/player";
import { startLesson, type LessonState, type TryEvent } from "@uxgate/player/engine";
import { kvDel, kvGet, kvSet } from "@/lib/idb";
import { attemptIdFor, enqueueAttempt } from "@/lib/attempts";
import { initSound, play, readMuted, setMuted } from "@/lib/sound";
import { flush, kick, setSyncUser, startSync, useSyncStatus } from "@/lib/sync";
import { useTranslations } from "next-intl";
import { LessonEnd, type ProNext, type UnitSkill } from "./LessonEnd";
import type { ReplayKind } from "@/lib/replay";

type Props = { lesson: Lesson; hash: string; locale: Locale; pathLabel: string; lessonNo: number; unitSkills: UnitSkill[]; streak: number; userId: string; replay: ReplayKind | null; proNext?: ProNext | null };

export function LessonRunner({ lesson, hash, locale, pathLabel, lessonNo, unitSkills, streak, userId, replay, proNext }: Props) {
  const router = useRouter();
  const t = useTranslations("sync");
  const sync = useSyncStatus();
  const [state, setState] = useState<LessonState | null>(null);
  const [finished, setFinished] = useState<LessonState | null>(null);
  const [muted, setMutedState] = useState(false);
  const attemptId = useRef("");
  // Saved position is kept per learner, so the next person on a shared device starts fresh.
  const key = `lesson:${userId}:${lesson.id}`;

  useEffect(() => {
    initSound();
    setSyncUser(userId);
    startSync();
    setMutedState(readMuted());
    let alive = true;
    (async () => {
      let saved: LessonState | undefined;
      try { saved = await kvGet<LessonState>(key); } catch { /* private mode: start fresh */ }
      const fresh = saved && saved.hash === hash && !saved.done ? saved : startLesson(lesson, hash);
      attemptId.current = attemptIdFor(lesson.id, fresh.startedAt);
      if (alive) setState(fresh);
    })();
    return () => { alive = false; };
  }, [lesson, hash, key, userId]);

  const onState = useCallback((s: LessonState) => { kvSet(key, s).catch(() => {}); }, [key]);
  const onEvent = useCallback((e: TryEvent) => { enqueueAttempt(userId, attemptId.current, e).then(kick).catch(() => {}); }, [userId]);
  const onFinish = useCallback((s: LessonState) => {
    kvDel(key).catch(() => {});
    play("lesson-complete");
    setFinished(s);
  }, [key]);

  // Give the last answers a moment to reach the server so Home shows the new XP and streak; offline, leave anyway.
  const leave = async () => {
    await Promise.race([flush().catch(() => {}), new Promise((r) => setTimeout(r, 2500))]);
    router.push("/app");
    router.refresh();
  };

  if (!state) return <div className="player-loading" aria-busy="true" />;
  if (finished) return <LessonEnd lesson={lesson} state={finished} unitSkills={unitSkills} streak={streak} replay={replay} onContinue={leave} proNext={proNext} />;

  return (
    <>
    {!sync.online ? <p className="offline-bar" role="status"><span className="ph ph-lock" aria-hidden="true" />{t("offline")}</p> : null}
    <LessonPlayer
      lesson={lesson} locale={locale} initial={state} pathLabel={pathLabel} lessonNo={lessonNo}
      muted={muted}
      onToggleMute={() => { const v = !muted; setMuted(v); setMutedState(v); if (!v) play("ui-toggle-on"); }}
      onSound={play} onState={onState} onEvent={onEvent}
      onExit={leave}
      onFinish={onFinish}
    />
    </>
  );
}
