import "server-only";
// Reads for the Money pages (BIL-1 to BIL-9). Every number comes from rows the verified webhooks wrote; comp access
// (source 'manual') is shown but never counted as revenue.
import { createAdminClient } from "@/lib/supabase/admin";
import { toUsd } from "../format";
import { PAYMENT_COLS, type PaymentRow } from "./refunds";

export type Person = { user_id: string; email: string; display_name: string | null; locale: string };

/** Email, name and language for a set of learners, in one call. */
export async function people(ids: (string | null | undefined)[]): Promise<Map<string, Person>> {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map();
  const { data } = await createAdminClient().rpc("admin_people", { p_ids: list });
  return new Map(((data ?? []) as Person[]).map((p) => [p.user_id, p]));
}

/** Learner ids whose email, name, payment or certificate matches (the Learners search), for filtering other lists. */
export async function learnerIds(q: string, limit = 50): Promise<string[]> {
  const { data } = await createAdminClient().rpc("admin_learners", { p_q: q, p_limit: limit });
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
}

export const PAGE = 50;

// ───────── subscriptions ─────────

export type SubRow = {
  id: string; user_id: string; provider: string; provider_sub_id: string | null; region: string; country: string; period: string; currency: string;
  renew_amount_minor: number; discount: string | null; status: string; current_period_start: string; current_period_end: string; grace_until: string | null;
  cancelled_at: string | null; ended_at: string | null; created_at: string;
};
const SUB_COLS = "id, user_id, provider, provider_sub_id, region, country, period, currency, renew_amount_minor, discount, status, current_period_start, current_period_end, grace_until, cancelled_at, ended_at, created_at";

export type SubTab = "all" | "paid" | "comp" | "past_due" | "cancelled" | "refunded";
export type CompRow = { user_id: string; valid_until: string; pro_since: string | null; updated_at: string };

export async function subscriptions(f: { tab: SubTab; q?: string; region?: string; provider?: string; page: number }) {
  const db = createAdminClient();
  const ids = f.q && !/^sub_/.test(f.q) ? await learnerIds(f.q) : null;
  if (f.tab === "comp") {
    let q = db.from("entitlements").select("user_id, valid_until, pro_since, updated_at", { count: "exact" }).eq("source", "manual").eq("plan", "pro").gt("valid_until", new Date().toISOString());
    if (ids) q = q.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const { data, count } = await q.order("valid_until").range((f.page - 1) * PAGE, f.page * PAGE - 1);
    return { comp: (data ?? []) as CompRow[], subs: [] as SubRow[], total: count ?? 0 };
  }
  let q = db.from("subscriptions").select(SUB_COLS, { count: "exact" });
  if (f.tab === "paid") q = q.eq("status", "active");
  if (f.tab === "past_due") q = q.eq("status", "grace");
  if (f.tab === "cancelled") q = q.in("status", ["cancelled", "ended"]);
  if (f.tab === "refunded") q = q.eq("status", "refunded");
  if (f.region) q = q.eq("region", f.region);
  if (f.provider) q = q.eq("provider", f.provider);
  if (f.q && /^sub_/.test(f.q)) q = q.eq("provider_sub_id", f.q);
  if (ids) q = q.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const { data, count } = await q.order("created_at", { ascending: false }).range((f.page - 1) * PAGE, f.page * PAGE - 1);
  return { subs: (data ?? []) as SubRow[], comp: [] as CompRow[], total: count ?? 0 };
}

export async function subCounts() {
  const db = createAdminClient();
  const c = async (status: string[] | null) => {
    let q = db.from("subscriptions").select("id", { count: "exact", head: true });
    if (status) q = q.in("status", status);
    return (await q).count ?? 0;
  };
  const [all, paid, pastDue, cancelled, refunded, comp] = await Promise.all([
    c(null), c(["active"]), c(["grace"]), c(["cancelled", "ended"]), c(["refunded"]),
    db.from("entitlements").select("user_id", { count: "exact", head: true }).eq("source", "manual").eq("plan", "pro").gt("valid_until", new Date().toISOString()).then((r) => r.count ?? 0),
  ]);
  return { all, paid, comp, past_due: pastDue, cancelled, refunded };
}

// ───────── payments ─────────

export async function payments(f: { q?: string; provider?: string; status?: string; kind?: string; days?: number; page: number }) {
  const db = createAdminClient();
  let q = db.from("payments").select(PAYMENT_COLS, { count: "exact" });
  if (f.q) {
    const v = f.q.trim();
    if (/^(txn_|UXG-)/i.test(v) || /^\d{5,}$/.test(v)) q = q.or(`provider_payment_id.eq.${v.replace(/[,()]/g, "")},receipt_no.eq.${v.toUpperCase().replace(/[,()]/g, "")}`);
    else {
      const ids = await learnerIds(v);
      q = q.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }
  }
  if (f.provider) q = q.eq("provider", f.provider);
  if (f.status === "processing") q = q.eq("status", "paid").not("refund_sent_at", "is", null);
  else if (f.status) q = q.eq("status", f.status);
  if (f.kind) q = q.eq("kind", f.kind);
  if (f.days) q = q.gte("paid_at", new Date(Date.now() - f.days * 86_400_000).toISOString());
  const { data, count } = await q.order("paid_at", { ascending: false }).range((f.page - 1) * PAGE, f.page * PAGE - 1);
  return { rows: (data ?? []) as PaymentRow[], total: count ?? 0 };
}

export async function payment(id: string) {
  const db = createAdminClient();
  const { data: p } = await db.from("payments").select(PAYMENT_COLS).eq("id", id).maybeSingle();
  if (!p) return null;
  const pay = p as PaymentRow;
  const [sub, req, ticket, events, acct] = await Promise.all([
    pay.subscription_id ? db.from("subscriptions").select(SUB_COLS).eq("id", pay.subscription_id).maybeSingle().then((r) => r.data as SubRow | null) : null,
    db.from("refund_requests").select("id, reason, status, created_at, answered_at").eq("payment_id", pay.id).maybeSingle().then((r) => r.data),
    db.from("support_tickets").select("id, status").eq("link_type", "payment").eq("link_id", pay.id).maybeSingle().then((r) => r.data),
    db.rpc("admin_events_for", { p_ref: pay.provider_payment_id }).then((r) => (r.data ?? []) as { id: string; provider: string; event_type: string; received_at: string; processed_at: string | null; error: string | null }[]),
    db.from("billing_accounts").select("country").eq("user_id", pay.user_id).maybeSingle().then((r) => r.data),
  ]);
  const [reqTicket, approval] = await Promise.all([
    req ? db.from("support_tickets").select("id, status").eq("link_type", "refund_request").eq("link_id", req.id).maybeSingle().then((r) => r.data) : null,
    waitingRefundApproval(pay.id, req?.status === "waiting" ? req.id : null),
  ]);
  return { pay, sub, req, ticket: ticket ?? reqTicket, events, country: acct?.country ?? null, approval };
}

/**
 * The refund approval still waiting for this payment, if any. It is filed against the learner's refund request when
 * there is one, otherwise against the payment; only one may wait at a time (0044 admin_approvals_one_open).
 */
export async function waitingRefundApproval(paymentId: string, requestId: string | null): Promise<string | null> {
  const targets = [paymentId, ...(requestId ? [requestId] : [])];
  const { data } = await createAdminClient().from("admin_approvals").select("id").eq("kind", "refund").eq("status", "waiting").in("target_id", targets).limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

// ───────── refunds ─────────

export type RefundTab = "decide" | "approval" | "processing" | "done";
export type RefundItem = { id: string; user_id: string; payment_id: string; amount_minor: number; currency: string; reason: string; status: string; created_at: string; answered_at: string | null; pay: PaymentRow | null; approval: { id: string; status: string } | null };

export async function refunds(tab: RefundTab) {
  const db = createAdminClient();
  let q = db.from("refund_requests").select("id, user_id, payment_id, amount_minor, currency, reason, status, created_at, answered_at");
  q = tab === "done" ? q.neq("status", "waiting").order("answered_at", { ascending: false }).limit(100) : q.eq("status", "waiting").order("created_at").limit(200);
  const { data } = await q;
  const reqs = (data ?? []) as Omit<RefundItem, "pay" | "approval">[];
  const payIds = reqs.map((r) => r.payment_id);
  const [pays, apps] = await Promise.all([
    payIds.length ? db.from("payments").select(PAYMENT_COLS).in("id", payIds).then((r) => (r.data ?? []) as PaymentRow[]) : [],
    reqs.length ? db.from("admin_approvals").select("id, status, target_id").eq("kind", "refund").in("target_id", reqs.map((r) => r.id)).in("status", ["waiting", "failed"]).then((r) => r.data ?? []) : [],
  ]);
  const payBy = new Map(pays.map((p) => [p.id, p]));
  const appBy = new Map(apps.map((a) => [a.target_id as string, { id: a.id as string, status: a.status as string }]));
  const items: RefundItem[] = reqs.map((r) => ({ ...r, pay: payBy.get(r.payment_id) ?? null, approval: appBy.get(r.id) ?? null }));
  if (tab === "done") return items;
  return items.filter((r) => {
    const processing = !!r.pay?.refund_sent_at;
    const waiting = r.approval?.status === "waiting";
    return tab === "processing" ? processing : tab === "approval" ? waiting && !processing : !processing && !waiting;
  });
}

// ───────── problems ─────────

export async function problems() {
  const db = createAdminClient();
  const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [events, grace, failed, refused] = await Promise.all([
    db.from("billing_events").select("id, provider, event_id, event_type, received_at, error, claimed_at").not("error", "is", null).is("processed_at", null).order("received_at").limit(100),
    db.from("subscriptions").select(SUB_COLS + ", retries, next_retry_at").eq("status", "grace").order("grace_until").limit(100),
    db.from("checkout_sessions").select("id, user_id, provider, region, period, amount_minor, currency, created_at").eq("status", "failed").gte("created_at", week).order("created_at", { ascending: false }).limit(100),
    // Money that bought nothing (Egypt price with a card from abroad, a second plan, a late charge): refused and refunded.
    db.from("payments").select(PAYMENT_COLS).is("subscription_id", null).gte("paid_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).order("paid_at", { ascending: false }).limit(50),
  ]);
  return {
    events: (events.data ?? []) as { id: string; provider: string; event_id: string; event_type: string; received_at: string; error: string; claimed_at: string | null }[],
    grace: (grace.data ?? []) as unknown as (SubRow & { retries: number; next_retry_at: string | null })[],
    failed: (failed.data ?? []) as { id: string; user_id: string; provider: string; region: string; period: string; amount_minor: number; currency: string; created_at: string }[],
    refused: (refused.data ?? []) as PaymentRow[],
  };
}

// ───────── discounts ─────────

export type CodeRow = {
  code: string; kind: string; percent: number; period: string | null; region: string | null; first_period_only: boolean; starts_at: string | null; ends_at: string | null;
  active: boolean; max_uses: number | null; note: string | null; created_by: string | null; created_at: string;
};

export async function discountCodes() {
  const db = createAdminClient();
  const [codes, stats] = await Promise.all([
    db.from("discount_codes").select("code, kind, percent, period, region, first_period_only, starts_at, ends_at, active, max_uses, note, created_by, created_at").order("created_at", { ascending: false }),
    db.rpc("admin_discount_stats"),
  ]);
  const by = new Map(((stats.data ?? []) as { code: string; uses: number; revenue: Record<string, number> }[]).map((s) => [s.code, s]));
  return ((codes.data ?? []) as CodeRow[]).map((c) => ({ ...c, uses: Number(by.get(c.code)?.uses ?? 0), revenue: by.get(c.code)?.revenue ?? {} }));
}

export function codeState(c: Pick<CodeRow, "active" | "starts_at" | "ends_at" | "max_uses"> & { uses: number }, now = Date.now()): "active" | "scheduled" | "paused" | "ended" {
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return "ended";
  if (c.max_uses !== null && c.uses >= c.max_uses) return "ended";
  if (!c.active) return "paused";
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return "scheduled";
  return "active";
}

// ───────── revenue ─────────

export type RevenueLine = { region: string; provider: string; paying: number; mrr: number; newMrr: number; churned: number; paid: number; refunds: number; net: number };

/** Monthly value of a plan in USD cents: annual plans count as one twelfth a month. */
export const mrrUsd = (s: Pick<SubRow, "renew_amount_minor" | "currency" | "period">) => {
  const u = toUsd(s.renew_amount_minor, s.currency)?.minor ?? 0;
  return s.period === "year" ? Math.round(u / 12) : u;
};

export async function revenue(monthStart: Date) {
  const db = createAdminClient();
  const start = monthStart.toISOString();
  const end = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)).toISOString();
  const [live, started, churned, paid, refunded, comp] = await Promise.all([
    db.from("subscriptions").select("region, provider, period, currency, renew_amount_minor").in("status", ["active", "grace"]).limit(20000),
    db.from("subscriptions").select("region, provider, period, currency, renew_amount_minor").gte("created_at", start).lt("created_at", end).limit(20000),
    db.from("subscriptions").select("region, provider, period, currency, renew_amount_minor").in("status", ["ended", "refunded", "cancelled"]).or(`and(ended_at.gte.${start},ended_at.lt.${end}),and(cancelled_at.gte.${start},cancelled_at.lt.${end})`).limit(20000),
    db.from("payments").select("provider, currency, amount_minor, subscription_id, subscriptions(region)").gte("paid_at", start).lt("paid_at", end).limit(20000),
    db.from("payments").select("provider, currency, amount_minor, subscriptions(region)").eq("status", "refunded").gte("refunded_at", start).lt("refunded_at", end).limit(20000),
    db.from("entitlements").select("user_id", { count: "exact", head: true }).eq("source", "manual").eq("plan", "pro").gt("valid_until", new Date().toISOString()),
  ]);
  const lines = new Map<string, RevenueLine>();
  const line = (region: string, provider: string) => {
    const k = `${region}|${provider}`;
    if (!lines.has(k)) lines.set(k, { region, provider, paying: 0, mrr: 0, newMrr: 0, churned: 0, paid: 0, refunds: 0, net: 0 });
    return lines.get(k)!;
  };
  type S = Pick<SubRow, "region" | "provider" | "period" | "currency" | "renew_amount_minor">;
  for (const s of (live.data ?? []) as S[]) { const l = line(s.region, s.provider); l.paying++; l.mrr += mrrUsd(s); }
  for (const s of (started.data ?? []) as S[]) line(s.region, s.provider).newMrr += mrrUsd(s);
  for (const s of (churned.data ?? []) as S[]) line(s.region, s.provider).churned += mrrUsd(s);
  type P = { provider: string; currency: string; amount_minor: number; subscriptions: { region: string } | { region: string }[] | null };
  const regionOf = (p: P) => (Array.isArray(p.subscriptions) ? p.subscriptions[0]?.region : p.subscriptions?.region) ?? "none";
  for (const p of (paid.data ?? []) as P[]) line(regionOf(p), p.provider).paid += toUsd(p.amount_minor, p.currency)?.minor ?? 0;
  for (const p of (refunded.data ?? []) as P[]) line(regionOf(p), p.provider).refunds += toUsd(p.amount_minor, p.currency)?.minor ?? 0;
  const rows = [...lines.values()].map((l) => ({ ...l, net: l.paid - l.refunds })).sort((a, b) => b.mrr - a.mrr);
  const sum = (k: keyof RevenueLine) => rows.reduce((t, r) => t + (r[k] as number), 0);
  return {
    rows, comp: comp.count ?? 0,
    totals: { paying: sum("paying"), mrr: sum("mrr"), newMrr: sum("newMrr"), churned: sum("churned"), paid: sum("paid"), refunds: sum("refunds"), net: sum("net") },
  };
}

/** One row per payment and refund in a month, in the original currency and in USD (the accountant export). */
export async function accountantRows(monthStart: Date) {
  const db = createAdminClient();
  const start = monthStart.toISOString();
  const end = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)).toISOString();
  const [paid, refunded] = await Promise.all([
    db.from("payments").select(PAYMENT_COLS).gte("paid_at", start).lt("paid_at", end).order("paid_at").limit(50000),
    db.from("payments").select(PAYMENT_COLS).eq("status", "refunded").gte("refunded_at", start).lt("refunded_at", end).order("refunded_at").limit(50000),
  ]);
  const row = (p: PaymentRow, type: "payment" | "refund") => {
    const u = toUsd(p.amount_minor, p.currency);
    const sign = type === "refund" ? -1 : 1;
    return {
      date: (type === "refund" ? p.refunded_at : p.paid_at)?.slice(0, 10), type, receipt: p.receipt_no, provider: p.provider, provider_id: p.provider_payment_id,
      plan: `${p.period === "year" ? "annual" : "monthly"} ${p.kind}`, currency: p.currency, amount: ((sign * p.amount_minor) / 100).toFixed(2),
      usd: u ? ((sign * u.minor) / 100).toFixed(2) : "", usd_rate_date: u?.rateDate ?? "",
    };
  };
  return [...((paid.data ?? []) as PaymentRow[]).map((p) => row(p, "payment")), ...((refunded.data ?? []) as PaymentRow[]).map((p) => row(p, "refund"))];
}

// ───────── student checks ─────────

export async function studentChecks() {
  const { data } = await createAdminClient().from("student_checks").select("user_id, email, sent_at, expires_at, verified_at, valid_until").order("sent_at", { ascending: false }).limit(200);
  return (data ?? []) as { user_id: string; email: string; sent_at: string | null; expires_at: string | null; verified_at: string | null; valid_until: string | null }[];
}
