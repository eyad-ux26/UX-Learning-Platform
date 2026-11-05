/* eslint-disable @next/next/no-img-element */
import { goalDaysOf } from "@/lib/progress";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconMark } from "@/components/Logo";
import type { PathView } from "@/lib/learning";
import type { Progress } from "@/lib/progress";
import type { Locale } from "@uxgate/content";
import { GoalRing, Week } from "./Goal";
import { FreezeNote } from "./FreezeNote";
import { PathChips } from "./PathChips";
import { catalogEntry, pathArtUrl } from "@/lib/catalog";
import { buildPathView } from "@/lib/learning";
import { reviewDue } from "@/lib/skill-state";
import { pathOfId } from "@/lib/review";
import type { Learner } from "@/lib/server/learner";

export const pathArt = pathArtUrl;

export async function greeting(hour: number, name: string | null) {
  const t = await getTranslations("home");
  const g = hour < 12 ? t("morning") : hour < 18 ? t("afternoon") : t("evening");
  return name ? t("greetName", { greeting: g, name }) : g;
}

export async function HomeMain({ me, view, bell }: { me: Learner; view: PathView; bell?: React.ReactNode }) {
  const { progress, hour } = me;
  const t = await getTranslations("home");
  const locale = (await getLocale()) as Locale;
  const next = view.next;
  const remaining = Math.max(0, progress.dailyGoal - progress.lessonsToday);
  const lang = next?.lesson.body.title[locale];
  const unitLessons = next ? view.units.find((u) => u.unit.id === next.unit.id)!.lessons : [];
  const unitNumber = next ? view.units.find((u) => u.unit.id === next.unit.id)!.number : 1;

  // A lesson started in another joined path, offered as "pick up where you left off" (it names its path).
  let resume: { lessonId: string; title: string; pathId: string; pathName: string } | null = null;
  for (const j of me.joined) {
    if (j.pathId === view.path.id) continue;
    const other = buildPathView(j.pathId, progress, me.practicedSkills);
    const l = other?.next;
    if (other && l?.state === "in_progress") { resume = { lessonId: l.lesson.lessonId, title: l.lesson.body.title[locale], pathId: j.pathId, pathName: catalogEntry(j.pathId)?.name ?? j.pathId }; break; }
  }
  const chips = me.joined.map((j) => {
    const v = buildPathView(j.pathId, progress, me.practicedSkills);
    return { id: j.pathId, name: catalogEntry(j.pathId)?.name ?? j.pathId, art: pathArt(j.pathId), pct: v && v.totalCount ? Math.round((v.doneCount / v.totalCount) * 100) : 0, current: j.pathId === view.path.id };
  });
  const now = new Date();
  const dueSkills = [...me.skillStates].filter(([, r]) => reviewDue(r, now));
  const due = { count: dueSkills.length, paths: new Set(dueSkills.map(([id]) => pathOfId(id))).size };

  return (
    <>
      <div className="topline only-mobile">
        <IconMark />
        <div style={{ flex: 1 }} />
        <span className="stat" aria-label={t("streakLabel", { count: progress.streak })}><span className="ph ph-flame-fill" style={{ color: "#F59E2B" }} aria-hidden="true" /><span className="num">{progress.streak}</span></span>
        <span className="stat" aria-label={t("xpLabel", { count: progress.xpTotal })}><span className="ph ph-bolt-fill" style={{ color: "var(--hl-ledge)" }} aria-hidden="true" /><span className="num ltr">{progress.xpTotal} XP</span></span>
        {bell}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 className="t-h1 h1-s" style={{ flex: 1 }}>{await greeting(hour, progress.displayName)}</h1>
        {bell ? <span className="only-desk">{bell}</span> : null}
      </div>
      {me.freezeNote ? <FreezeNote id={me.freezeNote.id} streak={progress.streak} /> : null}

      {next ? (
        <section className="card-panel next-card" aria-label={t("nextLabel")}>
          
          <img className="next-art" src={pathArt(view.path.id)} alt="" />
          <div className="stack">
            <div className="row"><span className="tag" style={{ background: "var(--surface)" }}><span className="ltr">{view.path.title.en}</span> · {t("unit", { n: unitNumber })}</span>{next.unit.free ? <span className="tag tag-free">{t("free")}</span> : null}</div>
            <div className="copy">
              <p className="t-over" style={{ color: "var(--link)" }}>{next.state === "in_progress" ? t("continueUp") : t("nextUp")}</p>
              <h2 className="t-h2" style={{ fontSize: 24, color: "var(--panel-ink)" }}>{lang}</h2>
              {next.lesson.body.summary?.[locale] ? <p className="t-body ink-2 lesson-body">{next.lesson.body.summary[locale]}</p> : null}
            </div>
            <div className="meta">
              <span className="t-small ink-2 meta-i"><span className="ph ph-book" aria-hidden="true" />{t("lessonOf", { n: next.indexInUnit, total: next.unitLessons })}</span>
              <span className="t-small ink-2 meta-i"><span className="ph ph-clock" aria-hidden="true" />{t("minutes", { count: next.lesson.minutes })}</span>
            </div>
            <div className="segs" aria-hidden="true">{unitLessons.map((l) => <span key={l.lesson.lessonId} className={l.state === "done" ? "on" : undefined} />)}</div>
            <Link href={`/app/lesson/${next.lesson.lessonId}`} className="btn btn-primary btn-lg btn-block press" style={{ marginBlockStart: 4 }}><span className="ph ph-play" aria-hidden="true" />{next.state === "in_progress" ? t("continue") : t("start")}</Link>
          </div>
        </section>
      ) : (
        <section className="card-panel next-card" aria-label={t("nextLabel")}>
          <div className="stack">
            <h2 className="t-h2" style={{ color: "var(--panel-ink)" }}>{t("allDone")}</h2>
            <p className="t-body ink-2">{t("allDoneBody")}</p>
          </div>
        </section>
      )}

      {resume ? (
        <section className="card resume-card" aria-label={t("resumeOver")}>
          
          <img src={pathArt(resume.pathId)} alt="" style={{ inlineSize: 44, blockSize: 44, flex: "none" }} />
          <div style={{ flex: 1, minInlineSize: 0 }}>
            <p className="t-over">{t("resumeOver")}</p>
            <p className="t-label">{resume.title}</p>
            <p className="t-small ink-2">{t("from", { path: resume.pathName })}</p>
          </div>
          <Link href={`/app/lesson/${resume.lessonId}`} className="btn btn-secondary btn-sm press">{t("continue")}</Link>
        </section>
      ) : null}

      {chips.length > 1 ? <PathChips chips={chips} label={t("yourPaths")} addLabel={t("addPath")} /> : null}

      {due.count > 0 ? (
        <Link href="/app/review" className="card press review-card">
          
          <img src="/ill/uxgate-ill-review.png" alt="" style={{ inlineSize: 44, blockSize: 44, flex: "none" }} />
          <div style={{ flex: 1, minInlineSize: 0 }}>
            <p className="t-label">{t("reviewTitle", { count: due.count })}</p>
            <p className="t-small ink-2">{t("reviewBody", { paths: due.paths, minutes: Math.max(2, Math.round(due.count * 1.2)) })}</p>
          </div>
          <span className="btn btn-secondary btn-sm" aria-hidden="true">{t("review")}</span>
        </Link>
      ) : null}

      <section className="card goal-card only-mobile" style={{ display: undefined }}>
        <div className="goal-row">
          <GoalRing done={progress.lessonsToday} goal={progress.dailyGoal} />
          <div style={{ flex: 1, minInlineSize: 0 }}>
            <p className="t-label" style={{ fontSize: 16 }}>{t("goalTitle")}</p>
            <p className="t-small ink-2">{remaining > 0 ? t("goalMore", { count: remaining }) : t("goalDone")}</p>
          </div>
        </div>
        <div className="rule" />
        <div className="streak-row">
          <span className="ph ph-flame-fill" style={{ fontSize: 20, color: "#F59E2B" }} aria-hidden="true" />
          <p className="t-label" style={{ fontSize: 15, flex: 1 }}>{progress.streak > 0 ? t("streakTitle", { count: progress.streak }) : t("streakNone")}</p>
          <Link href="/app/streak" className="kind"><span className="ph ph-freeze-fill" aria-hidden="true" />{me.freezes > 0 ? t("freezeReady", { count: me.freezes }) : t("freezeNone")}</Link>
        </div>
        <Week today={progress.today} activeDays={progress.activeDays} goalDays={goalDaysOf(progress)} frozenDays={progress.frozenDays} start={me.weekStart} />
      </section>
    </>
  );
}

export async function HomePanel({ progress, freezes = 0, weekStart }: { progress: Progress; freezes?: number; weekStart?: number }) {
  const t = await getTranslations("home");
  const remaining = Math.max(0, progress.dailyGoal - progress.lessonsToday);
  return (
    <>
      <div className="dk-prop">
        <p className="t-over">{t("goalTitle")}</p>
        <div className="goal-row" style={{ gap: 16 }}>
          <GoalRing done={progress.lessonsToday} goal={progress.dailyGoal} size={76} />
          <p className="t-small ink-2">{remaining > 0 ? t("goalMore", { count: remaining }) : t("goalDone")}</p>
        </div>
      </div>
      <div className="dk-prop">
        <div className="streak-row"><span className="ph ph-flame-fill" style={{ fontSize: 20, color: "#F59E2B" }} aria-hidden="true" /><p className="t-label" style={{ flex: 1 }}>{progress.streak > 0 ? t("streakTitle", { count: progress.streak }) : t("streakNone")}</p></div>
        <Week today={progress.today} activeDays={progress.activeDays} goalDays={goalDaysOf(progress)} frozenDays={progress.frozenDays} start={weekStart} small />
        <Link href="/app/streak" className="kind" style={{ alignSelf: "flex-start" }}><span className="ph ph-freeze-fill" aria-hidden="true" />{freezes > 0 ? t("freezeReady", { count: freezes }) : t("freezeNone")}</Link>
      </div>
      <div className="dk-prop">
        <span className="stat" style={{ alignSelf: "flex-start" }}><span className="ph ph-bolt-fill" style={{ color: "var(--hl-ledge)" }} aria-hidden="true" /><span className="num ltr">{progress.xpTotal} XP</span></span>
      </div>
    </>
  );
}
