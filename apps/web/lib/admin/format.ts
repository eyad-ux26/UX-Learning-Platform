// Dates and money in the admin panel (requirements: "Dates and money"). Pure.
// Times are shown in Cairo time (the team's time zone; reports default to it), with UTC on hover.
// Money shows its own currency; totals are converted to USD at a fixed rate with its date, until Platform settings
// (Phase 2) lets the Admins update it.

export const ADMIN_TZ = "Africa/Cairo";

/** Units of each currency per US dollar, and the day that rate was taken. */
export const USD_RATES: Record<string, { perUsd: number; date: string }> = {
  USD: { perUsd: 1, date: "2026-11-01" },
  EGP: { perUsd: 48.5, date: "2026-11-01" },
};

export function toUsd(minor: number, currency: string): { minor: number; rateDate: string } | null {
  const r = USD_RATES[currency.toUpperCase()];
  if (!r) return null;
  return { minor: Math.round(minor / r.perUsd), rateDate: r.date };
}

export function fmtMoney(minor: number, currency: string): string {
  const c = currency.toUpperCase();
  const v = minor / 100;
  if (c === "USD") return `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  if (c === "EGP") return `EGP ${v.toLocaleString("en", { maximumFractionDigits: 2 })}`;
  return `${c} ${v.toLocaleString("en", { maximumFractionDigits: 2 })}`;
}

const dtf = new Intl.DateTimeFormat("en-GB", { timeZone: ADMIN_TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dtfDay = new Intl.DateTimeFormat("en-GB", { timeZone: ADMIN_TZ, day: "numeric", month: "short", year: "numeric" });

export function fmtTime(at: string | Date, rel = false, now = Date.now()): string {
  const d = new Date(at);
  if (rel) {
    const s = Math.round((now - d.getTime()) / 1000);
    if (s >= 0 && s < 60) return "Just now";
    if (s >= 0 && s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s >= 0 && s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 0 && s > -86400 * 2) return `in ${Math.max(1, Math.round(-s / 3600))} h`;
  }
  return dtf.format(d);
}

export const fmtDay = (at: string | Date) => dtfDay.format(new Date(at));
export const fmtUtc = (at: string | Date) => `${new Date(at).toISOString().replace("T", " ").slice(0, 16)} UTC`;

/** "2 h 14 min" for a duration in seconds. */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
}

/** Price regions as the Admins named them (answer 1, 9 Nov 2026). */
export const REGION_LABEL: Record<string, string> = { eg: "Egypt", gulf: "Gulf", arab: "Other Arab countries", world: "Rest of the world" };
