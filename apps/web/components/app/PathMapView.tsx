/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import type { PathLesson, PathView } from "@/lib/learning";
import type { Progress } from "@/lib/progress";
import { pathArt } from "./HomeView";
import { PathSwitcher } from "./PathSwitcher";
import { LockedUnitSheet, type LockedUnitText } from "./LockedUnitSheet";
import { catalogEntry } from "@/lib/catalog";
import { buildPathView, testOutCheck } from "@/lib/learning";
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
  const current = view.units.find((u) => u.lessons.some((l) => l.state !== "done")) ?? view.units[view.units.length - 1];
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
        <div style={{ flex: "1 1 220px", maxInlineSize: 280, display: "flex", flexDirection: "column", gap: 8 }}>
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
        
        <img src={pathArt(view.path.id)} alt="" />
      </section>

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

export async function PathMapPanel({ view, pro = true }: { view: PathView; pro?: boolean }) {
  const t = await getTranslations("map");
  const locale = (await getLocale()) as Locale;
  const l = view.next;
  // The next lesson can be in a Pro unit: a free learner sees the plan card instead.
  if (!pro && (!l || !view.units.find((u) => u.lessons.includes(l))?.unit.free)) return <FreePlanCard />;
  if (!l) return null;
  const cont = l.state === "in_progress";
  return (
    <>
      <div className="dk-prop">
        <p className="t-over">{t("next")}</p>
        
        <img src={pathArt(view.path.id)} alt="" style={{ inlineSize: 120, blockSize: 120, alignSelf: "center" }} />
        <h2 className="t-h2">{l.lesson.body.title[locale]}</h2>
        <div className="meta-i t-small ink-2"><span className="ph ph-clock" aria-hidden="true" />{t("minutes", { count: l.lesson.minutes })}</div>
      </div>
      <Link href={`/app/lesson/${l.lesson.lessonId}`} className="btn btn-primary btn-lg btn-block press"><span className="ph ph-play" aria-hidden="true" />{cont ? t("continue") : t("start")}</Link>
      {pro ? null : <FreePlanCard />}
    </>
  );
}
