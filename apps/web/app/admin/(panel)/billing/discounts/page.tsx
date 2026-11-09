import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { codeState, discountCodes, people } from "@/lib/admin/data/billing";
import { DISCOUNTS, PRICES, discounted } from "@/lib/billing/pricing";
import { fmtMoney, REGION_LABEL } from "@/lib/admin/format";
import { Card, Empty, I, Id, NoAccess, Note, PageHead, St, When, type Tone } from "@/components/admin/ui";
import { Confirm, Drawer } from "@/components/admin/forms";
import { createCode, setCodeState } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discount codes" };

const STATE: Record<string, [Tone, string]> = { active: ["good", "Active"], scheduled: ["info", "Scheduled"], paused: ["off", "Paused"], ended: ["off", "Ended"] };

export default async function DiscountsPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "discounts.view")) return <NoAccess what="Discount codes" roles="a billing or marketing role" />;
  const codes = await discountCodes();
  const by = await people(codes.map((c) => c.created_by));
  const canEdit = allowed(ctx, "discounts.edit");
  const counts = codes.reduce<Record<string, number>>((t, c) => ({ ...t, [codeState(c)]: (t[codeState(c)] ?? 0) + 1 }), {});
  const f = DISCOUNTS.founding.percent;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Discounts" }]} title="Discount codes" sub="Codes learners type at checkout. Each code is checked on the server before the provider charges."
        actions={<>
          {allowed(ctx, "students.review") ? <Link href="/admin/billing/discounts/students" className="a-btn"><I n="student" />Student checks</Link> : null}
          {allowed(ctx, "discounts.create") ? (
            <Drawer label="Create code" title="Create a discount code" icon="plus" primary action={createCode} submit="Create code">
              <Note>Every code is a name for the founding offer: {f}% off the first year of Pro annual, then the normal price. Paddle has this discount set up, so a new code needs no change there. Other offers (a different percent, a fixed amount) need a new provider discount first and come with Platform settings in Phase 2.</Note>
              <div className="a-field"><label htmlFor="dc-code">Code<span className="req" aria-hidden="true">*</span></label><input id="dc-code" name="code" className="a-in" required pattern="[A-Za-z0-9]{3,24}" placeholder="CAIROUX" style={{ textTransform: "uppercase" }} />
                <span className="help">Letters and numbers only. Learners can type it in any case.</span></div>
              <div className="a-field"><label htmlFor="dc-region">Region</label>
                <select id="dc-region" name="region" className="a-in"><option value="">Every region</option>{Object.entries(REGION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div className="a-field"><label htmlFor="dc-max">Max uses</label><input id="dc-max" name="max_uses" type="number" min={1} max={100000} className="a-in" placeholder="No limit" /></div>
              <div className="a-field"><label htmlFor="dc-ends">Ends on</label><input id="dc-ends" name="ends" type="date" className="a-in" /></div>
              <div className="a-field"><label htmlFor="dc-note">Note for the team</label><input id="dc-note" name="note" className="a-in" maxLength={300} placeholder="Where it was shared" /></div>
              <div className="a-field"><span className="t-sm w6">What learners pay, first year</span>
                <ul className="t-sm" style={{ margin: 0, paddingInlineStart: 18 }}>
                  {(["eg", "gulf", "arab", "world"] as const).map((r) => <li key={r}>Pro annual · {REGION_LABEL[r]}: <s className="ink-3">{fmtMoney(PRICES[r].year, PRICES[r].currency)}</s> {fmtMoney(discounted(PRICES[r].year, f, PRICES[r].currency), PRICES[r].currency)}</li>)}
                </ul></div>
            </Drawer>
          ) : null}
        </>} />
      <Card title="Built-in offers" actions={<span className="t-xs ink-3">One discount per payment. When several fit, the biggest wins.</span>}>
        <div className="a-kpis">
          <div className="a-kpi"><span className="k">Student</span><span className="t-big">{DISCOUNTS.student.percent}% off</span><span className="t-xs ink-2">Monthly or annual, while the student check is valid (a year). A university email, or a check by the team.</span></div>
          <div className="a-kpi"><span className="k">Welcome back</span><span className="t-big">{DISCOUNTS.welcome_back.percent}% off</span><span className="t-xs ink-2">Annual only, for 2 years, when Pro ended 60 days ago or more.</span></div>
          <div className="a-kpi"><span className="k">FOUNDING code</span><span className="t-big">{f}% off</span><span className="t-xs ink-2">Annual only, the first year. Then the normal price.</span></div>
        </div>
      </Card>
      <Card label="Codes" pad={false}>
        <div className="a-toolbar t-sm ink-2">{Object.entries(STATE).map(([k, [, l]]) => `${l} ${counts[k] ?? 0}`).join(" · ")}</div>
        {codes.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Code</th><th scope="col">Discount</th><th scope="col">Regions</th><th scope="col">Uses</th><th scope="col">Ends</th><th scope="col">Revenue with code</th><th scope="col">Status</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{codes.map((c) => {
              const st = codeState(c);
              const [tone, label] = STATE[st]!;
              return (
                <tr key={c.code}>
                  <td><Id>{c.code}</Id><span className="t-xs ink-3" style={{ display: "block" }}>{c.created_by ? by.get(c.created_by)?.display_name ?? "Team" : "Built in"}{c.note ? ` · ${c.note}` : ""}</span></td>
                  <td>{c.percent}% · {c.period === "year" ? "annual" : c.period === "month" ? "monthly" : "any plan"}{c.first_period_only ? ", first period" : ""}</td>
                  <td>{c.region ? REGION_LABEL[c.region] : "All"}</td>
                  <td className="num">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                  <td>{c.ends_at ? <When at={c.ends_at} /> : <span className="ink-3">No end</span>}</td>
                  <td className="num">{Object.entries(c.revenue).map(([cur, v]) => fmtMoney(Number(v), cur)).join(" · ") || "—"}</td>
                  <td><St tone={tone}>{label}</St></td>
                  <td>{canEdit && st !== "ended" ? (
                    <span className="a-row" style={{ gap: 4 }}>
                      <Confirm action={setCodeState} label={c.active ? "Pause" : "Resume"} title={`${c.active ? "Pause" : "Resume"} ${c.code}?`} small ghost hidden={[{ name: "code", value: c.code }, { name: "to", value: c.active ? "pause" : "resume" }]}
                        effects={[{ icon: c.active ? "pause-circle" : "play", text: c.active ? "Checkout stops accepting it. Plans already paid keep their price." : "Checkout accepts it again." }]} />
                      <Confirm action={setCodeState} label="End" title={`End ${c.code} for good?`} small ghost danger hidden={[{ name: "code", value: c.code }, { name: "to", value: "end" }]} typed={c.code}
                        effects={[{ icon: "minus-circle", text: "It stops working now and cannot be turned back on. Plans already paid keep their price." }]} />
                    </span>
                  ) : null}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="tag" title="No codes yet" />}
      </Card>
      <p className="t-xs ink-3">Marketing can create codes; billing managers, admins and super admins can also pause and end them. A code never changes a live price.</p>
    </main>
  );
}
