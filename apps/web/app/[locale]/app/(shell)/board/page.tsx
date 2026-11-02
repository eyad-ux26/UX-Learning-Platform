import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Shell } from "@/components/app/Shell";
import { Link } from "@/i18n/navigation";
import { BoardJoin, BoardLeave } from "@/components/app/BoardActions";
import { requireLearner } from "@/lib/server/learner";
import { weekStart } from "@/lib/week";

export const dynamic = "force-dynamic";

type Row = { rank: number | string; name: string; xp: number | string; is_me: boolean };

export default async function BoardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireLearner(locale);
  const t = await getTranslations("board");
  if (!me.db) notFound();
  const { data: flag } = await me.db.from("app_flags").select("enabled").eq("key", "leaderboard").maybeSingle();
  if (!flag?.enabled) notFound(); // behind an admin flag: closed means there is no page
  let rows: Row[] = [];
  if (me.leaderboardJoined) {
    const { data } = await me.db.rpc("weekly_leaderboard", { p_since: weekStart(new Date(), me.timeZone).toISOString(), p_limit: 50 });
    rows = (data as Row[] | null) ?? [];
  }
  return (
    <Shell me={me}>
      <div className="ph-page">
        <Link href="/app/profile" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}><span className="ph ph-arrow back" aria-hidden="true" />{t("back")}</Link>
        <h1 className="t-h1 h1-s">{t("title")}</h1>
        {me.leaderboardJoined ? (
          <>
            <p className="t-small ink-2">{t("lead")}</p>
            {rows.length ? (
              <ol className="board-list">
                {rows.map((r, i) => (
                  <li key={i} className={`card${r.is_me ? " is-me" : ""}`}>
                    <span className="rank num">{Number(r.rank)}</span>
                    <span className="ph ph-cursor" aria-hidden="true" />
                    <span className="nm"><bdi>{r.name}</bdi>{r.is_me ? <> · {t("you")}</> : null}</span>
                    <span className="num ltr">{Number(r.xp)} XP</span>
                  </li>
                ))}
              </ol>
            ) : <p className="t-small ink-2">{t("empty")}</p>}
            <BoardLeave />
          </>
        ) : <BoardJoin defaultName={me.progress.displayName ?? ""} />}
      </div>
    </Shell>
  );
}
