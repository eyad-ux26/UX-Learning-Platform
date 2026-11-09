import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { people } from "@/lib/admin/data/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { flagOn } from "@/lib/app-config";
import { Card, Empty, NoAccess, Note, PageHead, St, Tabs, When, Who, type Tone } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { extendTrial } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Free trials" };

const STATUS: Record<string, [Tone, string]> = { active: ["info", "Running"], converted: ["good", "Paid"], ended: ["off", "Ended"] };
type Row = { user_id: string; days: number; started_at: string; ends_at: string; extended_days: number; status: string; converted_at: string | null };

/** BIL-8: free trials, behind the `trials` flag. Support extends one with a reason. */
export default async function TrialsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "subs.view", "trials.extend")) return <NoAccess what="Free trials" roles="a billing or support role" />;
  const tab = ["active", "converted", "ended"].includes((await searchParams).tab ?? "") ? (await searchParams).tab! : "active";
  const db = createAdminClient();
  const [list, counts, on] = await Promise.all([
    db.from("trials").select("user_id, days, started_at, ends_at, extended_days, status, converted_at").eq("status", tab).order("ends_at", { ascending: tab === "active" }).limit(200),
    Promise.all(["active", "converted", "ended"].map(async (s) => [s, (await db.from("trials").select("user_id", { count: "exact", head: true }).eq("status", s)).count ?? 0] as const)),
    flagOn("trials"),
  ]);
  const rows = (list.data ?? []) as Row[];
  const who = await people(rows.map((r) => r.user_id));
  const n = Object.fromEntries(counts);
  const all = n.active + n.converted + n.ended;
  const can = allowed(ctx, "trials.extend");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Money" }, { label: "Free trials" }]} title="Free trials"
        sub={all ? `${all} trials so far · ${n.converted} paid after (${Math.round((n.converted / Math.max(1, n.converted + n.ended)) * 100)}% of finished trials)` : "No trials yet."} />
      {list.error ? <Note icon="warning">Migration 0062 is not in the database yet, so there are no trials.</Note>
        : !on ? <Note icon="info">Trials are off (Platform settings, then Feature flags). Nobody can start a new one; trials already running carry on.</Note> : null}
      <Tabs label="Trials" items={[["active", "Running"], ["converted", "Paid after"], ["ended", "Ended"]].map(([t, l]) => ({ href: `/admin/billing/trials?tab=${t}`, label: l, count: n[t], current: tab === t }))} />
      <Card label="Trials" pad={false}>
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col">Status</th><th scope="col">Started</th><th scope="col">Ends</th><th scope="col" className="num">Days</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{rows.map((r) => {
              const p = who.get(r.user_id);
              const [tone, label] = STATUS[r.status] ?? ["off", r.status];
              return (
                <tr key={r.user_id}>
                  <td><Link href={`/admin/learners/${r.user_id}`}><Who name={p?.display_name} email={p?.email} link={false} /></Link></td>
                  <td><St tone={tone}>{label}</St></td>
                  <td className="t-sm"><When at={r.started_at} /></td>
                  <td className="t-sm"><When at={r.converted_at ?? r.ends_at} rel /></td>
                  <td className="num">{r.days}{r.extended_days ? <span className="t-xs ink-2"> +{r.extended_days}</span> : null}</td>
                  <td style={{ textAlign: "end" }}>
                    {can && r.status !== "converted" && r.extended_days < 60 ? (
                      <Confirm action={extendTrial} small label="Extend" icon="clock-counter-clockwise" title="Extend this trial" hidden={[{ name: "user", value: r.user_id }]}
                        effects={[{ icon: "info", text: r.status === "ended" ? "Pro comes back for the extra days. Possible up to 14 days after the trial ended." : "The trial ends later. The reminder email moves with it." }]}>
                        <div className="a-field"><label htmlFor={`d-${r.user_id}`}>Extra days<span className="req" aria-hidden="true">*</span></label>
                          <select id={`d-${r.user_id}`} name="days" className="a-in" defaultValue="3">{[1, 2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>)}</select>
                          <span className="help">At most 60 extra days in all for one learner.</span></div>
                      </Confirm>
                    ) : null}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="clock-counter-clockwise" title={tab === "active" ? "No trials running" : "Nothing here yet"} />}
      </Card>
    </main>
  );
}
