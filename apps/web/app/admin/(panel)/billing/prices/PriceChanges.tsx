import { allowed, type AdminCtx } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICES, type Region } from "@/lib/billing/pricing";
import { fmtMoney, REGION_LABEL } from "@/lib/admin/format";
import { Card, Empty, St, When, type Tone } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/forms";
import { requestPriceChange } from "./price-actions";

const STATUS: Record<string, [Tone, string]> = { waiting: ["wait", "Waiting for approval"], approved: ["good", "Approved: to put in place"], declined: ["off", "Declined"], cancelled: ["off", "Cancelled"], failed: ["bad", "Failed"] };

/** Price change requests (Phase 2) on the Prices page: ask for one, and see what is waiting or approved. */
export async function PriceChanges({ ctx }: { ctx: AdminCtx }) {
  const { data } = await createAdminClient().from("admin_approvals").select("id, title, detail, status, created_at, decided_at, note").eq("kind", "price").order("created_at", { ascending: false }).limit(20);
  const rows = (data ?? []) as { id: string; title: string; detail: { starts?: string }; status: string; created_at: string; decided_at: string | null; note: string | null }[];
  const can = allowed(ctx, "prices.change");
  return (
    <Card label="Price changes" title="Price changes" pad={false}
      actions={can ? (
        <Drawer label="Ask for a price change" icon="receipt" title="Ask for a price change" action={requestPriceChange} submit="Send for approval" fresh={isFresh(ctx)}>
          <p className="t-sm ink-2">A second person approves it. Then the new provider price is created and the app&apos;s price list updated together. People already subscribed keep their price.</p>
          <div className="a-row" style={{ gap: 8 }}>
            <div className="a-field a-grow"><label htmlFor="pc-r">Region</label><select id="pc-r" name="region" className="a-in">{(Object.keys(PRICES) as Region[]).map((r) => <option key={r} value={r}>{REGION_LABEL[r]} ({PRICES[r].currency})</option>)}</select></div>
            <div className="a-field a-grow"><label htmlFor="pc-p">Plan</label><select id="pc-p" name="period" className="a-in"><option value="month">Monthly</option><option value="year">Annual</option></select></div>
          </div>
          <div className="a-row" style={{ gap: 8 }}>
            <div className="a-field a-grow"><label htmlFor="pc-a">New price<span className="req" aria-hidden="true">*</span></label><input id="pc-a" name="amount" className="a-in" inputMode="decimal" required placeholder="7.50" /><span className="help">In the region&apos;s currency.</span></div>
            <div className="a-field a-grow"><label htmlFor="pc-f">From<span className="req" aria-hidden="true">*</span></label><input id="pc-f" name="from" type="date" className="a-in" required /></div>
          </div>
          <div className="a-field"><label htmlFor="pc-why">Reason (saved in the audit log)<span className="req" aria-hidden="true">*</span></label><textarea id="pc-why" name="reason" className="a-ta" rows={2} required minLength={3} maxLength={500} /></div>
        </Drawer>
      ) : null}>
      {rows.length ? (
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Change</th><th scope="col">From</th><th scope="col">Status</th><th scope="col">Asked</th></tr></thead>
          <tbody>{rows.map((r) => {
            const [tone, label] = STATUS[r.status] ?? ["off", r.status];
            return <tr key={r.id}><td className="t-sm">{r.title}</td><td className="t-sm">{r.detail.starts ?? "—"}</td><td><St tone={tone}>{label}</St>{r.note ? <span className="t-xs ink-2" style={{ display: "block" }}>{r.note}</span> : null}</td><td className="t-sm"><When at={r.created_at} rel /></td></tr>;
          })}</tbody>
        </table></div>
      ) : <Empty icon="receipt" title="No price changes asked for" />}
    </Card>
  );
}
