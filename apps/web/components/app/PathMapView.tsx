import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import type { PathLesson, PathView } from "@/lib/learning";
import type { Progress } from "@/lib/progress";
import { pathArt } from "./HomeView";
import { PathSwitcher } from "./PathSwitcher";
import { LockedUnitSheet, type LockedUnitText } from "./LockedUnitSheet";
import { catalogEntry } from "@/lib/catalog";
import { buildPathView, pathBegun, testOutCheck } from "@/lib/learning";
import { certificateEarned, pathProgressCounts, pathSkills } from "@/lib/certificate";
import type { Learner } from "@/lib/server/learner";
import { FreeProList } from "@/components/billing/FreeProList";

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
      <Link href={href} className="card press lcard next" aria-label={`${title}. ${cont ? t("continue") : t("start")}`}>
        <span className="lsub" style={{ color: "var(--link)" }}>{cont ? t("inProgress") : t("next")} · {mins}</span>
        <span className="t-label" style={{ fontSize: 16 }}>{title}</span>
      </Link>
    </li>
  );
}

/**
 * The path's one main action, at the top of the map (canvas v67, S3-13): Start this path before any lesson is opened,
 * Continue this path afterwards (straight into the next unfinished lesson), and a finished path's review and certificate.
 * A free learner whose next lesson is in a Pro unit gets the paywall, as the lesson page would send them.
 */
async function PathGo({ view, me, pct, locale }: { view: PathView; me: Learner; pct: number; locale: Locale }) {
  const t = await getTranslations("map");
  const tp = await getTranslations("paths");
  const next = view.next;
  if (!next) {
    const stateOf = (id: string) => me.skillStates.get(id)?.state;
    const skills = pathProgressCounts(view.path.id, stateOf);
    const cert = certificateEarned(view.path.id, stateOf);
    return (
      <section className="path-go" aria-labelledby="pgo-title">
        <span className="pgo-ic is-done" aria-hidden="true"><span className="ph ph-trophy-fill" /></span>
        <div className="pgo-text">
          <p className="pgo-over">{t("goDoneOver")}</p>
          <h2 className="pgo-title" id="pgo-title">{t("goDoneTitle", { name: catalogEntry(view.path.id)?.name ?? view.path.title[locale] })}</h2>
          <p className="pgo-meta">{t("goDoneMeta", { total: view.totalCount, shown: skills.shown, skills: skills.total })}</p>
        </div>
        <div className="pgo-acts">
          <Link href="/app/review" className="btn btn-primary btn-lg btn-block press">{t("goReview")}<span className="ph ph-review" aria-hidden="true" /></Link>
          {cert ? <Link href={`/app/certificate/${view.path.id}`} className="pg-link"><span className="ph ph-certificate" aria-hidden="true" />{t("goCert")}</Link> : null}
        </div>
      </section>
    );
  }
  const begun = pathBegun(view);
  const unitNo = view.units.find((u) => u.unit.id === next.unit.id)?.number ?? 1;
  const locked = !me.pro && !next.unit.free;
  const href = locked ? `/app/path/${view.path.id}?paywall=${next.unit.id}` : `/app/lesson/${next.lesson.lessonId}`;
  const minutes = t("minutes", { count: next.lesson.minutes });
  return (
    <section className="path-go" aria-labelledby="pgo-title">
      <span className="pgo-ic" aria-hidden="true"><span className={`ph ph-${begun ? "play-fill" : "cursor-fill"}`} /></span>
      <div className="pgo-text">
        <p className="pgo-over">{t(begun ? "goNextOver" : "goStartOver", { unit: unitNo, lesson: next.indexInUnit })}</p>
        <h2 className="pgo-title" id="pgo-title">{next.lesson.body.title[locale]}</h2>
        <p className="pgo-meta">{begun
          ? t("goNextMeta", { minutes, done: view.doneCount, total: view.totalCount })
          : t("goStartMeta", { minutes, units: tp("units", { count: view.unitCount }), lessons: tp("lessonsN", { count: view.totalCount }) })}</p>
      </div>
      {begun ? (
        <div className="pgo-prog">
          <span className="progress progress-sm" role="progressbar" aria-label={t("pathProgress")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ inlineSize: `${pct}%` }} /></span>
          <span className="num">{pct}%</span>
        </div>
      ) : null}
      <div className="pgo-acts">
        <Link href={href} scroll={!locked} className="btn btn-primary btn-lg btn-block press">{begun ? tp("continueCta") : tp("startCta")}<span className="ph ph-arrow flip" aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

/** Why a unit is locked and how to open it: every condition with its state. */
function LockedUnit({ view, index, me, t, locale }: { view: PathView; index: number; me: Learner; t: Awaited<ReturnType<typeof getTranslations>>; locale: Locale }) {
  const u = view.units[index];
  const prev = view.units[index - 1];
  const checked = !prev || (prev.unit.skills.length > 0 && prev.unit.skills.every((s) => { const st = me.skillStates.get(s.id)?.state; return st === "shown" || st === "kept"; }));
  const resume = prev?.lessons.find((l) => l.state === "in_progress") ?? prev?.lessons.find((l) => l.state === "available");
  const remaining = prev ? prev.lessons.filter((l) => l.state !== "done").length : 0;
  // Test out: the previous unit's skill check, taken now instead of its remaining lessons.
  const test = index > 0 ? testOutCheck(view, index - 1) : null;
  const prevName = t("unit", { n: index });
  const text: LockedUnitText = {
    unit: t("unit", { n: index + 1 }), title: u.unit.title[locale], why: t("lockedWhy", { unit: prevName }), body: t("lockedBody"),
    check: { title: t("lockedCheck", { unit: prevName }), sub: t("lockedCheckSub"), met: checked, toGo: !checked && remaining > 0 ? t("lockedLeft", { count: remaining }) : null, metLabel: t("met") },
    sub: { title: t("lockedSub"), sub: t("lockedSubSub") },
    go: resume ? { href: `/app/lesson/${resume.lesson.lessonId}`, label: t("lockedGoUnit", { unit: prevName }) } : null,
    test: test ? { href: `/app/lesson/${test.lesson.lessonId}`, label: t("lockedTest", { unit: prevName }) } : null,
    close: t("lockedClose"),
  };
  return <LockedUnitSheet id={u.unit.id} text={text} />;
}

export async function PathMapMain({ view, me }: { view: PathView; me: Learner }) {
  const progress: Progress = me.progress;
  const pro = me.pro;
  const t = await getTranslations("map");
  const tb = await getTranslations("billing");
  // A free learner sees the Pro units as locked cards that open the paywall; the first one says why.
  const firstLocked = pro ? null : view.units.find((u) => !u.unit.free)?.unit.id;
  const locale = (await getLocale()) as Locale;
  const pct = view.totalCount ? Math.round((view.doneCount / view.totalCount) * 100) : 0;
  const chips = me.joined.map((j) => {
    const v = buildPathView(j.pathId, progress, me.practicedSkills);
    const p = v && v.totalCount ? Math.round((v.doneCount / v.totalCount) * 100) : 0;
    const cur = v?.units.find((u) => u.lessons.some((l) => l.state !== "done")) ?? v?.units[v.units.length - 1];
    return { id: j.pathId, name: catalogEntry(j.pathId)?.name ?? j.pathId, art: pathArt(j.pathId), pct: p, current: j.pathId === view.path.id, where: `${t("unit", { n: cur?.number ?? 1 })} · ${p}%` };
  });
  const sub = t("sub", { sub: view.path.subtitle[locale], units: view.unitCount });

  return (
    <>
      <header className="map-head only-mobile" style={{ margin: "-12px -20px 0" }}>
        <Link href="/app" className="icon-btn plain" aria-label={t("back")}><span className="ph ph-arrow back" aria-hidden="true" /></Link>
        <div style={{ flex: 1, minInlineSize: 0 }}>
          <PathSwitcher chips={chips} currentId={view.path.id} sub={sub} />
        </div>
        <span className="stat"><span className="ph ph-bolt-fill" style={{ color: "var(--hl-ledge)" }} aria-hidden="true" /><span className="num ltr">{progress.xpTotal} XP</span></span>
      </header>

      <div className="only-desk" style={{ alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minInlineSize: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <PathSwitcher chips={chips} currentId={view.path.id} />
          <p className="t-body ink-2">{view.path.subtitle[locale]}</p>
        </div>
      </div>

      <PathGo view={view} me={me} pct={pct} locale={locale} />

      {view.units.map((u) => !pro && !u.unit.free ? (
        <Link key={u.unit.id} href={`/app/path/${view.path.id}?paywall=${u.unit.id}`} scroll={false} className={`unit-lock press${u.unit.id === firstLocked ? " is-next" : ""}`} style={{ flexWrap: "wrap" }}>
          <span className="ic"><span className="ph ph-lock-fill" aria-hidden="true" /></span>
          <span className="grow">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="t-small ink-3" style={{ fontWeight: 700, fontSize: 12 }}>{t("unit", { n: u.number })}{u.unit.id === firstLocked ? ` · ${tb("next")}` : ""}</span><span className="pro-tag">PRO</span></span>
            <b>{u.unit.title[locale]}</b>
            {u.unit.id === firstLocked ? <span className="t-small ink-2" style={{ fontSize: 13 }}>{tb("unitNote")}</span> : null}
          </span>
          <span className="ph ph-caret-end flip ink-3" aria-hidden="true" />
        </Link>
      ) : u.lessons.length > 0 && u.lessons.every((l) => l.state === "locked") ? (
        <LockedUnit key={u.unit.id} view={view} index={view.units.indexOf(u)} me={me} t={t} locale={locale} />
      ) : (
        <div key={u.unit.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="unit-h">
            <div className="tags">
              <span className="t-over">{t("unit", { n: u.number })}</span>
              {u.unit.free ? <span className="tag tag-free" style={{ blockSize: 22, fontSize: 12 }}>{t("free")}</span> : null}
              {u.practiced ? <span className="skill skill-practiced" style={{ blockSize: 22, fontSize: 12, padding: "0 9px" }}><span className="ph ph-check-circle" style={{ fontSize: 13 }} aria-hidden="true" />{t("practiced")}</span> : null}
            </div>
            <h2 className="t-h2" style={{ fontSize: 22 }}>{u.unit.title[locale]}</h2>
          </div>
          <ol className="lessons" style={{ ["--cols" as string]: u.lessons.length, ["--done" as string]: `${u.lessons.length > 1 ? (Math.min(u.lessons.filter((x) => x.state === "done").length, u.lessons.length - 1) / (u.lessons.length - 1)) * 100 : 0}%` }}>
            {u.lessons.map((l) => <Row key={l.lesson.lessonId} l={l} t={t} locale={locale} />)}
          </ol>
        </div>
      ))}
    </>
  );
}

/** The free learner's plan card on a laptop: what stays free and what Pro opens. */
export async function FreePlanCard() {
  const t = await getTranslations("billing");
  return (
    <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><p className="t-over">{t("yourPlan")}</p><span className="st st-wait">{t("freePlan")}</span></div>
      <FreeProList single />
      <Link href="/app/plans" className="btn btn-secondary btn-block press">{t("seePlans")}</Link>
    </section>
  );
}

/**
 * The laptop side panel (canvas v67, S3-13): path progress and the path's skills by state. The map's top card holds the
 * one main action, so the panel adds no second Start button. A free learner also sees the plan card.
 */
export async function PathMapPanel({ view, me }: { view: PathView; me: Learner }) {
  const t = await getTranslations("map");
  const pct = view.totalCount ? Math.round((view.doneCount / view.totalCount) * 100) : 0;
  const skills = pathSkills(view.path.id);
  const stateOf = (id: string) => me.skillStates.get(id)?.state;
  const shown = skills.filter((s) => { const st = stateOf(s.id); return st === "shown" || st === "kept"; }).length;
  const kept = skills.filter((s) => stateOf(s.id) === "kept").length;
  const practiced = skills.filter((s) => me.practicedSkills.has(s.id)).length;
  return (
    <>
      <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <p className="t-over">{t("pathProgress")}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><b className="num" style={{ fontSize: 30 }}>{pct}%</b><span className="t-small ink-2">{t("progText", { done: view.doneCount, total: view.totalCount })}</span></div>
        <div className="progress progress-sm" role="progressbar" aria-label={t("pathProgress")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ inlineSize: `${pct}%` }} /></div>
        <p className="t-over" style={{ marginBlockStart: 6 }}>{t("skillsTitle")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span className="skill skill-practiced"><span className="ph ph-check-circle" aria-hidden="true" /><span className="num">{practiced}</span> · {t("practiced")}</span>
          <span className="skill skill-shown"><span className="ph ph-seal-fill" aria-hidden="true" /><span className="num">{shown}</span> · {t("shown")}</span>
          <span className="skill skill-kept"><span className="ph ph-star-fill" aria-hidden="true" /><span className="num">{kept}</span> · {t("kept")}</span>
        </div>
        <p className="pg-note" style={{ fontSize: 13 }}><span className="ph ph-info" aria-hidden="true" /><span>{t("statesNote")}</span></p>
      </section>
      {me.pro ? null : <FreePlanCard />}
    </>
  );
}

