"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { Lesson, Locale, Skill } from "@uxgate/content/types";
import { Link } from "@/i18n/navigation";
import { isQuestion, summarize, type LessonState } from "@uxgate/player/engine";

/**
 * Which skills a finished play got right on the first try. A skill check needs every step of the skill independent ("all");
 * in the mastery round one right first try is enough ("any"), the same rule the server uses to mark a skill Shown.
 */
export function skillResults(lesson: Lesson, state: LessonState, skills: Skill[], rule: "all" | "any" = "all") {
  const by = new Map<string, boolean>();
  lesson.steps.forEach((s, k) => {
    if (!isQuestion(s)) return;
    const ok = state.steps[k].outcome === "independent";
    by.set(s.skill, rule === "any" ? (by.get(s.skill) ?? false) || ok : (by.get(s.skill) ?? true) && ok);
  });
  return skills.filter((k) => by.has(k.id)).map((k) => ({ skill: k, shown: by.get(k.id) === true }));
}

function Page({ art, title, sub, children, foot }: { art: string; title: string; sub?: string; children?: React.ReactNode; foot: React.ReactNode }) {
  return (
    <div className="end lp-pageroot">
      <main className="lp-page">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lp-ill pop" src={`/ill/uxgate-ill-${art}.png`} alt="" width={200} height={200} />
        <h1 className="t-h2" tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>{title}</h1>
        {sub ? <p className="t-body ink-2">{sub}</p> : null}
        {children}
      </main>
      <footer className="lp-foot">{foot}</footer>
    </div>
  );
}

function SkillRow({ title, can, status, label, retry }: { title: string; can?: string; status: "shown" | "kept"; label: string; retry?: false } | { title: string; can?: string; status: "later"; label: string; retry: true }) {
  return (
    <li className={`lp-skillrow${retry ? " is-retry" : ""}`}>
      <span className={`ph ${status === "kept" ? "ph-star-fill" : status === "shown" ? "ph-check-circle-fill" : "ph-arrow-counter-clockwise"}`} style={status === "kept" ? { color: "var(--gold-ledge)" } : undefined} aria-hidden="true" />
      <span className="grow"><b>{title}</b>{can ? <span>{can}</span> : null}</span>
      <span className={`skill ${status === "kept" ? "skill-kept" : status === "shown" ? "skill-practiced" : "skill-later"}`}>{label}</span>
    </li>
  );
}

/**
 * End of a review session. Right first try on a due skill: Kept, its badge turns gold. Missed: it comes back tomorrow
 * with a new case and stays Shown. The server applies the same rule (one right first try per skill).
 */
export function ReviewEnd({ lesson, state, locale, skills, offline, onHome, onBadges, onSound }: { lesson: Lesson; state: LessonState; locale: Locale; skills: Skill[]; offline: boolean; onHome: () => void; onBadges: () => void; onSound?: (name: string) => void }) {
  const t = useTranslations("review");
  const tp = useTranslations("pages");
  const rows = skillResults(lesson, state, skills, "any");
  const sum = summarize(lesson, state);
  const kept = rows.filter((r) => r.shown).length;
  const again = rows.length - kept;
  // The gold badge moment: one sound for the whole page, after the lesson-complete chime.
  useEffect(() => { if (kept) { const id = setTimeout(() => onSound?.("badge-unlock"), 700); return () => clearTimeout(id); } }, [kept, onSound]);
  return (
    <Page art={kept ? "trophy" : "review"} title={t("doneTitle")} sub={t("doneSub", { n: rows.length })}
      foot={<>
        <button type="button" className="btn btn-primary btn-lg press" onClick={onHome}>{t("home")}</button>
        {kept ? <button type="button" className="btn btn-ghost" style={{ minBlockSize: 44 }} onClick={onBadges}>{t("seeBadges")}</button> : null}
      </>}>
      {offline ? <p className="lp-banner" role="status"><span className="ph ph-cloud-arrow-up" aria-hidden="true" />{tp("syncLater")}</p> : null}
      <p className="lp-chips">
        <span className="pill pop"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr">+{sum.xp} XP</span></span>
        {kept ? <span className="pill"><span className="ph ph-star-fill" style={{ color: "var(--gold-ledge)" }} aria-hidden="true" /><span><span className="num">{kept}</span> {t("nowKept")}</span></span> : null}
        {again ? <span className="pill"><span className="ph ph-replay" style={{ color: "var(--link)" }} aria-hidden="true" /><span><span className="num">{again}</span> {t("backTomorrow")}</span></span> : null}
      </p>
      <h2 className="t-small ink-2 lp-roundhd">{t("changed")}</h2>
      <ul className="lp-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map(({ skill, shown: ok }) => ok
          ? <SkillRow key={skill.id} title={skill.title[locale]} can={t("rightAgain")} status="kept" label={t("kept")} />
          : <SkillRow key={skill.id} title={skill.title[locale]} can={t("newCase")} status="later" label={t("backTomorrow")} retry />)}
      </ul>
      {kept ? <p className="t-small" style={{ fontWeight: 700 }}><span className="ph ph-star-fill" style={{ color: "var(--gold-ledge)" }} aria-hidden="true" /> {t("goldN", { n: kept })}</p> : null}
      <p className="t-small ink-2"><span className="ph ph-info" aria-hidden="true" /> {t("doneNote")}</p>
    </Page>
  );
}

/** End of a skill check: each skill is Shown or "Try again later". The mastery round follows when something was missed. */
export function CheckSummary({ lesson, state, locale, unitSkills, offline, onMastery, onContinue }: { lesson: Lesson; state: LessonState; locale: Locale; unitSkills: Skill[]; offline: boolean; onMastery: () => void; onContinue: () => void }) {
  const t = useTranslations("pages");
  const rows = skillResults(lesson, state, unitSkills);
  const shown = rows.filter((r) => r.shown).length;
  const all = shown === rows.length;
  return (
    <Page
      art={all ? "trophy" : "target"} title={t("checkTitle")}
      sub={all ? t("checkAll") : t("checkSome", { shown, total: rows.length })}
      foot={
        <>
          {!all ? <button type="button" className="btn btn-primary btn-lg press" onClick={onMastery}>{t("masteryCta")}<span className="ph ph-arrow flip" aria-hidden="true" /></button> : null}
          <button type="button" className={`btn btn-lg press ${all ? "btn-primary" : "btn-secondary"}`} onClick={onContinue}>{t("continue")}</button>
        </>
      }
    >
      {offline ? <p className="lp-banner" role="status"><span className="ph ph-cloud-arrow-up" aria-hidden="true" />{t("syncLater")}</p> : null}
      <ul className="lp-list" aria-label={t("skills")} style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map(({ skill, shown: ok }) => ok
          ? <SkillRow key={skill.id} title={skill.title[locale]} status="shown" label={t("shown")} />
          : <SkillRow key={skill.id} title={skill.title[locale]} status="later" label={t("later")} retry />)}
      </ul>
    </Page>
  );
}

/** End of the mastery round: skills answered right on the one try move to Shown; the rest come back once more. */
export function MasteryEnd({ lesson, state, locale, unitSkills, unitId, onContinue }: { lesson: Lesson; state: LessonState; locale: Locale; unitSkills: Skill[]; unitId: string; onContinue: () => void }) {
  const t = useTranslations("pages");
  const rows = skillResults(lesson, state, unitSkills, "any");
  const sum = summarize(lesson, state);
  const shownN = rows.filter((r) => r.shown).length;
  const unitNo = Number(unitId.split("-U")[1]) || 1;
  return (
    <Page art={shownN === rows.length ? "trophy" : "target"} title={t("unitDoneTitle", { n: unitNo })} foot={<button type="button" className="btn btn-primary btn-lg press" onClick={onContinue}>{t("backToPath")}</button>}>
      <p className="lp-chips">
        <span className="pill pop"><span className="ph ph-bolt-fill" aria-hidden="true" /><span className="num ltr">+{sum.xp} XP</span></span>
        <span className="pill"><span className="ph ph-check-circle-fill" aria-hidden="true" /><span>{t("shownOf", { shown: shownN, total: rows.length })}</span></span>
      </p>
      <h2 className="t-small ink-2 lp-roundhd">{t("thisRound")}</h2>
      <ul className="lp-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map(({ skill, shown: ok }) => ok
          ? <SkillRow key={skill.id} title={skill.title[locale]} can={t("rightFirst")} status="shown" label={t("shown")} />
          : <SkillRow key={skill.id} title={skill.title[locale]} can={t("backInReview")} status="later" label={t("later")} retry />)}
      </ul>
      <p className="t-small ink-2">{t("keptNote")}</p>
    </Page>
  );
}

/** Before the round: which skills come back. */
export function MasteryIntro({ skills, locale, onStart, backHref }: { skills: Skill[]; locale: Locale; onStart: () => void; backHref: string }) {
  const t = useTranslations("pages");
  return (
    <Page art="target" title={t("masteryTitle")} sub={t("masteryBody", { n: skills.length })}
      foot={<><button type="button" className="btn btn-primary btn-lg press" onClick={onStart}>{t("masteryStart")}<span className="ph ph-arrow flip" aria-hidden="true" /></button><Link href={backHref as never} className="btn btn-secondary btn-lg press">{t("notNow")}</Link></>}>
      <ul className="lp-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {skills.map((k) => <li key={k.id} className="lp-skillrow"><span className="ph ph-target" aria-hidden="true" /><span className="grow"><b>{k.title[locale]}</b></span></li>)}
      </ul>
    </Page>
  );
}

/** Nothing was missed in the unit, so there is no round. */
export function MasteryNone({ backHref, usedUp = false }: { backHref: string; usedUp?: boolean }) {
  const t = useTranslations("pages");
  return (
    <Page art="empty-box" title={t(usedUp ? "usedUpTitle" : "noneTitle")} sub={t(usedUp ? "usedUpBody" : "noneBody")} foot={<Link href={backHref as never} className="btn btn-primary btn-lg press">{t("continue")}</Link>} />
  );
}

/** The skill check is not finished yet, so the round is not open. */
export function MasteryLocked({ backHref }: { backHref: string }) {
  const t = useTranslations("pages");
  return <Page art="lock" title={t("lockedTitle")} sub={t("lockedBody")} foot={<Link href={backHref as never} className="btn btn-primary btn-lg press">{t("continue")}</Link>} />;
}

/** End of the sample lesson: the result stays on this device until the learner signs up. */
export function GuestEnd({ lesson, state, locale }: { lesson: Lesson; state: LessonState; locale: Locale }) {
  const t = useTranslations("pages");
  const sum = summarize(lesson, state);
  void locale;
  const mark = () => { try { localStorage.setItem("ug-guest-handoff", String(Date.now())); } catch { /* private mode: the result is simply not carried over */ } };
  return (
    <Page art="gate" title={t("guestTitle")} sub={t("guestBody", { n: sum.independent, total: sum.questions })}
      foot={<><Link href="/signup" className="btn btn-primary btn-lg press" onClick={mark}><span className="ph ph-user-plus" aria-hidden="true" />{t("guestKeep")}</Link><Link href="/" className="btn btn-secondary btn-lg press">{t("notNow")}</Link></>}>
      <p className="t-small ink-2">{t("guestNote")}</p>
    </Page>
  );
}
