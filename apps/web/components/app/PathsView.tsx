/* eslint-disable @next/next/no-img-element */
import { PathName } from "@/components/PathName";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import { CATALOG, catalogEntry, catalogFor, isPlayable, localPathName, pathArtUrl, type CatalogRow } from "@/lib/catalog";
import { getPath } from "@uxgate/content";
import { buildPathView, pathBegun, type PathView } from "@/lib/learning";
import { isShown, pathSkills } from "@/lib/certificate";
import type { Learner } from "@/lib/server/learner";
import { ChoosePath } from "./ChoosePath";
import { PathSpotlight, type SpotCardData } from "./PathSpotlight";
import { ReviseSheet, type ReviseText } from "./ReviseSheet";
import { cookies } from "next/headers";
import { REVISE_COOKIE, REVISE_WITH_CHECK, canRevise, reviseHref, reviseLessons, reviseResume } from "@/lib/revise";

type T = Awaited<ReturnType<typeof getTranslations>>;

const pctOf = (v: PathView | null) => (v && v.totalCount ? Math.round((v.doneCount / v.totalCount) * 100) : 0);
const kindOf = (p: { kind: string }, t: T) => ({ cls: p.kind === "hybrid" ? "kind kind-hybrid" : "kind", icon: p.kind === "hybrid" ? "video" : "cursor-click", text: p.kind === "hybrid" ? t("hybrid") : t("interactive") });

/** "Unit 2 · 4 of 25 lessons" under the bar on a joined path, or "Not started". */
const whereOf = (v: PathView, t: T) => {
  if (!v.doneCount) return t("pjNotStarted");
  const u = v.units.find((x) => x.lessons.some((l) => l.state !== "done")) ?? v.units[v.units.length - 1];
  return t("pjWhere", { unit: u?.number ?? 1, done: v.doneCount, total: v.totalCount });
};

function Card({ p, view, t, locale, done, left }: { p: CatalogRow; view: PathView | null; t: T; locale: Locale; done?: number; left?: number }) {
  const k = kindOf(p, t);
  const pct = pctOf(view);
  if (p.state === "soon") {
    return (
      <div className="path-card is-soon" aria-disabled="true" aria-label={t("soonAria", { name: p.name })} style={{ padding: "10px 12px" }}>
        <span className="pc-ill" style={{ inlineSize: 44, blockSize: 44, borderRadius: 12 }}><img src={pathArtUrl(p.id)} alt="" style={{ inlineSize: 48, blockSize: 48 }} /></span>
        <span className="pc-text"><span className="pc-name" style={{ fontSize: 15 }}><PathName name={p.name ?? ""} /></span><span className="pc-sub" style={{ WebkitLineClamp: 1 }}>{p.sub[locale]}</span></span>
        <span className="kind kind-soon">{t("soon")}</span>
      </div>
    );
  }
  const joined = p.state === "current" || p.state === "joined";
  // "Your paths" and "Completed" cards share the spotlight card's look (Eyad, 12 Nov): name first, the tags and progress
  // under it, and a small path illustration on the end side with no tile behind it.
  const art = <><img className="pc-art pc-art-l" src={`/ill/paths/${p.id}.svg`} alt="" aria-hidden="true" /><img className="pc-art pc-art-d" src={`/ill/paths/${p.id}-dark.svg`} alt="" aria-hidden="true" /></>;
  if (done !== undefined) {
    // Completed (its certificate exists): mint card, Completed chip, no % bar (design S3-17).
    return (
      <Link href={`/app/paths/${p.id}`} className="path-card is-done press pc-stack has-art" aria-label={t("doneAria", { name: p.name })}>
        <span className="pc-name"><PathName name={p.name ?? ""} /></span>
        <span className="pc-meta">
          <span className="kind kind-done"><span className="ph ph-seal-check-fill" aria-hidden="true" />{t("completed")}</span>
          <span className={k.cls}><span className={`ph ph-${k.icon}`} aria-hidden="true" />{k.text}</span>
        </span>
        <span className="pc-done-row"><span className="ph ph-certificate" aria-hidden="true" />{t("doneLine", { count: done })}</span>
        {art}
      </Link>
    );
  }
  return (
    <Link href={`/app/paths/${p.id}`} className={`path-card press pc-stack has-art${p.state === "current" ? " is-current" : ""}`} aria-label={p.state === "current" ? t("currentAria", { name: p.name }) : p.name}>
      <span className="pc-name"><PathName name={p.name ?? ""} /></span>
      {!joined ? <span className="pc-sub">{p.sub[locale]}</span> : null}
      <span className="pc-meta">
        {p.state === "current" ? <span className="kind kind-current">{t("current")}</span> : null}
        <span className={k.cls}><span className={`ph ph-${k.icon}`} aria-hidden="true" />{k.text}</span>
        {left ? <span className="kind kind-left"><span className="ph ph-target" aria-hidden="true" />{t("skillsLeft", { count: left })}</span> : null}
        {!joined ? <><span className="kind">{t("units", { count: p.units })}</span><span className="kind kind-free">{t("free1")}</span></> : null}
      </span>
      {joined ? <span className="pc-prog"><span className="progress progress-sm" role="progressbar" aria-label={t("pathProgress")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ inlineSize: `${pct}%` }} /></span><span className="num">{pct}%</span></span> : null}
      {joined && view ? <span className="pc-where">{whereOf(view, t)}</span> : null}
      {art}
    </Link>
  );
}

/** The Paths tab: joined paths first (the current one wears the selection frame), then paths to start, then Coming soon ones, which cannot be opened. */
export async function PathsMain({ me }: { me: Learner }) {
  const t = await getTranslations("paths");
  const locale = (await getLocale()) as Locale;
  const rows = catalogFor(new Set(me.joined.map((j) => j.pathId)), me.activePathId, undefined, locale);
  const group = (s: CatalogRow["state"][]) => rows.filter((r) => s.includes(r.state));
  // A path is completed when its certificate exists (every skill Shown), not by lesson %.
  const certified = new Set((me.profileExtra?.certificates ?? []).map((c) => c.pathId));
  const isDone = (id: string) => certified.has(id);
  const joined = group(["current", "joined"]).filter((r) => !isDone(r.id));
  const completed = group(["current", "joined"]).filter((r) => isDone(r.id));
  const soon = group(["soon"]);
  // Playable paths for the spotlight (search, Featured courses, All paths), in catalog order. The instructor lives in the path's content.
  const spot: SpotCardData[] = CATALOG.filter((e) => isPlayable(e.id)).map((e) => {
    const rows1 = rows.find((r) => r.id === e.id);
    const ins = getPath(e.id)?.instructor;
    return { id: e.id, name: localPathName(e.id, locale), sub: e.sub[locale], units: rows1?.units ?? 0, video: e.kind === "hybrid", instructor: ins ? { name: ins.name[locale], photo: ins.photo } : null, joined: me.joined.some((j) => j.pathId === e.id) };
  });
  const viewOf = (id: string) => buildPathView(id, me.progress, me.practicedSkills);
  // Lessons all done but skills still to show: an amber chip says the skill check is what is left.
  const leftOf = (id: string) => {
    const v = viewOf(id);
    if (!v || !v.totalCount || v.doneCount < v.totalCount) return 0;
    return pathSkills(id).filter((sk) => !isShown(me.skillStates.get(sk.id)?.state)).length;
  };
  return (
    <div className="pg-page">
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <p className="t-small ink-2">{t("lead")}</p>
      {joined.length ? <>
        <p className="t-over">{t("secJoined", { count: joined.length })}</p>
        <div className="pg-cards">{joined.map((p) => <Card key={p.id} p={p} view={viewOf(p.id)} t={t} locale={locale} left={leftOf(p.id)} />)}</div>
      </> : null}
      {completed.length ? <>
        <p className="t-over">{t("secDone", { count: completed.length })}</p>
        <div className="pg-cards">{completed.map((p) => <Card key={p.id} p={p} view={null} t={t} locale={locale} done={pathSkills(p.id).length} />)}</div>
      </> : null}
      <PathSpotlight cards={spot} locale={locale} allHeading="all" />
      <p className="t-over"><span className="ph ph-hourglass" aria-hidden="true" /> {t("secSoon", { count: soon.length })}</p>
      <div className="pg-cards pg-cards-soon">{soon.map((p) => <Card key={p.id} p={p} view={null} t={t} locale={locale} />)}</div>
    </div>
  );
}

/** One path: what is in it, and Start (joins it) or Continue (makes it current). Both keep every other path's progress. */
type UnitRow = NonNullable<ReturnType<typeof buildPathView>>["units"][number];

/** A unit's state on the path page (design S3-19 frame 4): done, the one the learner is in, opened, or locked. */
function unitState(u: UnitRow, view: PathView): "done" | "cur" | "open" | "lock" {
  if (u.lessons.every((l) => l.state === "done")) return "done";
  if (u.lessons.every((l) => l.state === "locked")) return "lock";
  return view.next && u.lessons.some((l) => l.lesson.lessonId === view.next!.lesson.lessonId) ? "cur" : "open";
}

/** The Revise sheet's text for a unit: what revising does, and where an earlier revise stopped. */
function reviseText(u: UnitRow, t: T, locale: Locale, resumeAt: UnitRow["lessons"][number] | null): ReviseText {
  const lessons = reviseLessons(u, false).length;
  const hasCheck = REVISE_WITH_CHECK && reviseLessons(u).length > lessons;
  return {
    button: t("revise"), aria: t("reviseAria", { n: u.number }),
    over: t("unitOver", { n: u.number, count: u.lessons.length }), title: t("rvTitle"), body: t("rvBody"),
    rows: [
      { icon: "book", title: t("rvL1", { count: lessons }), sub: t("rvL1s") },
      { icon: "seal", title: t("rvL2"), sub: hasCheck ? t("rvL2sCheck") : t("rvL2s") },
      { icon: "bolt", title: t("rvL3"), sub: t("rvL3s") },
    ],
    resume: resumeAt ? t("rvResume", { n: resumeAt.indexInUnit, title: resumeAt.lesson.body.title[locale] }) : null,
    go: resumeAt ? t("rvContinue") : t("rvGo"), not: t("rvNot"),
  };
}

export async function PathDetailMain({ me, pathId }: { me: Learner; pathId: string }) {
  const t = await getTranslations("paths");
  const locale = (await getLocale()) as Locale;
  const entry = catalogEntry(pathId)!;
  const view = buildPathView(pathId, me.progress, me.practicedSkills);
  const joined = me.joined.some((j) => j.pathId === pathId);
  const isCurrent = joined && me.activePathId === pathId;
  const finished = (me.profileExtra?.certificates ?? []).some((c) => c.pathId === pathId);
  const k = kindOf(entry, t);
  const pct = pctOf(view);
  const other = me.activePathId !== pathId ? catalogEntry(me.activePathId) : null;
  const next = view?.next;
  const reviseCookie = (await cookies()).get(REVISE_COOKIE)?.value;
  const revisePoint = reviseCookie ? decodeURIComponent(reviseCookie) : null;
  // One main button: Start this path (nothing opened yet) or Continue this path, straight into the next lesson.
  const mainLabel = joined && view && pathBegun(view) ? t("continueCta") : t("startCta");
  const mapHref = `/app/path/${pathId}`;
  const goHref = next ? `/app/lesson/${next.lesson.lessonId}` : mapHref;
  const facts: string[] = joined
    ? [next ? t("nextIs", { title: next.lesson.body.title[locale], minutes: next.lesson.minutes }) : "", t("factGoal")].filter(Boolean)
    : [...(entry.kind === "hybrid" ? [t("factVideo"), t("factPractice")] : []), t("factCheck")];
  const actions = finished ? (
    <>
      <Link href={`/app/certificate/${pathId}`} className="btn btn-primary btn-lg btn-block press"><span className="ph ph-certificate" aria-hidden="true" />{t("seeCert")}</Link>
      <Link href={mapHref} className="btn btn-secondary btn-lg btn-block press">{t("reviewCta")}</Link>
    </>
  ) : isCurrent ? (
    <>
      {next ? <Link href={goHref} className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{mainLabel}</Link> : null}
      <Link href={mapHref} className={`btn ${next ? "btn-secondary" : "btn-primary"} btn-lg btn-block press`}>{t("seeMap")}</Link>
    </>
  ) : (
    <>
      <ChoosePath pathId={pathId} label={mainLabel} to={goHref} />
      <p className="t-small ink-2">{other && joined ? t("keepNamed", { name: localPathName(other.id, locale) }) : t("keep")}</p>
    </>
  );
  const aboutTitle = joined ? t("aboutContinue") : t("aboutStart");
  return (
    <div className="pg-page">
      <Link href="/app/paths" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}><span className="ph ph-arrow back" aria-hidden="true" />{t("title")}</Link>
      <div className="pg-split pd-split">
        <div className="pg-stack">
          <section className="card-panel" style={{ display: "flex", gap: 14, alignItems: "center", padding: 16, borderRadius: 24 }}>
            <img src={pathArtUrl(pathId)} alt="" className="pd-art" />
            <div style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <h1 className="t-h2" style={{ color: "var(--panel-ink)" }}><PathName name={localPathName(entry.id, locale) ?? ""} /></h1>
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
          {/* Phone: the main button sits above the unit list, so it shows without scrolling (S3-13). */}
          <div className="pd-go only-mobile">{actions}</div>
          <p className="t-over">{t("unitsTitle")}</p>
          <ol className="pg-units">
            {view?.units.map((u, i) => {
              const st = joined ? unitState(u, view) : (i === 0 ? "cur" : "lock");
              const doneN = u.lessons.filter((l) => l.state === "done").length;
              const note = st === "done" ? t("unitDoneNote") : st === "lock" ? (i > 0 ? t("unitOpensAfter", { n: i }) : "") : joined ? t("unitCurNote", { done: doneN, total: u.lessons.length }) : "";
              const revise = joined && canRevise(u);
              return (
                <li key={u.unit.id} className={`pd-unit is-${st}`} aria-current={st === "cur" && joined ? "step" : undefined}>
                  <span className="pd-dot" aria-hidden="true"><span className={`ph ${st === "done" ? "ph-check" : st === "lock" ? "ph-lock-fill" : "ph-play"}`} /></span>
                  <span className="grow">
                    <span className="pd-over">{t("unitOver", { n: u.number, count: u.lessons.length })}</span>
                    <span className="t-label pd-title">{u.unit.title[locale]}</span>
                    {note ? <span className="pd-note">{note}</span> : null}
                  </span>
                  {st === "done" ? <span className="kind kind-free">{t("unitDone")}</span> : st === "cur" && joined ? <span className="kind kind-current">{t("unitCurrent")}</span> : !joined && u.unit.free ? <span className="kind kind-free">{t("free1")}</span> : null}
                  {revise ? (() => {
                    const resumeAt = reviseResume(u, revisePoint);
                    const first = reviseLessons(u)[0] ?? u.lessons[0];
                    return <ReviseSheet id={u.unit.id} href={reviseHref((resumeAt ?? first).lesson.lessonId)} text={reviseText(u, t, locale, resumeAt)} />;
                  })() : null}
                </li>
              );
            })}
          </ol>
          <section className="card pg-about only-mobile">
            <p className="t-over">{aboutTitle}</p>
            <ul>{facts.map((f) => <li key={f} className="t-small">{f}</li>)}</ul>
          </section>
        </div>
        {/* Laptop: the main action card in a right column (S3-1 detail, pathJoined). */}
        <aside className="pg-stack only-desk">
          <section className="card pd-aside">
            <p className="t-over">{aboutTitle}</p>
            {facts.map((f) => <p key={f} className="pg-note"><span className="ph ph-info" aria-hidden="true" /><span>{f}</span></p>)}
            <div className="pd-go">{actions}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Confirmation after starting or switching: the new current path, and the others listed as Saved with their progress. */
export async function PathStartedMain({ me, pathId }: { me: Learner; pathId: string }) {
  const t = await getTranslations("paths");
  const locale = (await getLocale()) as Locale;
  const entry = catalogEntry(pathId)!;
  const view = buildPathView(pathId, me.progress, me.practicedSkills);
  const others = me.joined.filter((j) => j.pathId !== pathId);
  return (
    <div className="pg-page">
      <section className="card-panel" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 20, borderRadius: 24, alignItems: "center", textAlign: "center" }}>
        
        <img src={pathArtUrl(pathId)} alt="" style={{ inlineSize: 120, blockSize: 120 }} />
        <h1 className="t-h2" style={{ color: "var(--panel-ink)" }}>{t("startedTitle", { name: localPathName(entry.id, locale) })}</h1>
        <p className="t-body" style={{ color: "var(--ink-2)" }}>{t("startedBody")}</p>
      </section>
      {view?.next ? <Link href={`/app/lesson/${view.next.lesson.lessonId}`} className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{t("startFirst")}</Link> : null}
      <Link href={`/app/path/${pathId}`} className="btn btn-secondary btn-lg btn-block press">{t("seeMap")}</Link>
      {others.length ? (
        <div className="pg-cards">
          {others.map((o) => {
            const e = catalogEntry(o.pathId);
            const v = buildPathView(o.pathId, me.progress, me.practicedSkills);
            return e ? <div key={o.pathId} className="path-card"><span className="pc-ill"><img src={pathArtUrl(o.pathId)} alt="" /></span><span className="pc-text"><span className="pc-name"><PathName name={localPathName(e.id, locale) ?? ""} /></span><span className="pc-meta"><span className="kind">{t("saved")}</span><span className="t-small num">{pctOf(v)}%</span></span></span></div> : null;
          })}
        </div>
      ) : null}
    </div>
  );
}
