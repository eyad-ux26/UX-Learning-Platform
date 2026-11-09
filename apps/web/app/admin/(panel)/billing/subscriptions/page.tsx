import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { people, subCounts, subscriptions, PAGE, type SubTab } from "@/lib/admin/data/billing";
import { REGION_LABEL } from "@/lib/admin/format";
import { Card, Empty, Filters, Money, NoAccess, PageHead, Pager, St, Tabs, When, Who, withQuery, type Tone } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { CompDrawer } from "../CompDrawer";
import { endComp } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscriptions" };

const STATUS: Record<string, [Tone, string]> = {
  active: ["good", "Active"], grace: ["wait", "Past due"], cancelled: ["off", "Cancelled, Pro until end"], ended: ["off", "Ended"], refunded: ["bad", "Refunded"], paused: ["off", "Paused"],
};
const TABS: [SubTab, string][] = [["all", "All"], ["paid", "Paid"], ["comp", "Comp"], ["past_due", "Past due"], ["cancelled", "Cancelled"], ["refunded", "Refunded"]];

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "subs.view")) return <NoAccess what="Subscriptions" roles="a billing or support role" />;
  const sp = await searchParams;
  const tab = (TABS.find(([t]) => t === sp.tab)?.[0] ?? "all") as SubTab;
  const page = Math.max(1, Number(sp.page) || 1);
  const [list, counts] = await Promise.all([subscriptions({ tab, q: sp.q?.trim() || undefined, region: sp.region, provider: sp.provider, page }), subCounts()]);
  const who = await people([...list.subs.map((s) => s.user_id), ...list.comp.map((c) => c.user_id)]);
  const base = { tab, q: sp.q, region: sp.region, provider: sp.provider };
  const canComp = allowed(ctx, "comp.grant", "learners.act");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Subscriptions" }]} title="Subscriptions" sub={`${counts.paid.toLocaleString("en")} active paid Pro · ${counts.comp} comp, counted apart from paid revenue`}
        actions={canComp ? <CompDrawer unlimited={allowed(ctx, "comp.grant")} primary /> : null} />
      <Tabs label="Subscription status" items={TABS.map(([t, l]) => ({ href: withQuery("/admin/billing/subscriptions", {}, { tab: t === "all" ? undefined : t }), label: l, count: counts[t], current: t === tab }))} />
      <Card label="Subscriptions" pad={false}>
        <Filters action="/admin/billing/subscriptions" q={sp.q} placeholder="Learner, email or subscription id" hidden={tab === "all" ? {} : { tab }}
          selects={tab === "comp" ? [] : [
            { name: "region", label: "Region", value: sp.region, options: Object.entries(REGION_LABEL) },
            { name: "provider", label: "Provider", value: sp.provider, options: [["paddle", "Paddle"], ["paymob", "Paymob"], ["mock", "Test provider"]] },
          ]} />
        {tab === "comp" ? (
          list.comp.length ? (
            <div className="a-tbl-wrap"><table className="a-tbl">
              <thead><tr><th scope="col">Learner</th><th scope="col">Pro since</th><th scope="col">Ends</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
              <tbody>{list.comp.map((c) => {
                const p = who.get(c.user_id);
                return (
                  <tr key={c.user_id}>
                    <td><Who id={c.user_id} name={p?.display_name} email={p?.email} /></td>
                    <td><When at={c.pro_since} /></td><td><When at={c.valid_until} /></td>
                    <td>{canComp ? <Confirm action={endComp} label="End now" title="End free Pro now?" small ghost hidden={[{ name: "user", value: c.user_id }]}
                      effects={[{ icon: "minus-circle", text: "Pro ends now, unless a paid plan is still running." }, { icon: "check", text: "Progress, streak and certificates stay." }]} /> : null}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          ) : <Empty icon="gift" title="No comp access right now" />
        ) : list.subs.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col">Plan</th><th scope="col">Region price</th><th scope="col">Provider</th><th scope="col">Status</th><th scope="col">Started</th><th scope="col">Renews or ends</th><th scope="col" className="num">Amount</th></tr></thead>
            <tbody>{list.subs.map((s) => {
              const p = who.get(s.user_id);
              const [tone, label] = STATUS[s.status] ?? ["off", s.status];
              return (
                <tr key={s.id}>
                  <td><Who id={s.user_id} name={p?.display_name} email={p?.email} /></td>
                  <td>Pro {s.period === "year" ? "annual" : "monthly"}{s.discount ? <span className="t-xs ink-3" style={{ display: "block" }}>{s.discount.replace("_", " ")} discount</span> : null}</td>
                  <td>{REGION_LABEL[s.region] ?? s.region}<span className="t-xs ink-3" style={{ display: "block" }}>{s.country}</span></td>
                  <td>{s.provider === "mock" ? "Test" : s.provider === "paddle" ? "Paddle" : "Paymob"}{s.provider_sub_id ? <span className="a-id t-xs" style={{ display: "block" }}>{s.provider_sub_id}</span> : null}</td>
                  <td><St tone={tone}>{label}</St>{s.status === "grace" && s.grace_until ? <span className="t-xs ink-3" style={{ display: "block" }}>Pro until <When at={s.grace_until} /></span> : null}</td>
                  <td><When at={s.created_at} /></td>
                  <td><When at={s.ended_at ?? s.current_period_end} /></td>
                  <td className="num"><Money minor={s.renew_amount_minor} currency={s.currency} /></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="arrows-split" title="No subscriptions match">Try another tab or clear the filters. <Link href="/admin/billing/subscriptions">Clear</Link></Empty>}
        <Pager page={page} more={page * PAGE < list.total} total={list.total} href={(n) => withQuery("/admin/billing/subscriptions", base, { page: n })} />
      </Card>
    </main>
  );
}
