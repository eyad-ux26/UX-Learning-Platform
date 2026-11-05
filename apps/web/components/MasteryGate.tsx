"use client";

import { useState } from "react";
import type { Lesson, Locale, Skill } from "@uxgate/content/types";
import { LessonRunner } from "./LessonRunner";
import { MasteryIntro } from "./LessonPages";

type Props = { lesson: Lesson; hash: string; locale: Locale; pathLabel: string; unitId: string; userId: string; plan: string[]; skills: Skill[]; allSkills: Skill[]; backHref: string };

/** The intro lists the skills that come back; Start opens the round. */
export function MasteryGate({ lesson, hash, locale, pathLabel, unitId, userId, plan, skills, allSkills, backHref }: Props) {
  const [started, setStarted] = useState(false);
  if (!started) return <MasteryIntro skills={skills} locale={locale} onStart={() => setStarted(true)} backHref={backHref} />;
  return <LessonRunner lesson={lesson} hash={hash} locale={locale} pathLabel={pathLabel} lessonNo={0} unitId={unitId} streak={0} userId={userId} replay={null} variant="mastery" plan={plan} unitSkills={allSkills} />;
}
