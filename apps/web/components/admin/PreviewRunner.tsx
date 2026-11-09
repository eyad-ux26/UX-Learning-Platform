"use client";
// The real lesson player for the panel's preview (lesson editor and release review). Nothing is saved or sent.
import { useState } from "react";
import { LessonPlayer, startLesson } from "@uxgate/player";
import type { Lesson, Locale } from "@uxgate/content/types";

export function PreviewRunner({ lesson, hash, locale, pathLabel }: { lesson: Lesson; hash: string; locale: Locale; pathLabel: string }) {
  const [key, setKey] = useState(0);
  const [muted, setMuted] = useState(true);
  const again = () => setKey((k) => k + 1);
  return (
    <LessonPlayer key={key} lesson={lesson} locale={locale} initial={startLesson(lesson, hash)} pathLabel={pathLabel}
      muted={muted} onToggleMute={() => setMuted((m) => !m)} onSound={() => {}} onState={() => {}} onEvent={() => {}}
      onExit={again} onFinish={again} variant={lesson.mode === "bank" ? "mastery" : "lesson"} />
  );
}
