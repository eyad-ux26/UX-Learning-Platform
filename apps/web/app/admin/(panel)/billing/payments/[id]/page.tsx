import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { payment, people } from "@/lib/admin/data/billing";
import { needsSecondPerson, refundLimitUsdMinor, refundRule } from "@/lib/admin/data/refunds";
import { REGION_LABEL, toUsd } from "@/lib/admin/format";
import { Card, Id, KV, Money, NoAccess, Note, PageHead, St, When, Who } from "@/components/admin/ui";
import { PaymentStatus, providerName } from "../../PaymentStatus";
import { RefundButtons } from "../../RefundButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment" };

const dash = (provider: string, id: string) =>
  provider === "paddle" ? `https://vendors.paddle.com/transactions-v2/${encodeURIComponent(id)}` : provider === "paymob" ? "https://accept.paymob.com/portal2/en/transactions" : null;

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "payments.view")) return <NoAccess what="Payments" roles="a billing or support role" />;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const d = await payment(id);
  if (!d) notFound();
  const { pay, sub, req, ticket, events } = d;
  const p = (await people([pay.user_id])).get(pay.user_id);
  const limit = await refundLimitUsdMinor();
  const blocked = needsSecondPerson(ctx, pay, limit);
  const usd = toUsd(pay.amount_minor, pay.currency);
  const owner = ctx.roles.includes("super_admin");
  const link = dash(pay.provider, pay.provider_payment_id);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { href: "/admin/billing/payments", label: "Payments" }, { label: pay.receipt_no }]}
        title={<Money minor={pay.amount_minor} currency={pay.currency} />} sub={<PaymentStatus p={pay} requested={req?.status === "waiting"} />}
        actions={d.approval && !pay.refund_sent_at && pay.status !== "refunded"
          ? <Link href="/admin/team/approvals" className="a-btn sm">Refund waiting for approval</Link>
          : <RefundButtons pay={pay} requestId={req?.status === "waiting" ? req.id : null} blocked={blocked} fresh={isFresh(ctx)} overLimit={!usd || usd.minor > limit}
            canDecide={allowed(ctx, "refunds.approve", "refunds.approve_any")} ar={p?.locale === "ar"} />} />
      <div className="a-split">
        <div className="a-main-col">
          <Card title="Payment">
            <KV rows={[
              ["Learner", <Who key="w" id={pay.user_id} name={p?.display_name} email={p?.email} />],
              ["Plan", `Pro ${pay.period === "year" ? "annual" : "monthly"} · ${pay.kind === "first" ? "first payment" : "renewal"}${sub ? ` · ${REGION_LABEL[sub.region] ?? sub.region} price` : ""}`],
              ["Provider", providerName(pay.provider)],
              ["Provider id", <Id key="i">{pay.provider_payment_id}</Id>],
              ["Receipt", <Id key="r">{pay.receipt_no}</Id>],
              ["Card", pay.card_brand ? `${pay.card_brand} •••• ${pay.card_last4 ?? ""}` : pay.pay_method === "wallet" ? "Mobile wallet" : null],
              ["Billing country", d.country],
              ["Paid", <When key="p" at={pay.paid_at} />],
              ["7-day rule", refundRule(pay.paid_at).text],
              ["Refund sent", pay.refund_sent_at ? <When at={pay.refund_sent_at} /> : null],
              ["Refunded", pay.refunded_at ? <When at={pay.refunded_at} /> : null],
              ["Fees", <span key="f" className="ink-3">In the {providerName(pay.provider)} statement</span>],
            ]} />
            {owner && link ? <p className="t-sm" style={{ marginTop: 10 }}><a href={link} target="_blank" rel="noreferrer noopener">Open in {providerName(pay.provider)}</a> <span className="t-xs ink-3">(owners only)</span></p> : null}
          </Card>
          <Card title="Webhook events" pad={false}>
            {events.length ? (
              <div className="a-tbl-wrap"><table className="a-tbl">
                <thead><tr><th scope="col">Event</th><th scope="col">Received</th><th scope="col">State</th></tr></thead>
                <tbody>{events.map((e) => (
                  <tr key={e.id}><td className="a-id">{e.event_type}</td><td><When at={e.received_at} /></td>
                    <td>{e.processed_at ? <St tone="good">Applied</St> : e.error ? <St tone="bad">{e.error.slice(0, 80)}</St> : <St tone="wait">Waiting</St>}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <div className="a-card-b t-sm ink-2">No events mention this payment id.</div>}
          </Card>
          <Note icon="lock-simple">Payment state only changes from verified provider webhooks or the provider API. There is no “mark as paid”.</Note>
        </div>
        <aside className="a-rail" aria-label="Linked records">
          <div className="a-rail-s"><b className="t-sm">Linked</b>
            {sub ? <Link href={`/admin/billing/subscriptions?q=${encodeURIComponent(p?.email ?? "")}`} className="t-sm">Subscription · {sub.status} · ends <When at={sub.current_period_end} /></Link> : <span className="t-sm ink-2">No plan: this payment bought nothing and was refused.</span>}
            {req ? <Link href="/admin/billing/refunds" className="t-sm">Refund request · {req.status}{blocked && req.status === "waiting" ? ` · ${blocked}` : ""}</Link> : null}
            {ticket ? <Link href={`/admin/support/${ticket.id}`} className="t-sm">Ticket #{ticket.id}</Link> : null}
          </div>
          {req ? <div className="a-rail-s"><b className="t-sm">Why they asked</b><p className="t-sm" dir="auto">{req.reason}</p><span className="t-xs ink-3">Asked <When at={req.created_at} /></span></div> : null}
        </aside>
      </div>
    </main>
  );
}
