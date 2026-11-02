/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import { catalogEntry, catalogFor, pathArtUrl, type CatalogRow } from "@/lib/catalog";
import { buildPathView, type PathView } from "@/lib/learning";
import type { Learner } from "@/lib/server/learner";
import { ChoosePath } from "./ChoosePath";

type T = Awaited<ReturnType<typeof getTranslations>>;

const pctOf = (v: PathView | null) => (v && v.totalCount ? Math.round((v.doneCount / v.totalCount) * 100) : 0);
const kindOf = (p: { kind: string }, t: T) => ({ cls: p.kind === "hybrid" ? "kind kind-hybrid" : "kind", icon: p.kind === "hybrid" ? "video" : "cursor-click", text: p.kind === "hybrid" ? t("hybrid") : t("interactive") });

function Card({ p, view, t, locale }: { p: CatalogRow; view: PathView | null; t: T; locale: Locale }) {
  const k = kindOf(p, t);
  const pct = pctOf(view);
  if (p.state === "soon") {
    return (
      <div className="path-card is-soon" aria-disabled="true" aria-label={t("soonAria", { name: p.name })} style={{ padding: "10px 12px" }}>
        <span className="pc-ill" style={{ inlineSize: 44, blockSize: 44, borderRadius: 12 }}><img src={pathArtUrl(p.id)} alt="" style={{ inlineSize: 48, blockSize: 48 }} /></span>
        <span className="pc-text"><span className="pc-name" style={{ fontSize: 15 }}><bdi>{p.name}</bdi></span><span className="pc-sub" style={{ WebkitLineClamp: 1 }}>{p.sub[locale]}</span></span>
        <span className="kind kind-soon">{t("soon")}</span>
      </div>
    );
  }
  const joined = p.state === "current" || p.state === "joined";
  return (
    <Link href={`/app/paths/${p.id}`} className={`path-card press${p.state === "current" ? " is-current" : ""}`} aria-label={p.state === "current" ? t("currentAria", { name: p.name }) : p.name}>
      <span className="pc-ill"><img src={pathArtUrl(p.id)} alt="" /></span>
      <span className="pc-text">
        <span className="pc-name"><bdi>{p.name}</bdi></span>
        {!joined ? <span className="pc-sub">{p.sub[locale]}</span> : null}
        <span className="pc-meta">
          {p.state === "current" ? <span className="kind kind-current">{t("current")}</span> : null}
          <span className={k.cls}><span className={`ph ph-${k.icon}`} aria-hidden="true" />{k.text}</span>
          {!joined ? <><span className="kind">{t("units", { count: p.units })}</span><span className="kind kind-free">{t("free1")}</span></> : null}
        </span>
        {joined ? <span className="pc-prog"><span className="progress progress-sm" role="progressbar" aria-label={t("pathProgress")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ inlineSize: `${pct}%` }} /></span><span className="num">{pct}%</span></span> : null}
      </span>
      <span className="pc-end"><span className="ph ph-caret flip" aria-hidden="true" /></span>
    </Link>
  );
}

/** The Paths tab: joined paths first (the current one wears the selection frame), then paths to start, then Coming soon ones, which cannot be opened. */
export async function PathsMain({ me }: { me: Learner }) {
  const t = await getTranslations("paths");
  const locale = (await getLocale()) as Locale;
  const rows = catalogFor(new Set(me.joined.map((j) => j.pathId)), me.activePathId);
  const group = (s: CatalogRow["state"][]) => rows.filter((r) => s.includes(r.state));
  const joined = group(["current", "joined"]);
  const fresh = group(["new"]);
  const soon = group(["soon"]);
  const viewOf = (id: string) => buildPathView(id, me.progress, me.practicedSkills);
  return (
    <div className="pg-page">
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <p className="t-small ink-2">{t("lead")}</p>
      {joined.length ? <>
        <p className="t-over">{t("secJoined", { count: joined.length })}</p>
        <div className="pg-cards">{joined.map((p) => <Card key={p.id} p={p} view={viewOf(p.id)} t={t} locale={locale} />)}</div>
      </> : null}
      <p className="t-over">{t("secNew")}</p>
      {fresh.length ? <div className="pg-cards">{fresh.map((p) => <Card key={p.id} p={p} view={null} t={t} locale={locale} />)}</div> : <p className="t-small ink-2">{t("empty")}</p>}
      <p className="t-over"><span className="ph ph-hourglass" aria-hidden="true" /> {t("secSoon", { count: soon.length })}</p>
      <div className="pg-cards pg-cards-soon">{soon.map((p) => <Card key={p.id} p={p} view={null} t={t} locale={locale} />)}</div>
    </div>
  );
}

/** One path: what is in it, and Start (joins it) or Continue (makes it current). Both keep every other path's progress. */
export async function PathDetailMain({ me, pathId }: { me: Learner; pathId: string }) {
  const t = await getTranslations("paths");
  const locale = (await getLocale()) as Locale;
  const entry = catalogEntry(pathId)!;
  const view = buildPathView(pathId, me.progress, me.practicedSkills);
  const joined = me.joined.some((j) => j.pathId === pathId);
  const isCurrent = joined && me.activePathId === pathId;
  const k = kindOf(entry, t);
  const pct = pctOf(view);
  const other = me.activePathId !== pathId ? catalogEntry(me.activePathId) : null;
  const next = view?.next;
  const facts: string[] = joined
    ? [next ? t("nextIs", { title: next.lesson.body.title[locale], minutes: next.lesson.minutes }) : "", t("factGoal")].filter(Boolean)
    : [...(entry.kind === "hybrid" ? [t("factVideo"), t("factPractice")] : []), t("factCheck")];
  return (
    <div className="pg-page">
      <Link href="/app/paths" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}><span className="ph ph-arrow back" aria-hidden="true" />{t("title")}</Link>
      <section className="card-panel" style={{ display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 24 }}>
        
        <img src={pathArtUrl(pathId)} alt="" style={{ inlineSize: 96, blockSize: 96, flex: "none" }} />
        <div style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <h1 className="t-h2" style={{ color: "var(--panel-ink)" }}><bdi>{entry.name}</bdi></h1>
          <p className="t-small" style={{ color: "var(--ink-2)" }}>{entry.sub[locale]}</p>
          <div className="pc-meta">
            {isCurrent ? <span className="kind kind-current">{t("current")}</span> : null}
            <span className={k.cls} style={{ background: "var(--surface)" }}><span className={`ph ph-${k.icon}`} aria-hidden="true" />{k.text}</span>
            <span className="kind" style={{ background: "var(--surface)" }}>{t("units", { count: view?.unitCount ?? 0 })}</span>
          </div>
        </div>
      </section>
      {joined && view ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="between"><span className="t-label">{t("pathProgress")}</span><span className="t-small num" style={{ fontWeight: 700 }}>{pct}%</span></div>
          <div className="progress progress-sm" role="progressbar" aria-label={t("pathProgress")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ inlineSize: `${pct}%` }} /></div>
          <span className="t-small ink-2">{t("progressText", { done: view.doneCount, total: view.totalCount })}</span>
        </div>
      ) : null}
      <p className="t-over">{t("unitsTitle")}</p>
      <ol className="pg-units">
        {view?.units.map((u) => (
          <li key={u.unit.id} className="card">
            <span className="t-label">{t("unitN", { n: u.number })} · {u.unit.title[locale]}</span>
            <span className="t-small ink-2">{t("lessonsN", { count: u.lessons.length })}{u.unit.free ? <> · <span className="kind kind-free">{t("free1")}</span></> : null}</span>
          </li>
        ))}
      </ol>
      <section className="card pg-about">
        <p className="t-over">{joined ? t("aboutContinue") : t("aboutStart")}</p>
        <ul>{facts.map((f) => <li key={f} className="t-small">{f}</li>)}</ul>
      </section>
      {isCurrent ? (
        <Link href={`/app/path/${pathId}`} className="btn btn-primary btn-lg press">{t("seeMap")}</Link>
      ) : (
        <>
          <ChoosePath pathId={pathId} label={joined ? t("continueCta") : t("startCta")} to={`/app/paths/${pathId}/started`} />
          <p className="t-small ink-2">{other && joined ? t("keepNamed", { name: other.name }) : t("keep")}</p>
        </>
      )}
    </div>
  );
}

/** Confirmation after starting or switching: the new current path, and the others listed as Saved with their progress. */
export async function PathStartedMain({ me, pathId }: { me: Learner; pathId: string }) {
  const t = await getTranslations("paths");
  const entry = catalogEntry(pathId)!;
  const view = buildPathView(pathId, me.progress, me.practicedSkills);
  const others = me.joined.filter((j) => j.pathId !== pathId);
  return (
    <div className="pg-page">
      <section className="card-panel" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 20, borderRadius: 24, alignItems: "center", textAlign: "center" }}>
        
        <img src={pathArtUrl(pathId)} alt="" style={{ inlineSize: 120, blockSize: 120 }} />
        <h1 className="t-h2" style={{ color: "var(--panel-ink)" }}>{t("startedTitle", { name: entry.name })}</h1>
        <p className="t-body" style={{ color: "var(--ink-2)" }}>{t("startedBody")}</p>
      </section>
      {view?.next ? <Link href={`/app/lesson/${view.next.lesson.lessonId}`} className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{t("startFirst")}</Link> : null}
      <Link href={`/app/path/${pathId}`} className="btn btn-secondary btn-lg btn-block press">{t("seeMap")}</Link>
      {others.length ? (
        <div className="pg-cards">
          {others.map((o) => {
            const e = catalogEntry(o.pathId);
            const v = buildPathView(o.pathId, me.progress, me.practicedSkills);
            return e ? <div key={o.pathId} className="path-card"><span className="pc-ill"><img src={pathArtUrl(o.pathId)} alt="" /></span><span className="pc-text"><span className="pc-name"><bdi>{e.name}</bdi></span><span className="pc-meta"><span className="kind">{t("saved")}</span><span className="t-small num">{pctOf(v)}%</span></span></span></div> : null;
          })}
        </div>
      ) : null}
    </div>
  );
}
