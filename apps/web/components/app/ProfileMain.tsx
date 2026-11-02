/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@uxgate/content";
import { catalogEntry, pathArtUrl } from "@/lib/catalog";
import { pathProgressCounts } from "@/lib/certificate";
import type { Learner } from "@/lib/server/learner";
import type { Certificate } from "@/lib/server/certificates";

/** Totals across paths, a card per joined path, certificates, and links to badges and the leaderboard. Settings follow below. */
export async function ProfileMain({ me, certificates, boardOpen }: { me: Learner; certificates: Certificate[]; boardOpen: boolean }) {
  const t = await getTranslations("profile");
  const locale = (await getLocale()) as Locale;
  const states = [...me.skillStates.values()];
  const shown = states.filter((s) => s.state === "shown" || s.state === "kept").length;
  const kept = states.filter((s) => s.state === "kept").length;
  const ids = me.joined.length ? me.joined.map((j) => j.pathId) : [me.activePathId];
  const stateOf = (id: string) => me.skillStates.get(id)?.state;
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return (
    <div className="ph-page">
      <p className="t-over">{t("totals")}</p>
      <div className="stat-grid">
        <Link href="/app/streak" className="card stat-tile press" aria-label={`${t("xp")}: ${me.progress.xpTotal}. ${t("see")}`}><span className="big num ltr">{me.progress.xpTotal}</span><span className="t-small ink-2">{t("xp")}</span></Link>
        <Link href="/app/streak" className="card stat-tile press" aria-label={`${t("streak")}: ${t("days", { count: me.progress.streak })}. ${t("see")}`}><span className="big num">{me.progress.streak}</span><span className="t-small ink-2">{t("streak")}</span></Link>
        <Link href="/app/skills" className="card stat-tile press" aria-label={`${t("shown")}: ${shown}. ${t("see")}`}><span className="big num">{shown}</span><span className="t-small ink-2">{t("shown")}</span></Link>
        <Link href="/app/skills" className="card stat-tile press" aria-label={`${t("kept")}: ${kept}. ${t("see")}`}><span className="big num">{kept}</span><span className="t-small ink-2">{t("kept")}</span></Link>
      </div>

      <p className="t-over">{t("yourPaths")}</p>
      <div className="pg-cards">
        {ids.map((id) => {
          const c = pathProgressCounts(id, stateOf);
          return (
            <Link key={id} href={`/app/path/${id}`} className="path-card press">
              <span className="pc-ill"><img src={pathArtUrl(id)} alt="" /></span>
              <span className="pc-text"><span className="pc-name"><bdi>{catalogEntry(id)?.name ?? id}</bdi></span><span className="t-small ink-2">{t("skillsOf", { shown: c.shown, total: c.total, kept: c.kept })}</span></span>
              <span className="pc-end"><span className="ph ph-caret flip" aria-hidden="true" /></span>
            </Link>
          );
        })}
      </div>

      <p className="t-over">{t("certificates")}</p>
      {ids.map((id) => {
        const cert = certificates.find((c) => c.pathId === id);
        const c = pathProgressCounts(id, stateOf);
        return (
          <Link key={id} href={cert ? `/app/certificate/${id}` : `/app/skills`} className="card row-card press">
            
            <img src="/ill/uxgate-ill-certificate.png" alt="" style={{ inlineSize: 44, blockSize: 44, flex: "none", opacity: cert ? 1 : 0.4 }} />
            <span className="grow"><b><bdi>{catalogEntry(id)?.name ?? id}</bdi></b><span className="t-small ink-2">{cert ? `${t("certReady")} · ${fmt.format(new Date(cert.issuedAt))}` : t("certProgress", { shown: c.shown, total: c.total })}</span></span>
            <span className="ph ph-caret flip" aria-hidden="true" />
          </Link>
        );
      })}
      {certificates.length === 0 ? <p className="t-small ink-2">{t("certNone")}</p> : null}

      <Link href="/app/skills" className="card row-card press"><span className="ph ph-medal" style={{ fontSize: 26 }} aria-hidden="true" /><span className="grow"><b>{t("badges")}</b><span className="t-small ink-2">{t("badgesBody")}</span></span><span className="ph ph-caret flip" aria-hidden="true" /></Link>
      {boardOpen ? <Link href="/app/board" className="card row-card press"><span className="ph ph-ranking" style={{ fontSize: 26 }} aria-hidden="true" /><span className="grow"><b>{t("board")}</b><span className="t-small ink-2">{t("boardBody")}</span></span><span className="ph ph-caret flip" aria-hidden="true" /></Link> : null}
    </div>
  );
}
