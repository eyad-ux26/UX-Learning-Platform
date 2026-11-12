import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { people, refunds, type RefundTab } from "@/lib/admin/data/billing";
import { needsSecondPerson, refundLimitUsdMinor, refundRule } from "@/lib/admin/data/refunds";
import { fmtMoney, toUsd, USD_RATES } from "@/lib/admin/format";
import { Card, Empty, Money, NoAccess, Note, PageHead, St, Tabs, When, Who } from "@/components/admin/ui";
import { RefundButtons } from "../RefundButton";
import { PaymentStatus } from "../PaymentStatus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Refunds" };

const TABS: [RefundTab, string][] = [["decide", "To decide"], ["approval", "Waiting for approval"], ["processing", "Processing"], ["done", "Done"]];

export default async function RefundsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "refunds.view")) return <NoAccess what="Refunds" roles="a billing or support role" />;
  const sp = await searchParams;
  const tab = (TABS.find(([t]) => t === sp.tab)?.[0] ?? "decide") as RefundTab;
  const [items, limit] = await Promise.all([refunds(tab), refundLimitUsdMinor()]);
  const who = await people(items.map((i) => i.user_id));
  const fresh = isFresh(ctx);
  const canDecide = allowed(ctx, "refunds.approve", "refunds.approve_any");
  const any = allowed(ctx, "refunds.approve_any");
  const limitText = `${fmtMoney(limit, "USD")} (about ${fmtMoney(Math.round(limit * USD_RATES.EGP.perUsd), "EGP")})`;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Refunds" }]} title="Refunds" sub="Requests from learners. The 7-day rule is checked for you; the refund itself happens at Paddle or Paymob. Done also lists refunds made at the provider directly." />
      {canDecide ? (
        <Note icon="shield-check">{any ? "Your roles can refund any amount. Refunds over " + limitText + " or outside the 7 days ask for a fresh authenticator code." : `Your roles can refund up to ${limitText} inside the 7-day window. Bigger refunds and exceptions go to a support lead, billing manager or admin for approval.`}</Note>
      ) : null}
      <Tabs label="Refund queue" items={TABS.map(([t, l]) => ({ href: t === "decide" ? "/admin/billing/refunds" : `/admin/billing/refunds?tab=${t}`, label: l, current: t === tab, count: t === tab ? items.length : undefined }))} />
      <Card label="Refund requests" pad={false}>
        {items.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col" className="num">Amount</th><th scope="col">Charged</th><th scope="col">7-day rule</th><th scope="col">Reason</th><th scope="col">{tab === "done" ? "Outcome" : <span className="sr">Actions</span>}</th></tr></thead>
            <tbody>{items.map((r) => {
              const p = who.get(r.user_id);
              const pay = r.pay;
              const rule = pay ? refundRule(pay.paid_at) : null;
              const usd = pay ? toUsd(pay.amount_minor, pay.currency) : null;
              return (
                <tr key={r.id}>
                  <td><Who id={r.user_id} name={p?.display_name} email={p?.email} sub={pay ? <Link href={`/admin/billing/payments/${pay.id}`} className="a-id">{pay.receipt_no}</Link> : undefined} /></td>
                  <td className="num"><Money minor={r.amount_minor} currency={r.currency} /></td>
                  <td>{pay ? <When at={pay.paid_at} /> : "—"}</td>
                  <td>{rule ? <St tone={rule.inside ? "good" : "bad"}>{rule.text}</St> : null}{usd && usd.minor > limit ? <span className="t-xs ink-3" style={{ display: "block" }}>Over the agent limit</span> : null}</td>
                  <td style={{ maxWidth: 320 }}><span className="t-sm" dir="auto">{r.reason}</span><span className="t-xs ink-3" style={{ display: "block" }}>{r.status === "provider" ? "Refunded" : "Asked"} <When at={r.created_at} rel /></span></td>
                  <td>{tab === "done" ? (
                    <span className="a-col" style={{ gap: 2 }}>{r.status === "approved" ? <St tone="good">Approved</St> : r.status === "provider" ? <St tone="info">At {pay?.provider === "paymob" ? "Paymob" : pay?.provider === "paddle" ? "Paddle" : "the test provider"}</St> : <St tone="off">Declined</St>}{pay ? <PaymentStatus p={pay} /> : null}</span>
                  ) : tab === "approval" ? <Link href="/admin/team/approvals" className="t-sm">In Approvals</Link>
                    : tab === "processing" ? <St tone="wait">Waiting for {pay?.provider === "paymob" ? "Paymob" : "Paddle"}</St>
                    : pay ? <RefundButtons pay={pay} requestId={r.id} blocked={needsSecondPerson(ctx, pay, limit)} fresh={fresh} overLimit={!usd || usd.minor > limit} canDecide={canDecide} ar={p?.locale === "ar"} /> : null}
                    {r.approval?.status === "failed" ? <St tone="bad">Approved, but the provider refused. See Approvals.</St> : null}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="arrow-u-up-left" title={tab === "decide" ? "No refund requests to decide" : "Nothing here"}>New requests from learners appear here and in the support inbox.</Empty>}
      </Card>
      <p className="t-xs ink-3">After approval the status follows the provider: Processing until Paddle or Paymob confirms, then Refunded. The learner gets the refund email in their language and their Pro access ends; progress and certificates stay.</p>
    </main>
  );
}
