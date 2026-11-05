/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import { catalogEntry, pathArtUrl } from "@/lib/catalog";
import { pathProgressCounts, pathSkills, isShown } from "@/lib/certificate";
import { buildPathView } from "@/lib/learning";
import type { Learner } from "@/lib/server/learner";
import type { Certificate } from "@/lib/server/certificates";

/** Totals across paths, a card per joined path, certificates, and links to badges and the leaderboard. Settings follow below. */
export async function ProfileMain({ me, certificates, boardOpen, since = null }: { me: Learner; certificates: Certificate[]; boardOpen: boolean; since?: string | null }) {
  const t = await getTranslations("profile");
  const locale = (await getLocale()) as Locale;
  const states = [...me.skillStates.values()];
  const shown = states.filter((s) => s.state === "shown" || s.state === "kept").length;
  const kept = states.filter((s) => s.state === "kept").length;
  const ids = me.joined.length ? me.joined.map((j) => j.pathId) : [me.activePathId];
  const stateOf = (id: string) => me.skillStates.get(id)?.state;
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const name = me.progress.displayName?.trim() || "";
  const month = since ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(since)) : null;
  const sub = [me.handle ? `@${me.handle}` : null, month ? (me.handle ? t("since", { month }) : t("sinceAlone", { month })) : null].filter(Boolean).join(" · ");
  // Each joined path: where the learner is, how far, and how many skills sit in each state (design v60, Profile).
  const cards = ids.map((id) => {
    const v = buildPathView(id, me.progress, me.practicedSkills);
    const pct = v && v.totalCount ? Math.round((v.doneCount / v.totalCount) * 100) : 0;
    const unit = v?.units.find((u) => u.lessons.some((l) => l.state !== "done")) ?? v?.units[v.units.length - 1];
    const skills = pathSkills(id);
    const kept = skills.filter((k) => stateOf(k.id) === "kept").length;
    const shown = skills.filter((k) => isShown(stateOf(k.id))).length - kept;
    const practiced = skills.filter((k) => !isShown(stateOf(k.id)) && (stateOf(k.id) === "practiced" || me.practicedSkills.has(k.id))).length;
    return { id, name: catalogEntry(id)?.name ?? id, pct, n: unit?.number ?? 1, total: v?.unitCount ?? 1, kept, shown, practiced, current: id === me.activePathId };
  });
  return (
    <div className="ph-page">
      <div className="me">
        <span className="avatar" aria-hidden="true">{(name || "?").slice(0, 1).toUpperCase()}</span>
        <div className="grow"><b><bdi>{name}</bdi></b>{sub ? <span><bdi>{sub}</bdi></span> : null}</div>
      </div>
      <p className="t-over">{t("totals")}</p>
      <div className="stat-grid">
        <Link href="/app/streak" className="card stat-tile press" aria-label={`${t("xp")}: ${me.progress.xpTotal}. ${t("see")}`}><span className="big num ltr">{me.progress.xpTotal}</span><span className="t-small ink-2">{t("xp")}</span></Link>
        <Link href="/app/streak" className="card stat-tile press" aria-label={`${t("streak")}: ${t("days", { count: me.progress.streak })}. ${t("see")}`}><span className="big num">{me.progress.streak}</span><span className="t-small ink-2">{t("streak")}</span></Link>
        <Link href="/app/skills" className="card stat-tile press" aria-label={`${t("shown")}: ${shown}. ${t("see")}`}><span className="big num">{shown}</span><span className="t-small ink-2">{t("shown")}</span></Link>
        <Link href="/app/skills" className="card stat-tile press" aria-label={`${t("kept")}: ${kept}. ${t("see")}`}><span className="big num">{kept}</span><span className="t-small ink-2">{t("kept")}</span></Link>
      </div>

      <div className="pg-sec"><p className="t-over">{t("pathsN", { count: cards.length })}</p><Link href="/app/paths" className="pg-link">{t("allPaths")}</Link></div>
      <div className="pg-cards">
        {cards.map((c) => (
          <Link key={c.id} href={`/app/path/${c.id}`} className={`pp press${c.current ? " is-current" : ""}`} style={{ textDecoration: "none", color: "var(--ink)" }} aria-label={t("pathAria", { name: c.name, n: c.n, total: c.total, pct: c.pct, kept: c.kept, shown: c.shown, practiced: c.practiced })}>
            <span className="pp-top"><img src={pathArtUrl(c.id)} alt="" /><span className="grow"><b><bdi>{c.name}</bdi></b><small>{t("where", { n: c.n, total: c.total, pct: c.pct })}</small></span>{c.current ? <span className="kind kind-current">{t("current")}</span> : null}</span>
            <span className="progress progress-sm" aria-hidden="true"><i style={{ inlineSize: `${c.pct}%` }} /></span>
            {c.kept + c.shown + c.practiced > 0 ? (
              <span className="pp-chips" aria-hidden="true">
                {c.kept ? <span className="skill skill-kept"><span className="ph ph-star-fill" />{t("chipKept", { n: c.kept })}</span> : null}
                {c.shown ? <span className="skill skill-shown"><span className="ph ph-seal-fill" />{t("chipShown", { n: c.shown })}</span> : null}
                {c.practiced ? <span className="skill skill-practiced"><span className="ph ph-check-circle" />{t("chipPracticed", { n: c.practiced })}</span> : null}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      <p className="t-over">{t("certificates")}</p>
      {ids.map((id) => {
        const cert = certificates.find((c) => c.pathId === id);
        const c = pathProgressCounts(id, stateOf);
        return (
          <Link key={id} href={cert ? `/app/certificate/${id}` : `/app/skills`} className="card row-card press">
            
            <img src="/ill/uxgate-ill-certificate.png" alt="" style={{ inlineSize: 44, blockSize: 44, flex: "none", opacity: cert ? 1 : 0.4 }} />
            <span className="grow"><b><bdi>{catalogEntry(id)?.name ?? id}</bdi></b><span className="t-small ink-2">{cert ? `${t("certReady")} · ${fmt.format(new Date(cert.issuedAt))}` : t("certProgress", { shown: c.shown, total: c.total })}</span></span>
            <span className="ph ph-arrow flip" aria-hidden="true" />
          </Link>
        );
      })}
      {certificates.length === 0 ? <p className="t-small ink-2">{t("certNone")}</p> : null}

      <Link href="/app/badges" className="card row-card press"><span className="ph ph-medal" style={{ fontSize: 26 }} aria-hidden="true" /><span className="grow"><b>{t("badges")}</b><span className="t-small ink-2">{t("badgesBody")}</span></span><span className="ph ph-arrow flip" aria-hidden="true" /></Link>
      {boardOpen ? <Link href="/app/board" className="card row-card press"><span className="ph ph-ranking" style={{ fontSize: 26 }} aria-hidden="true" /><span className="grow"><b>{t("board")}</b><span className="t-small ink-2">{t("boardBody")}</span></span><span className="ph ph-arrow flip" aria-hidden="true" /></Link> : null}
    </div>
  );
}
