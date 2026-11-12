import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { payments, people, PAGE, testView } from "@/lib/admin/data/billing";
import { USD_RATES } from "@/lib/admin/format";
import { Card, Empty, Filters, Id, Money, NoAccess, PageHead, Pager, When, Who, withQuery } from "@/components/admin/ui";
import { PaymentStatus, providerName } from "../PaymentStatus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "payments.view")) return <NoAccess what="Payments" roles="a billing or support role" />;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const days = sp.days === "all" ? undefined : Number(sp.days) || 30;
  const test = testView(sp.test);
  const { rows, total } = await payments({ q: sp.q?.trim() || undefined, provider: sp.provider, status: sp.status, kind: sp.kind, days, page, test });
  const who = await people(rows.map((r) => r.user_id));
  const base = { q: sp.q, provider: sp.provider, status: sp.status, kind: sp.kind, days: sp.days, test: sp.test };
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Payments" }]} title="Payments" sub="Every charge and refund from Paddle and Paymob, as their verified webhooks report them. Test payments (test provider, Paddle sandbox) are hidden unless you ask for them; a receipt or payment id always finds them." />
      <Card label="Payments" pad={false}>
        <Filters action="/admin/billing/payments" q={sp.q} placeholder="Payment id, receipt number, learner or email" selects={[
          { name: "kind", label: "Type", value: sp.kind, options: [["first", "First payment"], ["renewal", "Renewal"]] },
          { name: "provider", label: "Provider", value: sp.provider, options: [["paddle", "Paddle"], ["paymob", "Paymob"], ["mock", "Test provider"]] },
          { name: "status", label: "Status", value: sp.status, options: [["paid", "Paid"], ["processing", "Refund processing"], ["refunded", "Refunded"]] },
          { name: "days", label: "Date", value: sp.days, options: [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["all", "Any time"]] },
          { name: "test", label: "Test payments", value: sp.test, options: [["show", "Show test payments"], ["only", "Only test payments"]], empty: "Real payments only" },
        ]} />
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">When</th><th scope="col">Learner</th><th scope="col">Type</th><th scope="col" className="num">Amount</th><th scope="col">Card</th><th scope="col">Status</th></tr></thead>
            <tbody>{rows.map((r) => {
              const p = who.get(r.user_id);
              return (
                <tr key={r.id}>
                  <td><Link href={`/admin/billing/payments/${r.id}`}><When at={r.paid_at} /></Link></td>
                  <td><Who id={r.user_id} name={p?.display_name} email={p?.email} sub={<Id>{r.receipt_no}</Id>} /></td>
                  <td>{r.kind === "first" ? "First payment" : "Renewal"} · {r.period === "year" ? "annual" : "monthly"}<span className="t-xs ink-3" style={{ display: "block" }}>{providerName(r.provider)}</span></td>
                  <td className="num"><Money minor={r.amount_minor} currency={r.currency} /></td>
                  <td>{r.card_brand ? `${r.card_brand} •••• ${r.card_last4 ?? ""}` : r.pay_method === "wallet" ? "Wallet" : <span className="ink-3">—</span>}</td>
                  <td><PaymentStatus p={r} /></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="credit-card" title="No payments match">Try a longer date range or clear the filters.</Empty>}
        <div className="a-toolbar t-xs ink-3">USD at the panel’s fixed rate · 1 USD = {USD_RATES.EGP.perUsd} EGP ({USD_RATES.EGP.date}). Platform settings (Phase 2) will update it.</div>
        <Pager page={page} more={page * PAGE < total} total={total} href={(n) => withQuery("/admin/billing/payments", base, { page: n })} />
      </Card>
    </main>
  );
}
