import { allowed, requireAdmin } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { revenue } from "@/lib/admin/data/billing";
import { fmtMoney, REGION_LABEL, USD_RATES } from "@/lib/admin/format";
import { Card, Kpi, NoAccess, Note, PageHead } from "@/components/admin/ui";
import { ExportButton } from "@/components/admin/Download";
import { exportMonth } from "../actions";
import { providerName } from "../PaymentStatus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Revenue" };

const monthLabel = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const usd = (v: number) => fmtMoney(v, "USD");

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "revenue.view")) return <NoAccess what="Revenue" roles="a billing or analyst role" />;
  const sp = await searchParams;
  const now = new Date();
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? new Date(`${sp.m}-01T00:00:00Z`) : current;
  const d = await revenue(start);
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - i, 1)));
  const last = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1));
  const key = (x: Date) => x.toISOString().slice(0, 7);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Revenue" }]} title="Revenue" sub={`From verified provider events only. Comp access is never counted (${d.comp} learners have it now). USD at the panel’s fixed rate of ${USD_RATES.EGP.date}.`}
        actions={<form method="get" className="a-row" style={{ gap: 6 }}>
          <label className="t-sm ink-2" htmlFor="rev-m">Month</label>
          <select id="rev-m" name="m" className="a-in" defaultValue={key(start)} style={{ width: "auto", height: 32 }}>{months.map((m) => <option key={key(m)} value={key(m)}>{monthLabel(m)}{key(m) === key(current) ? " (to date)" : ""}</option>)}</select>
          <button className="a-btn sm" type="submit">Show</button>
        </form>} />
      <div className="a-kpis">
        <Kpi label="MRR now" value={usd(d.totals.mrr)} note={`${d.totals.paying} paying`} icon="chart-line-up" />
        <Kpi label="New MRR" value={usd(d.totals.newMrr)} note={monthLabel(start)} icon="plus" tone="up" />
        <Kpi label="Churned MRR" value={usd(d.totals.churned)} note={monthLabel(start)} icon="minus" tone="down" />
        <Kpi label="Paid" value={usd(d.totals.paid)} icon="credit-card" />
        <Kpi label="Refunds" value={usd(d.totals.refunds)} icon="arrow-u-up-left" />
        <Kpi label="Net before fees" value={usd(d.totals.net)} icon="equals" />
      </div>
      <Card title={`By region and provider, ${monthLabel(start)}`} pad={false} actions={<span className="t-xs ink-3">Net = paid − refunds. Provider fees are in the Paddle and Paymob statements.</span>}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Region price</th><th scope="col">Provider</th><th scope="col" className="num">Paying now</th><th scope="col" className="num">MRR</th><th scope="col" className="num">New MRR</th><th scope="col" className="num">Churned MRR</th><th scope="col" className="num">Paid</th><th scope="col" className="num">Refunds</th><th scope="col" className="num">Net</th></tr></thead>
          <tbody>{d.rows.length ? d.rows.map((r) => (
            <tr key={`${r.region}|${r.provider}`}>
              <td>{REGION_LABEL[r.region] ?? (r.region === "none" ? "No plan (refused)" : r.region)}</td><td>{providerName(r.provider)}</td>
              <td className="num">{r.paying}</td><td className="num">{usd(r.mrr)}</td><td className="num">{usd(r.newMrr)}</td><td className="num">{usd(r.churned)}</td>
              <td className="num">{usd(r.paid)}</td><td className="num">{usd(r.refunds)}</td><td className="num w6">{usd(r.net)}</td>
            </tr>
          )) : <tr><td colSpan={9} className="ink-2">No paid plans or payments yet.</td></tr>}</tbody>
        </table></div>
      </Card>
      <Note icon="info">Annual plans count as one twelfth a month. Paymob carries Egypt prices; Paddle carries the Gulf, other Arab countries and the rest of the world. Test-provider plans appear only on test hosts.</Note>
      {allowed(ctx, "billing.export") ? (
        <Card title="Monthly export for the accountant">
          <p className="t-sm">One row per payment and refund, in the original currency and in USD, with the rate date. Logged and marked with your email.</p>
          <div className="a-row" style={{ gap: 8, marginTop: 8 }}>
            <ExportButton action={exportMonth} label={`Download ${monthLabel(last)} (CSV)`} title={`Export ${monthLabel(last)}`} hidden={[{ name: "month", value: key(last) }]} fresh={isFresh(ctx)} note="Payment data for the accountant. A fresh authenticator code is needed." />
            {key(start) !== key(last) ? <ExportButton action={exportMonth} label={`Download ${monthLabel(start)} (CSV)`} title={`Export ${monthLabel(start)}`} hidden={[{ name: "month", value: key(start) }]} fresh={isFresh(ctx)} /> : null}
          </div>
        </Card>
      ) : null}
    </main>
  );
}
