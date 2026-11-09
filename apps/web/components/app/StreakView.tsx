/* eslint-disable @next/next/no-img-element */
import { PathName } from "@/components/PathName";
import { getLocale, getTranslations } from "next-intl/server";
import { goalDaysOf } from "@/lib/progress";
import { Link } from "@/i18n/navigation";
import { content, type Locale } from "@uxgate/content";
import { weekGoalProgress } from "@/lib/freeze";
import { learningRules } from "@/lib/app-config";
import { badgeOf } from "@/lib/skill-state";
import { localPathName } from "@/lib/catalog";
import { startOfDay, weekdayName } from "@/lib/week";
import type { Learner } from "@/lib/server/learner";
import { Week } from "./Goal";

/** The streak, the freezes held, the next freeze, and why each number changed today. */
export async function StreakMain({ me }: { me: Learner }) {
  const t = await getTranslations("streak");
  const { progress } = me;
  const rules = await learningRules();
  const FREEZE_MAX = rules.freezeMax;
  const week = weekGoalProgress(progress.today, progress.recentActivity, me.weekStart, rules.freezeGoalDays);
  const full = me.freezes >= FREEZE_MAX;
  const locale0 = await getLocale();
  const dayName = (n: number) => weekdayName(locale0, n);
  const weekNames = { first: dayName(me.weekStart), last: dayName((me.weekStart + 6) % 7), day: dayName(me.weekStart) };

  // Today's XP events, as the learner can read them (row-level security), grouped by how the step was answered.
  const xp = { own: 0, hint: 0, reveal: 0, total: 0 };
  let rank: { rank: number; xp: number } | null = null;
  if (me.db) {
    const since = startOfDay(progress.today, me.timeZone || "UTC").toISOString();
    const x = await me.db.from("xp_events").select("outcome, amount").eq("user_id", me.userId).gte("created_at", since);
    for (const e of x.data ?? []) {
      xp.total += e.amount as number;
      if (e.outcome === "independent") xp.own++; else if (e.outcome === "supported") xp.hint++; else xp.reveal++;
    }
    if (me.leaderboardJoined) {
      const { weekStart } = await import("@/lib/week");
      const { data } = await me.db.rpc("weekly_leaderboard", { p_since: weekStart(new Date(), me.timeZone, me.weekStart).toISOString(), p_limit: 100 });
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
      <section className="card-panel" style={{ padding: "16px 18px", borderRadius: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <img src="/ill/uxgate-ill-flame.png" alt="" style={{ inlineSize: 72, blockSize: 72, flex: "none" }} />
        <div style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0, fontSize: 34, lineHeight: 1.1, fontWeight: 700, color: "var(--panel-ink)" }}>{t("daysBig", { count: progress.streak })}</p>
          <span className="t-small" style={{ color: "var(--ink-2)", lineHeight: 1.45 }}>{t("lead", { count: progress.dailyGoal })}</span>
          <span className="t-small" style={{ color: "var(--ink-2)", fontWeight: 700 }}>{t("longest", { count: Math.max(me.longestStreak, progress.streak) })}</span>
        </div>
      </section>
      <section className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="between" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}><p className="t-over">{t("thisWeek")}</p><span className="t-small ink-2" style={{ fontWeight: 700 }}>{t("goalDaysSoFar", { count: week.goalDays })}</span></div>
        <Week today={progress.today} activeDays={progress.activeDays} goalDays={goalDaysOf(progress)} frozenDays={progress.frozenDays} start={me.weekStart} />
        <div className="wk-key" aria-hidden="true">
          <span><i style={{ background: "var(--hl)" }} />{t("keyGoal")}</span>
          <span><i style={{ background: "var(--panel)" }} />{t("keyPart")}</span>
          <span><i style={{ background: "var(--sel-bg)", boxShadow: "inset 0 0 0 2px var(--sel-line)" }} />{t("keyFreeze")}</span>
        </div>
      </section>

      <section className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }} aria-label={t("freezesTitle")}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="fz" aria-hidden="true">
            {Array.from({ length: FREEZE_MAX }, (_, i) => <span key={i} className={`fz-slot${i < me.freezes ? "" : " is-empty"}`}><span className={`ph ph-freeze${i < me.freezes ? "-fill" : ""}`} /></span>)}
          </div>
          <div style={{ flex: 1, minInlineSize: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 16 }}>{t("held", { count: me.freezes })}</b><span className="t-small ink-2">{t("heldBody")}</span></div>
        </div>
        {full ? (
          <div role="status" style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px", borderRadius: 14, background: "var(--sel-bg)", boxShadow: "inset 0 0 0 1px var(--sel-line)" }}>
            <b className="t-small" style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><span className="ph ph-check-circle" aria-hidden="true" style={{ color: "var(--link)" }} />{t("fullTitle")}</b>
            <span className="t-small ink-2" style={{ lineHeight: 1.45 }}>{t("fullBody")}</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span className="t-small" style={{ fontWeight: 700 }}>{t("nextFreeze")}</span><span className="t-small num ink-2" style={{ fontWeight: 700 }}>{t("stepsOf", { n: Math.min(week.goalDays, week.needed), total: week.needed })}</span></div>
            <div className="fz-steps" role="progressbar" aria-label={t("nextFreeze")} aria-valuenow={Math.min(week.goalDays, week.needed)} aria-valuemin={0} aria-valuemax={week.needed} aria-valuetext={t("stepsOf", { n: Math.min(week.goalDays, week.needed), total: week.needed })}>
              {Array.from({ length: week.needed }, (_, i) => <i key={i} className={i < week.goalDays ? "on" : undefined} />)}
            </div>
          </div>
        )}
      </section>

      <section className="card" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="t-over">{t("howTitle")}</h2>
        {([["how1", "check-circle"], ["how3", "freeze"], ["how2", "stack"], ["how4", "info"]] as const).map(([k, icon]) => <p key={k} className="pg-note" style={{ fontSize: 14 }}><span className={`ph ph-${icon}`} aria-hidden="true" /><span>{t(k, weekNames)}</span></p>)}
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

/** Skill states in each joined path, unit by unit, with totals on top (design v60, Skills). */
export async function SkillsMain({ me }: { me: Learner }) {
  const t = await getTranslations("skills");
  const locale = (await getLocale()) as Locale;
  const ids = me.joined.length ? me.joined.map((j) => j.pathId) : [me.activePathId];
  type St = "kept" | "shown" | "practiced" | "none";
  const stOf = (id: string): St => { const s = me.skillStates.get(id)?.state; return s === "kept" || s === "shown" ? s : s === "practiced" || me.practicedSkills.has(id) ? "practiced" : "none"; };
  const chip: Record<St, { cls: string; icon: string | null }> = {
    kept: { cls: "skill skill-kept", icon: "star-fill" }, shown: { cls: "skill skill-shown", icon: "seal-fill" },
    practiced: { cls: "skill skill-practiced", icon: "check-circle" }, none: { cls: "skill skill-later", icon: null },
  };
  const Chip = ({ st, text }: { st: St; text: string }) => <span className={chip[st].cls}>{chip[st].icon ? <span className={`ph ph-${chip[st].icon}`} aria-hidden="true" /> : null}{text}</span>;
  return (
    <div className="ph-page">
      <h1 className="t-h1 h1-s">{t("title")}</h1>
      {ids.map((pid) => {
        const units = content.units.filter((u) => u.pathId === pid);
        const n = { kept: 0, shown: 0, practiced: 0, none: 0 };
        for (const s of units.flatMap((u) => u.skills)) n[stOf(s.id)]++;
        return (
          <section key={pid} className="ph-page" aria-label={localPathName(pid, locale)}>
            <div><p className="t-over"><PathName name={localPathName(pid, locale) ?? ""} /></p></div>
            <div className="sk-totals" role="group" aria-label={t("totalsAria", n)}>
              {(["kept", "shown", "practiced", "none"] as const).map((k) => n[k] ? <Chip key={k} st={k} text={`${n[k]} · ${t(k)}`} /> : null)}
            </div>
            {units.map((u, i) => {
              const sts = u.skills.map((s) => stOf(s.id));
              const meta = sts.length && sts.every((x) => x === "shown" || x === "kept") ? t("passed") : sts.some((x) => x !== "none") ? t("inProgress") : t("notStartedU");
              return (
                <section key={u.id} className="card" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div className="sk-head"><h2 className="t-over">{t("unitT", { n: i + 1, title: u.title[locale] })}</h2><span className="t-small ink-2" style={{ fontWeight: 700 }}>{meta}</span></div>
                  <ul className="sk-list" role="list">
                    {u.skills.map((s, j) => <li key={s.id} className="sk-row"><span className="grow">{s.title[locale]}</span><Chip st={sts[j]} text={t(sts[j])} /></li>)}
                  </ul>
                </section>
              );
            })}
          </section>
        );
      })}
      <section className="card sk-states" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="t-over">{t("statesTitle")}</h2>
        {(["practiced", "shown", "kept"] as const).map((k) => (
          <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ flex: "none" }}><Chip st={k} text={t(k)} /></span><span className="t-small ink-2" style={{ lineHeight: 1.45, paddingBlockStart: 3 }}>{t(`${k}Text`)}</span></div>
        ))}
      </section>
      <Link href="/app/badges" className="card row-card press"><span className="ph ph-medal" style={{ fontSize: 26 }} aria-hidden="true" /><span className="grow"><b>{t("seeBadges")}</b></span><span className="ph ph-arrow flip" aria-hidden="true" /></Link>
    </div>
  );
}

/** Badges: every skill of each joined path with the badge it has earned (blue at Shown, gold at Kept). */
export async function BadgesMain({ me }: { me: Learner }) {
  const t = await getTranslations("skills");
  const locale = (await getLocale()) as Locale;
  const ids = me.joined.length ? me.joined.map((j) => j.pathId) : [me.activePathId];
  return (
    <div className="ph-page">
      <Link href="/app/profile" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}><span className="ph ph-arrow back" aria-hidden="true" />{t("back")}</Link>
      <h1 className="t-h1 h1-s">{t("badgesTitle")}</h1>
      <p className="t-small ink-2">{t("badgesLeadAll")} {t("badgesLead")}</p>
      {ids.map((pid) => {
        const units = content.units.filter((u) => u.pathId === pid);
        const all = units.flatMap((u) => u.skills);
        const shown = all.filter((s) => { const st = me.skillStates.get(s.id)?.state; return st === "shown" || st === "kept"; }).length;
        return (
          <section key={pid} className="ph-page" aria-label={localPathName(pid, locale)}>
            <h2 className="t-h2"><PathName name={localPathName(pid, locale) ?? ""} /></h2>
            <p className="t-small ink-2">{t("count", { n: shown, total: all.length })}</p>
            {units.map((u, i) => (
              <div key={u.id} className="ph-page">
                <p className="t-over">{t("unit", { n: i + 1 })} · {u.title[locale]}</p>
                <div className="sbadge-grid">
                  {u.skills.map((s) => {
                    const st = me.skillStates.get(s.id)?.state;
                    const b = badgeOf(st);
                    return (
                      <div key={s.id} className={`card sbadge is-${b ?? "none"}`}>
                        <span className="sgem"><span className={`ph ph-${b === "gold" ? "medal-fill" : b === "blue" ? "seal-check-fill" : "lock"}`} aria-hidden="true" /></span>
                        <small className="t-label" style={{ fontSize: 12 }}>{s.title[locale]}</small>
                        <small className="status-chip">{st ? t(st) : t("none")} · {b === "gold" ? t("badgeGold") : b === "blue" ? t("badgeBlue") : t("badgeNone")}</small>
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
