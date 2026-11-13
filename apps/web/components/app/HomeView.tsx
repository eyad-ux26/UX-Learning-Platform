/* eslint-disable @next/next/no-img-element */
import { PathName } from "@/components/PathName";
import { goalDaysOf } from "@/lib/progress";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconMark } from "@/components/Logo";
import type { PathView } from "@/lib/learning";
import type { Locale } from "@uxgate/content";
import { GoalRing, Week } from "./Goal";
import { FreezeNote } from "./FreezeNote";
import { PathChips } from "./PathChips";
import { XpChip } from "./XpChip";
import { localPathName, pathArtUrl } from "@/lib/catalog";
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

export async function HomeMain({
  me,
  view,
  bell,
  banner,
}: {
  me: Learner;
  view: PathView;
  bell?: React.ReactNode;
  banner?: React.ReactNode;
}) {
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
    if (other && l?.state === "in_progress") {
      resume = {
        lessonId: l.lesson.lessonId,
        title: l.lesson.body.title[locale],
        pathId: j.pathId,
        pathName: localPathName(j.pathId, locale),
      };
      break;
    }
  }
  // "Unit 2 · 6/20" under each Your paths card (design S3-2), or "Not started".
  const where = (v: PathView | null) => {
    if (!v || !v.doneCount) return t("pathNotStarted");
    const u = v.units.find((x) => x.lessons.some((l) => l.state !== "done")) ?? v.units[v.units.length - 1];
    return t("pathWhere", { unit: u?.number ?? 1, done: v.doneCount, total: v.totalCount });
  };
  const joinedIds = me.joined.length
    ? [view.path.id, ...me.joined.map((j) => j.pathId).filter((id) => id !== view.path.id)]
    : [view.path.id];
  const chips = joinedIds.map((id) => {
    const j = { pathId: id };
    const v = buildPathView(j.pathId, progress, me.practicedSkills);
    return {
      id: j.pathId,
      name: localPathName(j.pathId, locale),
      art: pathArt(j.pathId),
      pct: v && v.totalCount ? Math.round((v.doneCount / v.totalCount) * 100) : 0,
      current: j.pathId === view.path.id,
      where: where(v),
    };
  });
  const now = new Date();
  const dueSkills = [...me.skillStates].filter(([, r]) => reviewDue(r, now));
  const due = { count: dueSkills.length, paths: new Set(dueSkills.map(([id]) => pathOfId(id))).size };

  const streakText = progress.streak > 0 ? t("streakTitle", { count: progress.streak }) : t("streakNone");

  // Layout follows the approved canvas board S3-2 (PathsPages, view "home"): a header with the streak and XP, the greeting,
  // then two columns on a laptop. Left: Your paths and the next lesson. Right: review and the goal and streak card.
  // The old full-height side panel (Sprint 1 DeskHome) is gone, as on the board (Eyad, 12 Nov).
  return (
    <>
      <div className="home-top">
        <span className="only-mobile">
          <IconMark />
        </span>
        <div style={{ flex: 1 }} />
        <Link
          href="/app/streak"
          className="stat stat-link"
          aria-label={`${t("streakLabel", { count: progress.streak })}. ${t("streakOpen")}`}
        >
          <span className="ph ph-flame-fill" style={{ color: "#F59E2B" }} aria-hidden="true" />
          <span className="num">{progress.streak}</span>
        </Link>
        <XpChip xp={progress.xpTotal} />
        {bell}
        <Link href="/app/profile" className="avatar only-desk home-avatar" aria-label={t("profile")}>
          {(progress.displayName ?? "U").trim().charAt(0).toUpperCase() || "U"}
        </Link>
      </div>
      <h1 className="t-h1 h1-s">{await greeting(hour, progress.displayName)}</h1>
      {banner}
      {/* A freeze that kept a streak of 0 days kept nothing worth saying (QA, 12 Nov). */}
      {me.freezeNote && progress.streak > 0 ? <FreezeNote id={me.freezeNote.id} streak={progress.streak} /> : null}

      <div className="home-split">
        <div className="pg-stack" style={{ gap: 14 }}>
          {/* "Your paths" sits at the top, so switching path comes before the lesson card it changes (Eyad, 5 Nov). */}
          <PathChips chips={chips} label={t("yourPaths")} addLabel={t("addPath")} allLabel={t("allPaths")} />

          {next ? (
            <section className="card-panel next-card" aria-label={t("nextLabel")}>
              <img className="next-art" src={pathArt(view.path.id)} alt="" />
              <div className="stack">
                <div className="row">
                  <span
                    className="tag"
                    style={{ background: "var(--surface)", blockSize: "auto", minBlockSize: 26, paddingBlock: 3 }}
                  >
                    <span>
                      <PathName name={localPathName(view.path.id, locale) ?? ""} /> ·{" "}
                      <span style={{ whiteSpace: "nowrap" }}>{t("unit", { n: unitNumber })}</span>
                    </span>
                  </span>
                  {next.unit.free ? <span className="tag tag-free">{t("free")}</span> : null}
                </div>
                <div className="copy">
                  <p className="t-over" style={{ color: "var(--link)" }}>
                    {next.state === "in_progress" ? t("continueUp") : t("nextUp")}
                  </p>
                  <h2 className="t-h2" style={{ fontSize: 24, color: "var(--panel-ink)" }}>
                    {lang}
                  </h2>
                </div>
                <div className="meta">
                  <span className="t-small ink-2 meta-i">
                    <span className="ph ph-book" aria-hidden="true" />
                    {t("lessonOf", { n: next.indexInUnit, total: next.unitLessons })}
                  </span>
                  <span className="t-small ink-2 meta-i">
                    <span className="ph ph-clock" aria-hidden="true" />
                    {t("minutes", { count: next.lesson.minutes })}
                  </span>
                </div>
                <div className="segs" aria-hidden="true">
                  {unitLessons.map((l) => (
                    <span key={l.lesson.lessonId} className={l.state === "done" ? "on" : undefined} />
                  ))}
                </div>
                <Link
                  href={`/app/lesson/${next.lesson.lessonId}`}
                  className="btn btn-primary btn-lg btn-block press"
                  style={{ marginBlockStart: 4 }}
                >
                  <span className="ph ph-play" aria-hidden="true" />
                  {next.state === "in_progress" ? t("continue") : t("start")}
                </Link>
              </div>
            </section>
          ) : (
            <section className="card-panel next-card" aria-label={t("nextLabel")}>
              <div className="stack">
                <h2 className="t-h2" style={{ color: "var(--panel-ink)" }}>
                  {t("allDone")}
                </h2>
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
              <Link href={`/app/lesson/${resume.lessonId}`} className="btn btn-secondary btn-sm press">
                {t("continue")}
              </Link>
            </section>
          ) : null}
        </div>

        <div className="pg-stack" style={{ gap: 14 }}>
          {due.count > 0 ? (
            <Link href="/app/review" className="card press review-card">
              <span className="review-ic" aria-hidden="true">
                <span className="ph ph-review" />
              </span>
              <div style={{ flex: 1, minInlineSize: 0 }}>
                <p className="t-label" style={{ fontSize: 16 }}>
                  {t("reviewTitle", { count: due.count })}
                </p>
                <p className="t-small ink-2">
                  {t("reviewBody", { paths: due.paths, minutes: Math.max(2, Math.round(due.count * 1.2)) })}
                </p>
              </div>
              <span className="btn btn-secondary btn-sm" aria-hidden="true">
                {t("review")}
              </span>
            </Link>
          ) : null}

          <section className="card goal-card" aria-label={t("goalTitle")}>
            <div className="goal-row">
              <GoalRing done={progress.lessonsToday} goal={progress.dailyGoal} />
              <div style={{ flex: 1, minInlineSize: 0 }}>
                <p className="t-label" style={{ fontSize: 16 }}>
                  {t("goalTitle")}
                </p>
                <p className="t-small ink-2">{remaining > 0 ? t("goalMore", { count: remaining }) : t("goalDone")}</p>
              </div>
            </div>
            <div className="rule" />
            {/* The whole streak row opens the streak page, not only the freeze line (Eyad, 12 Nov). */}
            <Link
              href="/app/streak"
              className="streak-row streak-link"
              aria-label={`${streakText}. ${t("streakOpen")}`}
            >
              <span className="ph ph-flame-fill" style={{ fontSize: 20, color: "#F59E2B" }} aria-hidden="true" />
              <span className="t-label" style={{ fontSize: 15, flex: 1 }}>
                {streakText}
              </span>
              <span className="kind">
                <span className="ph ph-freeze-fill" aria-hidden="true" />
                {me.freezes > 0 ? t("freezeReady", { count: me.freezes }) : t("freezeNone")}
              </span>
              <span className="ph ph-caret-right flip ink-3" aria-hidden="true" />
            </Link>
            <Week
              today={progress.today}
              activeDays={progress.activeDays}
              goalDays={goalDaysOf(progress)}
              frozenDays={progress.frozenDays}
              start={me.weekStart}
            />
          </section>
        </div>
      </div>
    </>
  );
}
