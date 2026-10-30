import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import type { PathLesson, PathView } from "@/lib/learning";
import type { Progress } from "@/lib/progress";
import { pathArt } from "./HomeView";

function Row({ l, t, locale }: { l: PathLesson; t: Awaited<ReturnType<typeof getTranslations>>; locale: Locale }) {
  const title = l.lesson.body.title[locale];
  const mins = t("minutes", { count: l.lesson.minutes });
  const href = `/app/lesson/${l.lesson.lessonId}`;
  if (l.state === "locked") {
    return (
      <li>
        <span className="node locked"><span className="ph ph-lock-fill" style={{ fontSize: 20 }} aria-hidden="true" /></span>
        <div className="card lcard locked" aria-disabled="true">
          <span className="t-label">{title}</span>
          <span className="lsub mute"><span className="ph ph-clock" aria-hidden="true" />{mins}</span>
        </div>
      </li>
    );
  }
  if (l.state === "done") {
    return (
      <li>
        <span className="node done"><span className="ph ph-check" style={{ fontSize: 22 }} aria-hidden="true" /></span>
        <Link href={href} className="card press lcard" aria-label={`${title}. ${t("replay")}`}>
          <span className="t-label">{title}</span>
          <span className="lsub done"><span className="ph ph-check-circle-fill" aria-hidden="true" />{t("done")} · <span className="num ltr">+{l.xp} XP</span></span>
        </Link>
      </li>
    );
  }
  const cont = l.state === "in_progress";
  return (
    <li>
      <span className="node next"><span className="ph ph-play" style={{ fontSize: 20 }} aria-hidden="true" /></span>
      <div className="card lcard next">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="lsub" style={{ color: "var(--link)" }}>{cont ? t("inProgress") : t("next")} · {mins}</span>
          <span className="t-label" style={{ fontSize: 16 }}>{title}</span>
        </div>
        <Link href={href} className="btn btn-primary btn-sm btn-block press" style={{ marginBlockEnd: 4 }}><span className="ph ph-play" aria-hidden="true" />{cont ? t("continue") : t("start")}</Link>
      </div>
    </li>
  );
}

export async function PathMapMain({ view, progress }: { view: PathView; progress: Progress }) {
  const t = await getTranslations("map");
  const locale = (await getLocale()) as Locale;
  const pct = view.totalCount ? Math.round((view.doneCount / view.totalCount) * 100) : 0;
  const current = view.units.find((u) => u.lessons.some((l) => l.state !== "done")) ?? view.units[view.units.length - 1];

  return (
    <>
      <header className="map-head only-mobile" style={{ margin: "-12px -20px 0" }}>
        <Link href="/app" className="icon-btn plain" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <div style={{ flex: 1, minInlineSize: 0 }}>
          <p className="t-label" style={{ fontSize: 18 }}><bdi>{view.path.title.en}</bdi></p>
          <p className="t-small ink-3 sub-clamp" style={{ fontSize: 13 }}>{t("sub", { sub: view.path.subtitle[locale], units: view.unitCount })}</p>
        </div>
        <span className="stat"><span className="ph ph-bolt-fill" style={{ color: "var(--hl-ledge)" }} aria-hidden="true" /><span className="num ltr">{progress.xpTotal} XP</span></span>
      </header>

      <div className="only-desk" style={{ alignItems: "flex-end", gap: 24 }}>
        <div style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 className="t-h1" style={{ fontSize: 34, lineHeight: 1.15 }}><bdi>{view.path.title.en}</bdi></h1>
          <p className="t-body ink-2">{view.path.subtitle[locale]}</p>
        </div>
        <div style={{ inlineSize: 260, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span className="t-label">{t("pathProgress")}</span><span className="t-small num" style={{ fontWeight: 700 }}>{pct}%</span></div>
          <div className="progress progress-sm" aria-hidden="true"><i style={{ inlineSize: `${pct}%` }} /></div>
        </div>
      </div>

      <section className="card-panel prog-card only-mobile">
        <div className="col">
          <div className="between"><span className="t-label">{t("pathProgress")}</span><span className="t-small num" style={{ fontWeight: 700 }}>{pct}%</span></div>
          <div className="progress progress-sm" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("pathProgress")} style={{ background: "var(--surface)" }}><i style={{ inlineSize: `${pct}%` }} /></div>
          <span className="t-small ink-2" style={{ fontSize: 13 }}>{t("units", { unit: current.number, total: view.unitCount, done: view.doneCount, lessons: view.totalCount })}</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pathArt(view.path.id)} alt="" />
      </section>

      {view.units.map((u) => (
        <div key={u.unit.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="unit-h">
            <div className="tags">
              <span className="t-over">{t("unit", { n: u.number })}</span>
              {u.unit.free ? <span className="tag tag-free" style={{ blockSize: 22, fontSize: 12 }}>{t("free")}</span> : null}
              {u.practiced ? <span className="skill skill-practiced" style={{ blockSize: 22, fontSize: 12, padding: "0 9px" }}><span className="ph ph-check-circle" style={{ fontSize: 13 }} aria-hidden="true" />{t("practiced")}</span> : null}
            </div>
            <h2 className="t-h2" style={{ fontSize: 22 }}>{u.unit.title[locale]}</h2>
          </div>
          <ol className="lessons" style={{ ["--cols" as string]: u.lessons.length }}>
            {u.lessons.map((l) => <Row key={l.lesson.lessonId} l={l} t={t} locale={locale} />)}
          </ol>
        </div>
      ))}
    </>
  );
}

export async function PathMapPanel({ view }: { view: PathView }) {
  const t = await getTranslations("map");
  const locale = (await getLocale()) as Locale;
  const l = view.next;
  if (!l) return null;
  const cont = l.state === "in_progress";
  return (
    <>
      <div className="dk-prop">
        <p className="t-over">{t("next")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pathArt(view.path.id)} alt="" style={{ inlineSize: 120, blockSize: 120, alignSelf: "center" }} />
        <h2 className="t-h2">{l.lesson.body.title[locale]}</h2>
        <div className="meta-i t-small ink-2"><span className="ph ph-clock" aria-hidden="true" />{t("minutes", { count: l.lesson.minutes })}</div>
      </div>
      <Link href={`/app/lesson/${l.lesson.lessonId}`} className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{cont ? t("continue") : t("start")}</Link>
    </>
  );
}
