import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bundle, type Locale } from "@uxgate/content";
import { FREEZE_MAX, weekGoalProgress } from "@/lib/freeze";
import { badgeOf } from "@/lib/skill-state";
import { catalogEntry } from "@/lib/catalog";
import { startOfDay } from "@/lib/week";
import type { Learner } from "@/lib/server/learner";
import { Week } from "./Goal";

/** The streak, the freezes held, the next freeze, and why each number changed today. */
export async function StreakMain({ me }: { me: Learner }) {
  const t = await getTranslations("streak");
  const { progress } = me;
  const week = weekGoalProgress(progress.today, progress.recentActivity);
  const full = me.freezes >= FREEZE_MAX;

  // Today's XP events, as the learner can read them (row-level security), grouped by how the step was answered.
  const xp = { own: 0, hint: 0, reveal: 0, total: 0 };
  const events = { earned: 0, used: 0 };
  let rank: { rank: number; xp: number } | null = null;
  if (me.db) {
    const since = startOfDay(progress.today, me.timeZone || "UTC").toISOString();
    const [x, f] = await Promise.all([
      me.db.from("xp_events").select("outcome, amount").eq("user_id", me.userId).gte("created_at", since),
      me.db.from("freeze_events").select("kind").eq("user_id", me.userId),
    ]);
    for (const e of x.data ?? []) {
      xp.total += e.amount as number;
      if (e.outcome === "independent") xp.own++; else if (e.outcome === "supported") xp.hint++; else xp.reveal++;
    }
    for (const e of f.data ?? []) events[e.kind === "earned" ? "earned" : "used"]++;
    if (me.leaderboardJoined) {
      const { weekStart } = await import("@/lib/week");
      const { data } = await me.db.rpc("weekly_leaderboard", { p_since: weekStart(new Date(), me.timeZone).toISOString(), p_limit: 100 });
      const mine = (data as { rank: number; xp: number; is_me: boolean }[] | null)?.find((r) => r.is_me);
      if (mine) rank = { rank: Number(mine.rank), xp: Number(mine.xp) };
    }
  }
  const counts = { practiced: 0, shown: 0, kept: 0 };
  for (const r of me.skillStates.values()) counts[r.state]++;

  return (
    <div className="ph-page">
      <Link href="/app" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}><span className="ph ph-arrow back" aria-hidden="true" />{t("back")}</Link>
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="streak-row"><span className="ph ph-flame-fill" style={{ fontSize: 28, color: "#F59E2B" }} aria-hidden="true" /><p className="t-h2">{t("days", { count: progress.streak })}</p></div>
        <p className="t-small ink-2">{t("longest", { count: Math.max(me.longestStreak, progress.streak) })}</p>
        <p className="t-over">{t("thisWeek")}</p>
        <Week today={progress.today} activeDays={[...progress.activeDays, ...progress.frozenDays]} />
      </section>

      <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="t-label">{t("freezesTitle")}</p>
        <div className="slots" role="img" aria-label={t("freezesHold", { count: me.freezes })}>
          {Array.from({ length: FREEZE_MAX }, (_, i) => <span key={i} className={`slot${i < me.freezes ? " is-full" : ""}`}><span className={`ph ph-freeze${i < me.freezes ? "-fill" : ""}`} aria-hidden="true" /></span>)}
        </div>
        <p className="t-small ink-2">{t("freezesHold", { count: me.freezes })} · {t("freezeHistory", events)}</p>
        {full ? (
          <div role="status"><p className="t-label">{t("fullTitle")}</p><p className="t-small ink-2">{t("fullBody")}</p></div>
        ) : (
          <div>
            <p className="t-label">{t("nextFreeze")}</p>
            <div className="progress progress-sm" role="progressbar" aria-label={t("nextFreeze")} aria-valuenow={week.goalDays} aria-valuemin={0} aria-valuemax={week.needed}><i style={{ inlineSize: `${Math.min(100, (week.goalDays / week.needed) * 100)}%` }} /></div>
            <p className="t-small ink-2">{t("nextFreezeBody", { more: week.more, done: week.goalDays })}</p>
          </div>
        )}
        <details>
          <summary className="t-label" style={{ cursor: "pointer", minBlockSize: 44, display: "flex", alignItems: "center" }}>{t("howTitle")}</summary>
          <ul style={{ paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 6 }}>{(["how1", "how2", "how3", "how4"] as const).map((k) => <li key={k} className="t-small">{t(k)}</li>)}</ul>
        </details>
      </section>

      <h2 className="t-h2">{t("numbersTitle")}</h2>
      <p className="t-small ink-2">{t("numbersLead")}</p>
      <ul className="why-list">
        <li className="card"><span className="ph ph-bolt-fill" style={{ fontSize: 22, color: "var(--hl-ledge)" }} aria-hidden="true" /><div className="grow">
          <p className="t-label">{t("xpTitle")}: <span className="num ltr">{t("xpTotal", { count: xp.total })}</span></p>
          {xp.total === 0 && xp.reveal === 0 ? <p className="t-small ink-2">{t("xpNone")}</p> : <>
            {xp.own ? <p className="t-small ink-2">{t("xpOwn", { count: xp.own })}</p> : null}
            {xp.hint ? <p className="t-small ink-2">{t("xpHint", { count: xp.hint })}</p> : null}
            {xp.reveal ? <p className="t-small ink-2">{t("xpReveal", { count: xp.reveal })}</p> : null}
          </>}
        </div></li>
        <li className="card"><span className="ph ph-target" aria-hidden="true" style={{ fontSize: 22 }} /><div className="grow"><p className="t-label">{t("goalTitle")}</p><p className="t-small ink-2">{t("goalBody", { done: Math.min(progress.lessonsToday, progress.dailyGoal), goal: progress.dailyGoal })}</p></div></li>
        <li className="card"><span className="ph ph-flame-fill" aria-hidden="true" style={{ fontSize: 22, color: "#F59E2B" }} /><div className="grow"><p className="t-label">{t("streakTitle")}</p><p className="t-small ink-2">{t("streakBody", { count: progress.streak })}</p></div></li>
        <li className="card"><span className="ph ph-seal" aria-hidden="true" style={{ fontSize: 22 }} /><div className="grow"><p className="t-label">{t("skillsTitle")}</p><p className="t-small ink-2">{t("skillsBody", counts)}</p></div></li>
        <li className="card"><span className="ph ph-freeze" aria-hidden="true" style={{ fontSize: 22 }} /><div className="grow"><p className="t-label">{t("freezeTitle")}</p><p className="t-small ink-2">{full ? t("fullBody") : t("nextFreezeBody", { more: week.more, done: week.goalDays })}</p></div></li>
        {me.leaderboardJoined ? <li className="card"><span className="ph ph-ranking" aria-hidden="true" style={{ fontSize: 22 }} /><div className="grow"><p className="t-label">{t("rankTitle")}</p><p className="t-small ink-2">{rank ? t("rankBody", rank) : t("rankOff")}</p></div></li> : null}
      </ul>
    </div>
  );
}

/** Skills by unit in each joined path, with the badge each one has earned. */
export async function SkillsMain({ me }: { me: Learner }) {
  const t = await getTranslations("skills");
  const locale = (await getLocale()) as Locale;
  const ids = me.joined.length ? me.joined.map((j) => j.pathId) : [me.activePathId];
  return (
    <div className="ph-page">
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      <p className="t-small ink-2">{t("lead")}</p>
      <p className="t-small ink-2">{t("states")}</p>
      {ids.map((pid) => {
        const units = bundle.units.filter((u) => u.pathId === pid);
        const all = units.flatMap((u) => u.skills);
        const shown = all.filter((s) => { const st = me.skillStates.get(s.id)?.state; return st === "shown" || st === "kept"; }).length;
        return (
          <section key={pid} className="ph-page" aria-label={catalogEntry(pid)?.name}>
            <h2 className="t-h2"><bdi>{catalogEntry(pid)?.name ?? pid}</bdi></h2>
            <p className="t-small ink-2">{t("count", { n: shown, total: all.length })}</p>
            {units.map((u, i) => (
              <div key={u.id} className="ph-page">
                <p className="t-over">{t("unit", { n: i + 1 })} · {u.title[locale]}</p>
                <div className="badge-grid">
                  {u.skills.map((s) => {
                    const st = me.skillStates.get(s.id)?.state;
                    const b = badgeOf(st);
                    return (
                      <div key={s.id} className={`card badge is-${b ?? "none"}`}>
                        <span className="gem"><span className={`ph ph-${b === "gold" ? "medal-fill" : b === "blue" ? "seal-check-fill" : "lock"}`} aria-hidden="true" /></span>
                        <small className="t-label" style={{ fontSize: 12 }}>{s.title[locale]}</small>
                        <small className="t-small ink-2">{st ? t(st) : t("none")} · {b === "gold" ? t("badgeGold") : b === "blue" ? t("badgeBlue") : t("badgeNone")}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
