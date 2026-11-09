import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { people, problems } from "@/lib/admin/data/billing";
import { mrrUsd } from "@/lib/admin/data/billing";
import { fmtMoney } from "@/lib/admin/format";
import { Card, Empty, Kpi, Money, NoAccess, PageHead, St, When, Who } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { retryEvent } from "../actions";
import { providerName } from "../PaymentStatus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing problems" };

export default async function ProblemsPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "problems.view")) return <NoAccess what="Billing problems" roles="a billing role" />;
  const d = await problems();
  const who = await people([...d.grace.map((g) => g.user_id), ...d.failed.map((f) => f.user_id), ...d.refused.map((r) => r.user_id)]);
  const atRisk = d.grace.reduce((t, s) => t + mrrUsd(s), 0);
  const canRetry = allowed(ctx, "problems.retry");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Billing problems" }]} title="Billing problems" sub="Things that need a person: failed charges, past due learners, payments that bought nothing, and webhook events we could not process." />
      <div className="a-kpis">
        <Kpi label="Failed checkouts, 7 days" value={d.failed.length} icon="x-circle" />
        <Kpi label="Past due now" value={d.grace.length} note={`≈ ${fmtMoney(atRisk, "USD")} MRR at risk`} icon="hourglass-medium" alert={d.grace.length > 0} />
        <Kpi label="Refused and refunded, 30 days" value={d.refused.length} note="Egypt price with a card from abroad, a second plan, a late charge" icon="arrow-u-up-left" />
        <Kpi label="Webhooks not processed" value={d.events.length} note={d.events[0] ? <>oldest <When at={d.events[0].received_at} rel /></> : "none"} icon="warning" alert={d.events.length > 0} />
      </div>
      <Card title="Webhook events we could not process" pad={false} actions={<span className="t-xs ink-3">Retrying runs the same handler again; it never changes a payment by hand.</span>}>
        {d.events.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Received</th><th scope="col">Provider</th><th scope="col">Event</th><th scope="col">Why it failed</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{d.events.map((e) => (
              <tr key={e.id}>
                <td><When at={e.received_at} /></td><td>{providerName(e.provider)}</td><td className="a-id">{e.event_type}<span className="t-xs ink-3" style={{ display: "block" }}>{e.event_id}</span></td>
                <td style={{ maxWidth: 360 }}><span className="t-sm">{e.error}</span></td>
                <td>{canRetry ? <Confirm action={retryEvent} label="Retry" title="Run this event again?" small reason={false} hidden={[{ name: "event", value: e.id }]}
                  effects={[{ icon: "arrows-clockwise", text: "The same handler runs again with the stored, verified event." }, { icon: "check", text: "If it works, the payment and plan update as if the webhook had worked the first time." }]} /> : null}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <Empty icon="check-circle" title="Every webhook was processed" />}
      </Card>
      <Card title="Past due" pad={false} actions={<span className="t-xs ink-3">Renewals retry on day 2 and day 5. We email the learner in their language after each failure.</span>}>
        {d.grace.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col">Plan</th><th scope="col">What happened</th><th scope="col">Next</th></tr></thead>
            <tbody>{d.grace.map((s) => {
              const p = who.get(s.user_id);
              return (
                <tr key={s.id}>
                  <td><Who id={s.user_id} name={p?.display_name} email={p?.email} /></td>
                  <td>Pro {s.period === "year" ? "annual" : "monthly"} · <Money minor={s.renew_amount_minor} currency={s.currency} usd={false} /><span className="t-xs ink-3" style={{ display: "block" }}>{providerName(s.provider)}</span></td>
                  <td><St tone="wait">Renewal failed {s.retries ? `${s.retries} time${s.retries > 1 ? "s" : ""}` : ""}</St></td>
                  <td className="t-sm">{s.next_retry_at ? <>Retry <When at={s.next_retry_at} /></> : null}{s.grace_until ? <span style={{ display: "block" }}>Pro ends <When at={s.grace_until} /></span> : null}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="check-circle" title="Nobody is past due" />}
      </Card>
      <Card title="Payments that bought nothing" pad={false} actions={<span className="t-xs ink-3">Agreed rule: refund the Egypt-price payment and send a Paddle checkout at the learner’s region price.</span>}>
        {d.refused.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col" className="num">Amount</th><th scope="col">When</th><th scope="col">Card</th><th scope="col">State</th></tr></thead>
            <tbody>{d.refused.map((r) => {
              const p = who.get(r.user_id);
              return (
                <tr key={r.id}>
                  <td><Who id={r.user_id} name={p?.display_name} email={p?.email} /></td>
                  <td className="num"><Link href={`/admin/billing/payments/${r.id}`}><Money minor={r.amount_minor} currency={r.currency} /></Link></td>
                  <td><When at={r.paid_at} /></td><td>{r.card_brand ? `${r.card_brand} •••• ${r.card_last4 ?? ""}` : "—"}</td>
                  <td>{r.status === "refunded" ? <St tone="good">Refunded</St> : <St tone="bad">Not refunded yet: check the provider</St>}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="check-circle" title="None in the last 30 days" />}
      </Card>
      <Card title="Failed checkouts, last 7 days" pad={false}>
        {d.failed.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col">Plan</th><th scope="col" className="num">Amount</th><th scope="col">When</th></tr></thead>
            <tbody>{d.failed.map((f) => {
              const p = who.get(f.user_id);
              return <tr key={f.id}><td><Who id={f.user_id} name={p?.display_name} email={p?.email} /></td><td>Pro {f.period === "year" ? "annual" : "monthly"} · {providerName(f.provider)}</td><td className="num"><Money minor={f.amount_minor} currency={f.currency} /></td><td><When at={f.created_at} /></td></tr>;
            })}</tbody>
          </table></div>
        ) : <Empty icon="check-circle" title="No failed checkouts" />}
      </Card>
    </main>
  );
}
