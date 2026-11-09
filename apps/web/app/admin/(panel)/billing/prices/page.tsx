import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { PRICES, GULF, ARAB, perMonth, type Region } from "@/lib/billing/pricing";
import { fmtMoney, REGION_LABEL, toUsd } from "@/lib/admin/format";
import { Card, Id, NoAccess, Note, PageHead } from "@/components/admin/ui";
import { PriceChanges } from "./PriceChanges";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prices and plans" };

const WHO: Record<Region, string> = {
  eg: "Egypt", gulf: `Gulf: ${GULF.join(", ")}`, arab: `Other Arab countries: ${ARAB.join(", ")}`, world: "Everyone else, and unknown countries",
};

export default async function PricesPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "prices.view")) return <NoAccess what="Prices and plans" roles="a billing role" />;
  const env = (k: string) => process.env[k] || null;
  const rows = (["eg", "gulf", "arab", "world"] as Region[]).flatMap((r) => (["month", "year"] as const).map((period) => {
    const p = PRICES[r];
    const amount = p[period];
    const monthly = period === "year" ? (p.currency === "EGP" ? perMonth(r) : Math.round(amount / 12)) : amount;
    return { r, period, amount, currency: p.currency, usd: toUsd(monthly, p.currency), pid: r === "eg" ? null : env(`PADDLE_PRICE_${r.toUpperCase()}_${period.toUpperCase()}`) };
  }));
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Prices and plans" }]} title="Prices and plans" sub="What each region pays today, and the provider price behind it." />
      <Note icon="lock-simple">Prices are never edited in place. A price change needs a second person to approve it and creates a new provider price; people already subscribed keep their price.</Note>
      <Card label="Prices" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Region</th><th scope="col">Who gets it</th><th scope="col">Plan</th><th scope="col" className="num">Price</th><th scope="col" className="num">≈ USD a month</th><th scope="col">Provider</th><th scope="col">Provider price</th></tr></thead>
          <tbody>{rows.map((x) => (
            <tr key={`${x.r}-${x.period}`}>
              <td className="w6">{REGION_LABEL[x.r]}</td><td className="t-sm" style={{ maxWidth: 260 }}>{WHO[x.r]}</td>
              <td>Pro {x.period === "year" ? "annual" : "monthly"}</td>
              <td className="num">{fmtMoney(x.amount, x.currency)}</td>
              <td className="num">{x.usd ? fmtMoney(x.usd.minor, "USD") : "—"}</td>
              <td>{x.r === "eg" ? "Paymob" : "Paddle"}</td>
              <td>{x.r === "eg" ? <span className="t-sm ink-2">Amount set on our server</span> : x.pid ? <Id>{x.pid}</Id> : <span className="t-sm ink-3">Not set on this server</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      <PriceChanges ctx={ctx} />
      <div className="a-kpis">
        <Card title="How region is chosen"><p className="t-sm">By the country we see at checkout. An unknown country pays the Rest of the world price, never Egypt’s. An Egypt price paid with a card from abroad is refunded and offered at the international price.</p><Link className="t-sm" href="/admin/billing/problems">See payments that bought nothing</Link></Card>
        <Card title="Comp access"><p className="t-sm">Free Pro given by the team. It never charges, has an end date and is counted apart from revenue.</p><Link className="t-sm" href="/admin/billing/subscriptions?tab=comp">See comp access</Link></Card>
        <Card title="Refund rule"><p className="t-sm">Full refund within 7 days of a charge. Support agents can approve up to the limit in Support settings; anything else needs a second person.</p><Link className="t-sm" href="/admin/billing/refunds">Open refunds</Link></Card>
      </div>
    </main>
  );
}
