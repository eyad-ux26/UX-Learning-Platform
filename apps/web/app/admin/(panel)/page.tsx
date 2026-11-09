import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { dailyByProvider, dashboard, dashboardView, RANGES, type Range } from "@/lib/admin/data/dashboard";
import { CATEGORY_LABEL } from "@/lib/admin/data/support";
import { pathTitle } from "@/lib/admin/data/learners";
import { fmtDuration, fmtMoney, fmtTime, REGION_LABEL } from "@/lib/admin/format";
import { Card, Empty, I, Kpi, PageHead, St, Tabs, type Tone } from "@/components/admin/ui";
import { TrendChart } from "@/components/admin/TrendChart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const usd = (minor: number) => fmtMoney(Math.round(minor), "USD");
/** "12% vs last week", "3 more than last week", with the direction a rise means for this number. */
function delta(now: number, before: number, vs: string, goodWhenUp = true): { note: string; tone: "up" | "down" | "flat" } {
  if (now === before) return { note: `same as ${vs}`, tone: "flat" };
  const up = now > before;
  const tone = up === goodWhenUp ? "up" : "down";
  if (before === 0 || Math.abs(now - before) < 10) return { note: `${Math.abs(now - before).toLocaleString("en")} ${up ? "more" : "fewer"} than ${vs}`, tone };
  return { note: `${Math.round(((now - before) / before) * 100)}% vs ${vs}`, tone };
}
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

type Attn = { tone: Tone; tag: string; title: string; meta?: string; href: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "dashboard.view")) redirect("/admin/my-work");
  const sp = await searchParams;
  const range: Range = (Object.keys(RANGES) as Range[]).includes(sp.range as Range) ? (sp.range as Range) : "today";
  const view = dashboardView(ctx);
  const money = allowed(ctx, "revenue.view");
  const d = await dashboard(ctx, range);
  const vs = d.w.vs;
  const db = createAdminClient();

  // Support numbers for the support view: the last 7 days of tickets (first reply, resolution, satisfaction, volume).
  const support = view === "support" || allowed(ctx, "support.view")
    ? await db.from("support_tickets").select("category, status, created_at, first_replied_at, resolved_at, satisfaction").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()).limit(20000).then((r) => r.data ?? [])
    : [];
  const week = support.filter((t) => Date.now() - new Date(t.created_at as string).getTime() < 7 * 86_400_000);
  const firstReply = median(week.filter((t) => t.first_replied_at).map((t) => (new Date(t.first_replied_at as string).getTime() - new Date(t.created_at as string).getTime()) / 1000));
  const resolution = median(week.filter((t) => t.resolved_at).map((t) => (new Date(t.resolved_at as string).getTime() - new Date(t.created_at as string).getTime()) / 1000));
  const rated = week.filter((t) => t.satisfaction);
  const good = rated.length ? Math.round((rated.filter((t) => t.satisfaction === "good").length / rated.length) * 100) : null;

  const attention: Attn[] = [];
  if (allowed(ctx, "problems.view")) {
    if (d.failed) attention.push({ tone: "bad", tag: "Failed", title: `${d.failed} ${d.failed === 1 ? "checkout" : "checkouts"} failed today`, href: "/admin/billing/problems" });
    if (d.events) attention.push({ tone: "bad", tag: "Alert", title: `${d.events} payment ${d.events === 1 ? "event" : "events"} could not be applied`, meta: "Retry them from Billing problems", href: "/admin/billing/problems" });
    if (d.grace) attention.push({ tone: "wait", tag: "Grace", title: `${d.grace} ${d.grace === 1 ? "subscription is" : "subscriptions are"} in the grace period after a failed renewal`, href: "/admin/billing/problems" });
  }
  if (allowed(ctx, "support.view") && d.support.late) {
    const o = d.support.oldestLate;
    attention.push({ tone: "bad", tag: "Past SLA", title: `${d.support.late} ${d.support.late === 1 ? "ticket is" : "tickets are"} past the first-reply target`,
      meta: o ? `Oldest: #${o.id} ${CATEGORY_LABEL[o.category]?.toLowerCase() ?? ""}, due ${fmtTime(o.first_reply_due, true)}${o.assignee_id ? "" : ", unassigned"}` : undefined, href: "/admin/support?queue=late" });
  }
  if (allowed(ctx, "support.view") && d.support.dueSoon) attention.push({ tone: "wait", tag: "Due soon", title: `${d.support.dueSoon} ${d.support.dueSoon === 1 ? "ticket reaches" : "tickets reach"} the target in under 2 hours`, href: "/admin/support" });
  if (d.approvals) attention.push({ tone: "wait", tag: "Approval", title: `${d.approvals} ${d.approvals === 1 ? "request needs" : "requests need"} a second person`, href: "/admin/team/approvals" });
  if (allowed(ctx, "appeals.view") && d.appeals.waiting) attention.push({ tone: "wait", tag: "Waiting", title: `${d.appeals.waiting} ${d.appeals.waiting === 1 ? "appeal" : "appeals"} to decide`, meta: d.appeals.oldest ? `Oldest from ${fmtTime(d.appeals.oldest.created_at, true)}, ${d.appeals.oldest.lesson_id}` : undefined, href: "/admin/appeals" });
  if (allowed(ctx, "refunds.view") && d.refundsWaiting) attention.push({ tone: "wait", tag: "Waiting", title: `${d.refundsWaiting} refund ${d.refundsWaiting === 1 ? "request" : "requests"} to decide`, href: "/admin/billing/refunds" });
  if (allowed(ctx, "team.view")) for (const g of d.superGrants) attention.push({ tone: "info", tag: "Access", title: `A super admin grant takes effect ${fmtTime(g.effective_at, true)}`, meta: "Any super admin can cancel it.", href: "/admin/team/super-admins" });

  const kpis = view === "support" ? [
    <Kpi key="mine" label="My open tickets" icon="tray" value={d.support.mine} href="/admin/my-work" />,
    <Kpi key="un" label="Unassigned tickets" icon="users-three" value={d.support.unassigned} href="/admin/support?queue=unassigned" />,
    <Kpi key="late" label="Past SLA" icon="timer" value={d.support.late} href="/admin/support?queue=late" alert={d.support.late > 0} />,
    <Kpi key="fr" label="First reply, median" icon="clock" value={firstReply === null ? "—" : fmtDuration(firstReply)} note="last 7 days" />,
    <Kpi key="rs" label="Resolution, median" icon="check-circle" value={resolution === null ? "—" : fmtDuration(resolution)} note="last 7 days" />,
    <Kpi key="rf" label="Refund requests" icon="arrow-u-up-left" value={d.refundsWaiting} href="/admin/billing/refunds" />,
    <Kpi key="ap" label="Appeals waiting" icon="scales" value={d.appeals.waiting} href="/admin/appeals" />,
    <Kpi key="sat" label="Satisfaction, 7 days" icon="star" value={good === null ? "—" : `${good}% good`} note={rated.length ? `${rated.length} rated` : "no ratings yet"} />,
  ] : [
    <Kpi key="su" label="New sign-ups" icon="user-plus" value={d.cur.signups.toLocaleString("en")} {...k(delta(d.cur.signups, d.prev.signups, vs))} href="/admin/learners" />,
    <Kpi key="ac" label="Active learners" icon="users-three" value={d.cur.active.toLocaleString("en")} note={`weekly ${d.weekActive.toLocaleString("en")} · ${delta(d.cur.active, d.prev.active, vs).note}`} tone={delta(d.cur.active, d.prev.active, vs).tone} href="/admin/learners?active=7" />,
    <Kpi key="ns" label="New subscribers" icon="arrows-split" value={d.cur.subscribers.toLocaleString("en")} {...k(delta(d.cur.subscribers, d.prev.subscribers, vs))} href="/admin/billing/subscriptions" />,
    <Kpi key="cn" label="Cancellations" icon="x-circle" value={d.cur.cancellations.toLocaleString("en")} {...k(delta(d.cur.cancellations, d.prev.cancellations, vs, false))} href="/admin/billing/subscriptions?tab=cancelled" />,
    ...(money ? [
      <Kpi key="rv" label={range === "today" ? "Revenue today" : "Revenue"} icon="chart-line-up" value={usd(d.money.paid)} {...k(delta(d.money.paid, d.moneyPrev.paid, vs))} href="/admin/billing/revenue" />,
      <Kpi key="rr" label={range === "today" ? "Refunds today" : "Refunds"} icon="arrow-u-up-left" value={`${d.money.refunds} · ${usd(d.money.refunded)}`} {...k(delta(d.money.refunds, d.moneyPrev.refunds, vs, false))} href="/admin/billing/refunds?tab=done" />,
    ] : []),
    ...(allowed(ctx, "support.view") ? [
      <Kpi key="ot" label="Open tickets" icon="tray" value={d.support.open} href="/admin/support" />,
      <Kpi key="lt" label="Tickets past SLA" icon="timer" value={d.support.late} href="/admin/support?queue=late" alert={d.support.late > 0} />,
    ] : []),
    <Kpi key="ce" label="Certificates issued" icon="certificate" value={d.cur.certificates.toLocaleString("en")} {...k(delta(d.cur.certificates, d.prev.certificates, vs))} href="/admin/certificates" />,
  ];

  // The chart: revenue by provider for money roles, new tickets for the support view.
  const N = 30;
  const rev = dailyByProvider(d.moneyRows, N);
  const tickets = (() => {
    const counts = new Map(rev.days.map((x) => [x, 0]));
    for (const t of support) {
      const day = new Date(t.created_at as string).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
      if (counts.has(day)) counts.set(day, counts.get(day)! + 1);
    }
    return [...counts.values()];
  })();
  const providers = Object.keys(rev.series).filter((p) => p !== "mock");
  const revSeries = (providers.length ? providers : Object.keys(rev.series)).slice(0, 2).map((p, i) => ({ label: p === "paddle" ? "Paddle" : p === "paymob" ? "Paymob" : "Test payments", color: i ? "var(--s2)" : "var(--s1)", values: rev.series[p]! }));

  const F: Record<string, string> = { signup: "Sign up", lesson: "Finish first lesson", unit: "Finish first unit", subscribe: "Subscribe", path: "Finish a path", share: "Share certificate" };
  const top = d.funnel[0]?.n ?? 0;
  const byCat = new Map<string, number>();
  for (const t of week) byCat.set(t.category as string, (byCat.get(t.category as string) ?? 0) + 1);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const catMax = cats[0]?.[1] ?? 0;
  const openByCat = new Map<string, number>();
  for (const t of support) if (["new", "open", "waiting_team"].includes(t.status as string)) openByCat.set(t.category as string, (openByCat.get(t.category as string) ?? 0) + 1);

  const now = new Date();
  const base = range === "today" ? "/admin" : `/admin?range=${range}`;
  return (
    <main className="a-page">
      <PageHead title="Dashboard"
        sub={<>{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" })} · Cairo time · changes compare with {vs}{money ? " · money in USD at fixed rates" : ""}</>}
        actions={<Link className="a-btn" href={base}><I n="arrows-clockwise" />Refresh</Link>} />
      <Tabs label="Date range" items={(Object.keys(RANGES) as Range[]).map((r) => ({ href: r === "today" ? "/admin" : `/admin?range=${r}`, label: RANGES[r], current: r === range }))} />
      {view !== "business" ? <p className="t-sm ink-2" style={{ margin: "0 0 12px" }}><I n="info" /> Showing the {view} view of the dashboard for your roles.{money ? "" : " Money totals are hidden for your roles."}</p> : null}
      <section aria-label="Key numbers" className="a-kpis" style={{ marginBottom: 16 }}>{kpis}</section>

      <div className="a-split">
        <div className="a-main-col">
          {money && view === "business" ? (
            <Card title="Revenue by provider">
              {revSeries.length ? <TrendChart days={rev.days} series={revSeries} unit="usd" title="Revenue by provider" /> : <Empty icon="chart-line-up" title="No payments in the last 30 days" />}
              {d.regions.size ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, paddingTop: 10, marginTop: 10, borderTop: "1px solid var(--line)" }}>
                  {["eg", "gulf", "arab", "world"].map((r) => {
                    const g = d.regions.get(r) ?? { paying: 0, mrr: 0 };
                    const total = [...d.regions.values()].reduce((a, b) => a + b.mrr, 0) || 1;
                    return (
                      <div key={r} className="a-stack" style={{ gap: 4 }}>
                        <span className="t-xs ink-2 w6">{REGION_LABEL[r]}</span>
                        <span className="a-row" style={{ gap: 8 }}><b className="num">{usd(g.mrr)}</b><span className="t-xs ink-3">MRR · {g.paying} paying</span></span>
                        <span className="a-meter"><span style={{ width: `${Math.round((g.mrr / total) * 100)}%` }} /></span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Card>
          ) : view === "support" ? (
            <Card title="New tickets"><TrendChart days={rev.days} series={[{ label: "New tickets", color: "var(--s1)", values: tickets }]} unit="count" title="New tickets" /></Card>
          ) : null}

          <Card title={view === "support" ? "Top issues this week" : "Funnel, last 30 days"} actions={<span className="t-xs ink-3">{view === "support" ? "tickets by category" : "learners who signed up in the last 30 days"}</span>}>
            {view === "support" ? (
              cats.length ? <div className="a-funnel">{cats.map(([c, n]) => (
                <div key={c} style={{ display: "contents" }}><span className="t-sm">{CATEGORY_LABEL[c] ?? c}</span><span className="bar" style={{ width: `${(n / catMax) * 100}%` }} /><b className="num t-sm">{n}</b></div>
              ))}</div> : <Empty icon="tray" title="No tickets this week" />
            ) : top ? (
              <>
                <div className="a-funnel">{d.funnel.map((f, i) => (
                  <div key={f.step} style={{ display: "contents" }}>
                    <span className="t-sm">{F[f.step] ?? f.step}</span>
                    <span className="bar" style={{ width: `${(f.n / top) * 100}%` }} />
                    <span className="t-sm"><b className="num">{f.n.toLocaleString("en")}</b>{i ? <span className="t-xs ink-3"> · {d.funnel[i - 1]!.n ? Math.round((f.n / d.funnel[i - 1]!.n) * 1000) / 10 : 0}%</span> : null}</span>
                  </div>
                ))}</div>
                <p className="t-xs ink-3" style={{ marginTop: 10 }}>Bars are the share of sign-ups; the percent is the share of the step before. Visits are in Cloudflare Web Analytics.</p>
              </>
            ) : <Empty icon="funnel" title="No sign-ups in the last 30 days" />}
          </Card>
        </div>

        <aside className="a-rail a-stack">
          <Card title={<>Needs attention {attention.length ? <span className="a-count hot">{attention.length}</span> : null}</>} pad={false}>
            {attention.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 6 }}>{attention.map((a, i) => (
                <li key={i}><Link href={a.href} className="a-qa" style={{ alignItems: "flex-start", padding: 10, gap: 12 }}>
                  <St tone={a.tone}>{a.tag}</St>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}><span>{a.title}</span>{a.meta ? <span className="t-xs ink-3" style={{ fontWeight: 400 }}>{a.meta}</span> : null}</span>
                  <I n="caret-right" s={14} className="ink-3" />
                </Link></li>
              ))}</ul>
            ) : <Empty icon="check-circle" title="Nothing needs you right now" />}
          </Card>
          {view === "support" ? (
            <Card title="Queues right now" actions={<Link className="t-xs w6" href="/admin/support">Open</Link>} pad={false}>
              <table className="a-tbl"><thead><tr><th scope="col">Category</th><th scope="col" className="r">Open</th></tr></thead>
                <tbody>{[...openByCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => <tr key={c}><td>{CATEGORY_LABEL[c] ?? c}</td><td className="r num">{n}</td></tr>)}</tbody></table>
            </Card>
          ) : (
            <Card title="Paths this week" pad={false}>
              {d.paths.length ? (
                <table className="a-tbl"><thead><tr><th scope="col">Path</th><th scope="col" className="r">Active learners</th><th scope="col" className="r">Change</th></tr></thead>
                  <tbody>{d.paths.map((p) => {
                    const ch = p.before ? Math.round(((p.learners - p.before) / p.before) * 100) : null;
                    return <tr key={p.id}><td>{pathTitle(p.id)}</td><td className="r num">{p.learners.toLocaleString("en")}</td>
                      <td className={`r t-xs w7 ${ch === null || ch === 0 ? "ink-3" : ch > 0 ? "ink-good" : "ink-bad"}`}>{ch === null ? "new" : `${ch > 0 ? "+" : ch < 0 ? "−" : ""}${Math.abs(ch)}%`}</td></tr>;
                  })}</tbody></table>
              ) : <Empty icon="book-open" title="No lessons tried this week" />}
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}

const k = (x: { note: string; tone: "up" | "down" | "flat" }) => ({ note: x.note, tone: x.tone });
