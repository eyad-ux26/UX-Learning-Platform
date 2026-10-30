import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconMark } from "@/components/Logo";
import type { PathView } from "@/lib/learning";
import type { Progress } from "@/lib/progress";
import type { Locale } from "@uxgate/content";
import { GoalRing, Week } from "./Goal";

const ART: Record<string, string> = { P01: "path-forms", P02: "path-hierarchy", P03: "path-usability" };
export const pathArt = (id: string) => `/ill/uxgate-ill-${ART[id] ?? "path-forms"}.png`;

export async function greeting(hour: number, name: string | null) {
  const t = await getTranslations("home");
  const g = hour < 12 ? t("morning") : hour < 18 ? t("afternoon") : t("evening");
  return name ? t("greetName", { greeting: g, name }) : g;
}

export async function HomeMain({ progress, view, hour }: { progress: Progress; view: PathView; hour: number }) {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as Locale;
  const next = view.next;
  const remaining = Math.max(0, progress.dailyGoal - progress.lessonsToday);
  const lang = next?.lesson.body.title[locale];
  const unitLessons = next ? view.units.find((u) => u.unit.id === next.unit.id)!.lessons : [];
  const unitNumber = next ? view.units.find((u) => u.unit.id === next.unit.id)!.number : 1;

  return (
    <>
      <div className="topline only-mobile">
        <IconMark />
        <div style={{ flex: 1 }} />
        <span className="stat" aria-label={t("streakLabel", { count: progress.streak })}><span className="ph ph-flame-fill" style={{ color: "#F59E2B" }} aria-hidden="true" /><span className="num">{progress.streak}</span></span>
        <span className="stat" aria-label={t("xpLabel", { count: progress.xpTotal })}><span className="ph ph-bolt-fill" style={{ color: "var(--hl-ledge)" }} aria-hidden="true" /><span className="num ltr">{progress.xpTotal} XP</span></span>
      </div>
      <h1 className="t-h1 h1-s">{await greeting(hour, progress.displayName)}</h1>

      {next ? (
        <section className="card-panel next-card" aria-label={t("nextLabel")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="next-art" src={pathArt(view.path.id)} alt="" />
          <div className="stack">
            <div className="row"><span className="tag" style={{ background: "var(--surface)" }}><span className="ltr">{view.path.title.en}</span> · {t("unit", { n: unitNumber })}</span>{next.unit.free ? <span className="tag tag-free">{t("free")}</span> : null}</div>
            <div className="copy">
              <p className="t-over" style={{ color: "var(--link)" }}>{next.state === "in_progress" ? t("continueUp") : t("nextUp")}</p>
              <h2 className="t-h2" style={{ fontSize: 24, color: "var(--panel-ink)" }}>{lang}</h2>
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
        </div>
        <Week today={progress.today} activeDays={progress.activeDays} />
      </section>
    </>
  );
}

export async function HomePanel({ progress }: { progress: Progress }) {
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
        <Week today={progress.today} activeDays={progress.activeDays} small />
      </div>
      <div className="dk-prop">
        <span className="stat" style={{ alignSelf: "flex-start" }}><span className="ph ph-bolt-fill" style={{ color: "var(--hl-ledge)" }} aria-hidden="true" /><span className="num ltr">{progress.xpTotal} XP</span></span>
      </div>
    </>
  );
}
