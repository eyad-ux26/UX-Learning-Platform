import "server-only";
// The dashboard (DSH-1 to DSH-5). Counts come from the 0047 functions in one round of parallel calls; money is turned
// into USD here at the fixed rates. "Today" compares with the same Cairo day last week, up to the same time; the longer
// windows compare with the window before them.
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_TZ, toUsd } from "../format";
import { allowed, type AdminCtx } from "../guard";
import { mrrUsd } from "./billing";

export const RANGES = { today: "Today", "7d": "7 days", "30d": "30 days", "90d": "90 days" } as const;
export type Range = keyof typeof RANGES;
const DAY = 86_400_000;

/** Midnight in Cairo for the given moment, as a UTC instant. */
export function cairoMidnight(at: Date): Date {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: ADMIN_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  const offset = asUtc - Math.floor(at.getTime() / 1000) * 1000; // Cairo minus UTC
  return new Date(Date.UTC(+p.year!, +p.month! - 1, +p.day!) - offset);
}

/** The window and the one it is compared with. */
export function windows(range: Range, now = new Date()) {
  const today = cairoMidnight(now);
  if (range === "today") return { from: today, to: now, prevFrom: new Date(today.getTime() - 7 * DAY), prevTo: new Date(now.getTime() - 7 * DAY), vs: "last week" };
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const from = new Date(today.getTime() - (days - 1) * DAY);
  return { from, to: now, prevFrom: new Date(from.getTime() - days * DAY), prevTo: from, vs: `the ${days} days before` };
}

type Counts = Record<"signups" | "active" | "subscribers" | "cancellations" | "certificates", number>;
const asCounts = (rows: { metric: string; n: number | string }[] | null): Counts => {
  const c: Counts = { signups: 0, active: 0, subscribers: 0, cancellations: 0, certificates: 0 };
  for (const r of rows ?? []) if (r.metric in c) c[r.metric as keyof Counts] = Number(r.n);
  return c;
};

export type MoneyRow = { day: string; provider: string; currency: string; paid_minor: number; payments: number; refunded_minor: number; refunds: number };
const usd = (minor: number, currency: string) => toUsd(Number(minor), currency)?.minor ?? 0;

/** Paid and refunded USD in [from, to), from the per-day rows. */
export function moneyIn(rows: MoneyRow[], from: Date, to: Date) {
  const f = from.toLocaleDateString("en-CA", { timeZone: ADMIN_TZ });
  const t = new Date(to.getTime() - 1).toLocaleDateString("en-CA", { timeZone: ADMIN_TZ });
  let paid = 0, refunded = 0, refunds = 0;
  for (const r of rows) if (r.day >= f && r.day <= t) { paid += usd(r.paid_minor, r.currency); refunded += usd(r.refunded_minor, r.currency); refunds += Number(r.refunds); }
  return { paid, refunded, refunds };
}

/** Daily revenue in USD per provider for the last `days` Cairo days, oldest first. */
export function dailyByProvider(rows: MoneyRow[], days: number, now = new Date()) {
  const keys: string[] = [];
  const today = cairoMidnight(now);
  for (let i = days - 1; i >= 0; i--) keys.push(new Date(today.getTime() - i * DAY + 12 * 3600_000).toLocaleDateString("en-CA", { timeZone: ADMIN_TZ }));
  const at = new Map(keys.map((k, i) => [k, i]));
  const series: Record<string, number[]> = {};
  for (const r of rows) {
    const i = at.get(r.day);
    if (i === undefined) continue;
    (series[r.provider] ??= Array(days).fill(0))[i] += usd(r.paid_minor, r.currency);
  }
  return { days: keys, series };
}

export async function dashboard(ctx: AdminCtx, range: Range) {
  const db = createAdminClient();
  const w = windows(range);
  const now = new Date().toISOString();
  const money = allowed(ctx, "revenue.view");
  const since90 = new Date(cairoMidnight(new Date()).getTime() - 180 * DAY);
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
  const OPEN = ["new", "open", "waiting_team"];
  const [cur, prev, weekActive, moneyRows, funnel, paths, pathsPrev, live, open, late, unassigned, mine, dueSoon, appeals, refundsWaiting, approvals, events, grace, failed, superGrants] = await Promise.all([
    db.rpc("admin_dash_counts", { p_from: w.from.toISOString(), p_to: w.to.toISOString() }).then((r) => asCounts(r.data)),
    db.rpc("admin_dash_counts", { p_from: w.prevFrom.toISOString(), p_to: w.prevTo.toISOString() }).then((r) => asCounts(r.data)),
    db.rpc("admin_dash_counts", { p_from: new Date(cairoMidnight(new Date()).getTime() - 6 * DAY).toISOString(), p_to: now }).then((r) => asCounts(r.data).active),
    db.rpc("admin_dash_money", { p_from: since90.toISOString() }).then((r) => (r.data ?? []) as MoneyRow[]),
    db.rpc("admin_funnel", { p_from: new Date(Date.now() - 30 * DAY).toISOString() }).then((r) => (r.data ?? []) as { step: string; n: number }[]),
    db.rpc("admin_path_activity", { p_from: new Date(Date.now() - 7 * DAY).toISOString(), p_to: now }).then((r) => (r.data ?? []) as { path_id: string; learners: number }[]),
    db.rpc("admin_path_activity", { p_from: new Date(Date.now() - 14 * DAY).toISOString(), p_to: new Date(Date.now() - 7 * DAY).toISOString() }).then((r) => (r.data ?? []) as { path_id: string; learners: number }[]),
    money ? db.from("subscriptions").select("region, provider, period, currency, renew_amount_minor").in("status", ["active", "grace"]).limit(20000).then((r) => r.data ?? []) : Promise.resolve([]),
    count(db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", OPEN)),
    db.from("support_tickets").select("id, subject, category, first_reply_due, assignee_id", { count: "exact" }).in("status", OPEN).is("first_replied_at", null).lt("first_reply_due", now).order("first_reply_due").limit(1),
    count(db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", OPEN).is("assignee_id", null)),
    count(db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", OPEN).eq("assignee_id", ctx.userId)),
    count(db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", OPEN).is("first_replied_at", null).gte("first_reply_due", now).lt("first_reply_due", new Date(Date.now() + 2 * 3600_000).toISOString())),
    db.from("review_requests").select("lesson_id, created_at", { count: "exact" }).eq("status", "open").order("created_at").limit(1),
    count(db.from("refund_requests").select("id", { count: "exact", head: true }).eq("status", "waiting")),
    count(db.from("admin_approvals").select("id", { count: "exact", head: true }).eq("status", "waiting").in("permission", [...ctx.perms]).neq("requested_by", ctx.userId)),
    count(db.from("billing_events").select("id", { count: "exact", head: true }).not("error", "is", null).is("processed_at", null)),
    count(db.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "grace")),
    count(db.from("checkout_sessions").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", cairoMidnight(new Date()).toISOString())),
    db.from("super_admin_grants").select("target, effective_at").eq("status", "pending").order("effective_at").limit(5).then((r) => r.data ?? []),
  ]);
  const m = moneyIn(moneyRows, w.from, w.to);
  const mp = moneyIn(moneyRows, w.prevFrom, w.prevTo);
  const byRegion = new Map<string, { paying: number; mrr: number }>();
  for (const s of live as (Parameters<typeof mrrUsd>[0] & { region: string })[]) {
    const g = byRegion.get(s.region) ?? { paying: 0, mrr: 0 };
    g.paying++; g.mrr += mrrUsd(s);
    byRegion.set(s.region, g);
  }
  const prevPath = new Map(pathsPrev.map((p) => [p.path_id, Number(p.learners)]));
  return {
    w, cur, prev, weekActive, money: m, moneyPrev: mp, moneyRows, funnel: funnel.map((f) => ({ step: f.step, n: Number(f.n) })),
    paths: paths.slice(0, 6).map((p) => ({ id: p.path_id, learners: Number(p.learners), before: prevPath.get(p.path_id) ?? 0 })),
    regions: byRegion,
    support: {
      open, late: late.count ?? 0, oldestLate: (late.data ?? [])[0] as { id: number; subject: string; category: string; first_reply_due: string; assignee_id: string | null } | undefined,
      unassigned, mine, dueSoon,
    },
    appeals: { waiting: appeals.count ?? 0, oldest: (appeals.data ?? [])[0] as { lesson_id: string; created_at: string } | undefined },
    refundsWaiting, approvals, events, grace, failed, superGrants: superGrants as { target: string; effective_at: string }[],
  };
}

/** Which version of the dashboard a member sees first (DSH-5). */
export function dashboardView(ctx: AdminCtx): "business" | "support" | "content" {
  if (allowed(ctx, "revenue.view") || allowed(ctx, "team.view")) return "business";
  if (allowed(ctx, "support.view")) return "support";
  return "content";
}
