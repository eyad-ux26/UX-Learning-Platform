"use client";

import { useTranslations } from "next-intl";
import type { Lesson, Locale, Skill } from "@uxgate/content/types";
import { replayXp, type ReplayKind } from "@/lib/replay";
import { isQuestion, summarize, type LessonState } from "@uxgate/player/engine";

export function LessonEnd({ lesson, state, locale, unitSkills, streak, replay, offline = false, onContinue }: { lesson: Lesson; state: LessonState; locale: Locale; unitSkills: Skill[]; streak: number; replay: ReplayKind | null; offline?: boolean; onContinue: () => void }) {
  const t = useTranslations("end");
  const sum = summarize(lesson, state, (n) => replayXp(n, replay));
  // A skill counts as practised once a step on it was answered (not just shown).
  const practised = new Set<string>();
  lesson.steps.forEach((s, k) => { if (isQuestion(s) && state.steps[k].outcome && state.steps[k].outcome !== "revealed") practised.add(s.skill); });
  const skills = unitSkills.filter((k) => practised.has(k.id));
  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));

  return (
    <div className="end">
      <main className="end-main">
        <div className="end-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pop end-art" src="/ill/uxgate-ill-trophy.png" alt="" width={168} height={168} />
          <span className="end-tag end-tag-xp" aria-hidden="true"><span className="ph ph-bolt-fill" /><span className="num ltr">+{sum.xp} XP</span></span>
          <span className="end-tag end-tag-streak" aria-hidden="true"><span className="ph ph-flame-fill" /><span className="num ltr">{streak}</span> {t("streakLabel")}</span>
        </div>
        <div className="end-left">
          <div className="end-title">
            <h1 className="t-display">{t("title")}</h1>
            <p className="t-body ink-2">{t("sub", { count: sum.questions, minutes })}</p>
            {replay ? <p className="t-small replay-note"><span className="ph ph-review" aria-hidden="true" />{replay === "paid" ? t("replayHalf") : t("replayNone")}</p> : null}
          </div>
          {offline ? <p className="lp-banner" role="status"><span className="ph ph-cloud-arrow-up" aria-hidden="true" />{t("syncLater")}</p> : null}
          <div className="end-stats">
            <div className="stat-tile stat-xp pop"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr big" data-testid="xp">+{sum.xp} XP</span><span className="lbl">{t("xpLabel")}</span></div>
            <div className="stat-tile pop"><span className="ph ph-target" aria-hidden="true" /><span className="num ltr big" data-testid="first-try">{sum.independent}/{sum.questions}</span><span className="lbl ink-2">{t("firstTry")}</span></div>
            <div className="stat-tile pop"><span className="ph ph-flame-fill" style={{ color: "#F59E2B" }} aria-hidden="true" /><span className="num ltr big" data-testid="streak">{streak}</span><span className="lbl ink-2">{t("streakLabel")}</span></div>
          </div>
          {skills.length ? (
            <section className="card end-skills" aria-label={t("skills")}>
              <p className="t-over">{t("skills")}</p>
              {skills.map((k) => (
                <div key={k.id} className="end-skill"><span className="ph ph-check-circle-fill" aria-hidden="true" /><span className="t-small grow">{k.title[locale]}</span><span className="skill skill-practiced">{t("practiced")}</span></div>
              ))}
            </section>
          ) : null}
          <div className="end-actions">
            <button type="button" className="btn btn-primary btn-lg press" onClick={onContinue}>{t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
          </div>
        </div>
      </main>
      <footer className="end-foot"><button type="button" className="btn btn-primary btn-lg btn-block press" onClick={onContinue}>{t("continue")}</button></footer>
    </div>
  );
}
