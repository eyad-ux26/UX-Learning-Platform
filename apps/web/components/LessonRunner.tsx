"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Lesson, Locale } from "@uxgate/content/types";
import { LessonPlayer } from "@uxgate/player";
import { startLesson, type LessonState, type TryEvent } from "@uxgate/player/engine";
import { kvDel, kvGet, kvSet } from "@/lib/idb";
import { attemptIdFor, enqueueAttempt } from "@/lib/attempts";
import { initSound, play, readMuted, setMuted } from "@/lib/sound";
import { LessonEnd } from "./LessonEnd";

type Props = { lesson: Lesson; hash: string; locale: Locale; pathLabel: string; unitId: string };

export function LessonRunner({ lesson, hash, locale, pathLabel, unitId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<LessonState | null>(null);
  const [finished, setFinished] = useState<LessonState | null>(null);
  const [muted, setMutedState] = useState(false);
  const attemptId = useRef("");
  const key = `lesson:${lesson.id}`;

  useEffect(() => {
    initSound();
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
  }, [lesson, hash, key]);

  const onState = useCallback((s: LessonState) => { kvSet(key, s).catch(() => {}); }, [key]);
  const onEvent = useCallback((e: TryEvent) => { enqueueAttempt(attemptId.current, e).catch(() => {}); }, []);
  const onFinish = useCallback((s: LessonState) => {
    kvDel(key).catch(() => {});
    play("lesson-complete");
    setFinished(s);
  }, [key]);

  if (!state) return <div className="player-loading" aria-busy="true" />;
  if (finished) return <LessonEnd lesson={lesson} state={finished} locale={locale} unitId={unitId} onContinue={() => router.push("/app")} />;

  return (
    <LessonPlayer
      lesson={lesson} locale={locale} initial={state} pathLabel={pathLabel}
      muted={muted}
      onToggleMute={() => { const v = !muted; setMuted(v); setMutedState(v); if (!v) play("ui-toggle-on"); }}
      onSound={play} onState={onState} onEvent={onEvent}
      onExit={() => router.push("/app")}
      onFinish={onFinish}
    />
  );
}
