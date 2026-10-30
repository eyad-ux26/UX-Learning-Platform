"use client";

import { useTranslations } from "next-intl";
import type { Lesson, Locale } from "@uxgate/content/types";
import { getUnit } from "@uxgate/content";
import { isQuestion, summarize, type LessonState } from "@uxgate/player/engine";

export function LessonEnd({ lesson, state, locale, unitId, onContinue }: { lesson: Lesson; state: LessonState; locale: Locale; unitId: string; onContinue: () => void }) {
  const t = useTranslations("end");
  const sum = summarize(lesson, state);
  const unit = getUnit(unitId);
  // A skill counts as practised once a step on it was answered (not just shown).
  const practised = new Set<string>();
  lesson.steps.forEach((s, k) => { if (isQuestion(s) && state.steps[k].outcome && state.steps[k].outcome !== "revealed") practised.add(s.skill); });
  const skills = (unit?.skills ?? []).filter((k) => practised.has(k.id));
  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));

  return (
    <div className="end">
      <main className="end-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pop end-art" src="/ill/uxgate-ill-trophy.png" alt="" width={168} height={168} />
        <div className="end-title">
          <h1 className="t-display">{t("title")}</h1>
          <p className="t-body ink-2">{t("sub", { count: sum.questions, minutes })}</p>
        </div>
        <div className="end-stats">
          <div className="stat-tile stat-xp pop"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr big" data-testid="xp">+{sum.xp} XP</span><span className="lbl">{t("xpLabel")}</span></div>
          <div className="stat-tile pop"><span className="ph ph-target" aria-hidden="true" /><span className="num ltr big" data-testid="first-try">{sum.independent}/{sum.questions}</span><span className="lbl ink-2">{t("firstTry")}</span></div>
        </div>
        {skills.length ? (
          <section className="card end-skills" aria-label={t("skills")}>
            <p className="t-over">{t("skills")}</p>
            {skills.map((k) => (
              <div key={k.id} className="end-skill"><span className="ph ph-check-circle-fill" aria-hidden="true" /><span className="t-small grow">{k.title[locale]}</span><span className="skill skill-practiced">{t("practiced")}</span></div>
            ))}
          </section>
        ) : null}
      </main>
      <footer className="end-foot"><button type="button" className="btn btn-primary btn-lg btn-block press" onClick={onContinue}>{t("continue")}</button></footer>
    </div>
  );
}
