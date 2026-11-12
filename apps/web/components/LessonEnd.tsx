"use client";

import { useTranslations } from "next-intl";
import type { Lesson, Locale, Skill } from "@uxgate/content/types";
import { replayXp, type ReplayKind } from "@/lib/replay";
import { isQuestion, summarize, type LessonState } from "@uxgate/player/engine";
import { Link } from "@/i18n/navigation";
import { PushAsk } from "@/components/account/PushAsk";
import type { UpNext } from "@/lib/up-next";

/** The next unit when it is part of Pro and the learner is on the free plan. */
export type ProNext = { n: number; title: string };

export function LessonEnd({ lesson, state, locale, unitSkills, streak, replay, offline = false, onContinue, upNext = null, onNext, pathLabel = "", proNext = null, revising = false }: { revising?: boolean; pathLabel?: string; lesson: Lesson; state: LessonState; locale: Locale; unitSkills: Skill[]; streak: number; replay: ReplayKind | null; offline?: boolean; onContinue: () => void; upNext?: UpNext | null; onNext?: () => void; proNext?: ProNext | null }) {
  const t = useTranslations("end");
  const tb = useTranslations("billing");
  const sum = summarize(lesson, state, (n) => replayXp(n, replay));
  // A skill counts as practised once a step on it was answered (not just shown).
  const practised = new Set<string>();
  lesson.steps.forEach((s, k) => { if (isQuestion(s) && state.steps[k].outcome && state.steps[k].outcome !== "revealed") practised.add(s.skill); });
  const skills = unitSkills.filter((k) => practised.has(k.id));
  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
  // After a first play, the end page leads on to the next lesson of the path; a replay goes back home,
  // except while revising a unit, which goes on through the unit (lib/revise.ts).
  const go = (!replay || revising) && upNext && onNext ? onNext : null;
  const unitNo = Number(lesson.id.split("-U")[1]?.slice(0, 2)) || 1;

  return (
    <div className="end">
      <main className="end-main">
        <div className="end-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pop end-art" src="/ill/uxgate-ill-trophy.png" alt="" width={168} height={168} />
          <span className="end-tag end-tag-xp" aria-hidden="true"><span className="ph ph-bolt-fill" /><span className="num ltr">+{sum.xp} XP</span></span>
          <span className="end-tag end-tag-streak" aria-hidden="true"><span className="ph ph-flame-fill" />{t("streakTag", { count: streak })}</span>
        </div>
        <div className="end-left">
          <div className="end-title">
            <h1 className="t-display">{t("title")}</h1>
            <p className="t-body ink-2">{t("sub", { count: sum.questions, minutes })}</p>
            {revising ? <p className="t-small replay-note"><span className="ph ph-review" aria-hidden="true" />{upNext?.revise ? t("revisingOn") : upNext ? t("revisingNew") : t("revisingDone")}</p> : null}
            {replay ? <p className="t-small replay-note"><span className="ph ph-review" aria-hidden="true" />{replay === "paid" ? t("replayHalf") : t("replayNone")}</p> : null}
          </div>
          {offline ? <p className="lp-banner" role="status"><span className="ph ph-cloud-arrow-up" aria-hidden="true" />{t("syncLater")}</p> : null}
          <div className="end-stats">
            <div className="stat-tile stat-xp pop"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr big" data-testid="xp">+{sum.xp} XP</span><span className="lbl">{t("xpLabel")}</span></div>
            <div className="stat-tile pop"><span className="ph ph-target" aria-hidden="true" /><span className="num ltr big" data-testid="first-try">{sum.independent}/{sum.questions}</span><span className="lbl ink-2">{t("firstTry")}</span></div>
            <div className="stat-tile pop"><span className="ph ph-flame-fill" style={{ color: "#F59E2B" }} aria-hidden="true" /><span className="num ltr big" data-testid="streak">{streak}</span><span className="lbl ink-2">{t("streakLabel")}</span></div>
          </div>
          {/* A replay never changes a skill, so its end page does not list skills as if it did (QA, 12 Nov). */}
          {skills.length && !replay ? (
            <section className="card end-skills" aria-label={t("skills")}>
              <p className="t-over">{t("skills")}</p>
              {skills.map((k) => (
                <div key={k.id} className="end-skill"><span className="ph ph-check-circle-fill" aria-hidden="true" /><span className="t-small grow">{k.title[locale]}</span><span className="skill skill-practiced">{t("practiced")}</span></div>
              ))}
              {lesson.mode === "lesson" && !replay ? <p className="t-small ink-2"><span className="ph ph-info" aria-hidden="true" /> {t("shownNext", { n: unitNo })}</p> : null}
            </section>
          ) : null}
          {go && upNext ? (
            <section className="card-panel end-next" aria-label={t("nextGo")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ill/uxgate-ill-rocket.png" alt="" width={56} height={56} />
              <span className="grow">
                <span className="t-over" style={{ color: "var(--link)" }}>{upNext.revise ? t("reviseNextOver") : t("nextOver", { path: pathLabel })}</span>
                <b>{upNext.title[locale]}</b>
                <span className="t-small ink-2">{t("nextMeta", { unit: upNext.unitNo, n: upNext.lessonNo, minutes: upNext.minutes })}</span>
              </span>
            </section>
          ) : null}
          {proNext ? (
            <section className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "grid", placeItems: "center", inlineSize: 40, blockSize: 40, borderRadius: 12, background: "var(--panel)", color: "var(--panel-ink)", fontWeight: 800, flex: "none" }} className="num">{proNext.n}</span>
                <span style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="t-small ink-3" style={{ fontWeight: 700, fontSize: 12 }}>{tb("nextUnit")}</span><span className="pro-tag">PRO</span></span>
                  <b style={{ fontSize: 15 }}>{proNext.title}</b>
                </span>
              </div>
              <p className="t-small ink-2" style={{ fontSize: 13.5 }}>{tb("endPro", { n: proNext.n })}</p>
              <Link href="/app/plans" className="btn btn-secondary btn-block press">{tb("seePlans")}</Link>
            </section>
          ) : null}
          <div className="end-actions">
            <button type="button" className="btn btn-primary btn-lg press" onClick={go ?? onContinue}>{go ? t("nextGo") : revising ? t("backToPath") : t("continue")}<span className="ph ph-arrow flip" aria-hidden="true" /></button>
            {go ? <button type="button" className="btn btn-ghost btn-lg" onClick={onContinue}>{revising ? t("backToPath") : t("home")}</button> : null}
          </div>
        </div>
      </main>
      <footer className="end-foot">
        <button type="button" className="btn btn-primary btn-lg btn-block press" onClick={go ?? onContinue}>{go ? t("nextGo") : revising ? t("backToPath") : t("continue")}</button>
        {go ? <button type="button" className="btn btn-ghost btn-block" style={{ minBlockSize: 44 }} onClick={onContinue}>{revising ? t("backToPath") : t("home")}</button> : null}
      </footer>
      <PushAsk />
    </div>
  );
}
