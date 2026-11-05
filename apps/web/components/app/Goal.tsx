import { getTranslations, getLocale } from "next-intl/server";
import { weekOf } from "@/lib/progress";
import { weekStartFor } from "@/lib/freeze";

export async function GoalRing({ done, goal, size = 52 }: { done: number; goal: number; size?: number }) {
  const t = await getTranslations("home");
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, goal > 0 ? done / goal : 0);
  return (
    <div className="goal-ring" style={{ inlineSize: size, blockSize: size }} role="img" aria-label={t("goalRing", { done, goal })}>
      <svg viewBox="0 0 58 58" width={size} height={size} aria-hidden="true">
        <circle cx="29" cy="29" r={r} fill="none" stroke="var(--track)" strokeWidth="8" />
        <circle cx="29" cy="29" r={r} fill="none" stroke="var(--hl)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 29 29)" />
      </svg>
      <span className="num" style={{ fontSize: size > 60 ? 18 : 14 }}>{Math.min(done, goal)}/{goal}</span>
    </div>
  );
}

/**
 * The week strip: seven days from the learner's week start (Monday in English, Saturday in Arabic), short day names,
 * "Today" on the current day, and a spoken name per day that includes its state ("Tuesday, freeze used").
 */
/** `goalDays`: days the daily goal was met. A day with a lesson but short of the goal is "practised" (#140). */
export async function Week({ today, activeDays, goalDays, frozenDays = [], start, small = false }: { today: string; activeDays: string[]; goalDays?: string[]; frozenDays?: string[]; start?: number; small?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations("week");
  const active = new Set(activeDays);
  const goal = new Set(goalDays ?? activeDays);
  const frozen = new Set(frozenDays);
  const long = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  return (
    <div className="week" role="list" aria-label={t("label")}>
      {weekOf(today, start ?? weekStartFor(locale)).map((d) => {
        const date = new Date(`${d}T00:00:00Z`);
        const isToday = d === today;
        const state = isToday ? "today" : frozen.has(d) ? "frozen" : goal.has(d) ? "done" : active.has(d) ? "part" : "next";
        const day = long.format(date);
        const spoken = isToday ? t("spokenToday", { day }) : state === "frozen" ? t("spokenFrozen", { day }) : state === "done" ? t("spokenDone", { day }) : state === "part" ? t("spokenPart", { day }) : d > today ? t("spokenLater", { day }) : t("spokenNone", { day });
        const icon = state === "today" ? "flame-fill" : state === "frozen" ? "freeze-fill" : "check";
        return (
          <div key={d} role="listitem" aria-label={spoken}>
            <span className={`dot ${state}`} aria-hidden="true" style={small ? { inlineSize: 28, blockSize: 28 } : undefined}>
              <span className={`ph ph-${icon}`} style={{ fontSize: small ? 14 : 15 }} />
            </span>
            <span className="dlabel" aria-hidden="true" style={{ color: state === "next" ? "var(--ink-2)" : state === "today" ? "var(--ink)" : undefined }}>{isToday ? t("today") : t(`short.${date.getUTCDay()}` as never)}</span>
          </div>
        );
      })}
    </div>
  );
}
