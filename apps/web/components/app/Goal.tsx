import { getTranslations, getLocale } from "next-intl/server";
import { lastDays } from "@/lib/progress";

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

export async function Week({ today, activeDays, small = false }: { today: string; activeDays: string[]; small?: boolean }) {
  const locale = await getLocale();
  const active = new Set(activeDays);
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  return (
    <div className="week" aria-hidden="true">
      {lastDays(today).map((d) => {
        const state = d === today ? "today" : active.has(d) ? "done" : "next";
        return (
          <div key={d}>
            <span className={`dot ${state}`} style={small ? { inlineSize: 28, blockSize: 28 } : undefined}>
              <span className={`ph ph-${state === "today" ? "flame-fill" : "check"}`} style={{ fontSize: small ? 14 : 15 }} />
            </span>
            <span className="dlabel" style={{ color: state === "next" ? "var(--ink-3)" : state === "today" ? "var(--ink)" : undefined }}>{fmt.format(new Date(`${d}T00:00:00Z`))}</span>
          </div>
        );
      })}
    </div>
  );
}
