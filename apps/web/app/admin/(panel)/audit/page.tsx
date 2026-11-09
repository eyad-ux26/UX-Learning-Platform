import Link from "next/link";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { auditAreas } from "@/lib/admin/permissions";
import { auditPage, targetHref, type AuditFilter } from "@/lib/admin/data/audit";
import { Card, Empty, NoAccess, PageHead, Pager, When } from "@/components/admin/ui";
import { ExportButton } from "@/components/admin/Download";
import { exportAudit } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

type SP = Record<string, string | undefined>;

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "audit.view", "audit.area_support", "audit.area_billing", "audit.area_content")) return <NoAccess what="The audit log" roles="the Admin, Analyst or a lead role" />;
  const sp = await searchParams;
  const f: AuditFilter = { actor: sp.actor, action: sp.action, area: sp.area, targetType: sp.type, targetId: sp.target, from: sp.from, to: sp.to, session: sp.session };
  const page = Math.max(1, Number(sp.page) || 1);
  const areas = auditAreas(ctx.perms);
  const { rows, more, total } = await auditPage(f, areas, page);
  const qs = (p: number) => `/admin/audit?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "page")), page: String(p) } as Record<string, string>)}`;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Audit log" }]} title="Audit log" sub={`Every admin change, sign-in, reveal, export and view as learner. Append-only: nobody can change or delete an entry. Kept for at least 2 years.${areas === "all" ? "" : " You see the areas your roles cover."}`}
        actions={allowed(ctx, "audit.export") ? <ExportButton action={exportAudit} label="Export CSV" title="Export the audit log" fresh={isFresh(ctx)} hidden={[{ name: "filter", value: JSON.stringify(f) }]} note="Exports the entries that match your filters, up to 10,000. The file names you as the exporter." /> : null} />
      <Card label="Filters">
        <form className="a-row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="a-field" style={{ flex: "1 1 180px" }}><label htmlFor="f-actor">Admin (email)</label><input id="f-actor" name="actor" className="a-in" defaultValue={sp.actor} /></div>
          <div className="a-field" style={{ flex: "1 1 160px" }}><label htmlFor="f-action">Action starts with</label><input id="f-action" name="action" className="a-in" placeholder="team. or learners.reveal" defaultValue={sp.action} /></div>
          <div className="a-field" style={{ flex: "0 1 140px" }}><label htmlFor="f-area">Area</label>
            <select id="f-area" name="area" className="a-in" defaultValue={sp.area ?? ""}><option value="">All</option>{["auth", "team", "learners", "support", "appeals", "billing", "refunds", "discounts", "certificates", "approvals", "audit"].map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="a-field" style={{ flex: "1 1 200px" }}><label htmlFor="f-target">Target id</label><input id="f-target" name="target" className="a-in" defaultValue={sp.target} /></div>
          <div className="a-field" style={{ flex: "0 1 150px" }}><label htmlFor="f-from">From</label><input id="f-from" name="from" type="date" className="a-in" defaultValue={sp.from} /></div>
          <div className="a-field" style={{ flex: "0 1 150px" }}><label htmlFor="f-to">Before</label><input id="f-to" name="to" type="date" className="a-in" defaultValue={sp.to} /></div>
          {sp.session ? <input type="hidden" name="session" value={sp.session} /> : null}
          <button className="a-btn" type="submit"><span className="i i-funnel" aria-hidden="true" />Filter</button>
          <Link className="a-btn ghost" href="/admin/audit">Clear</Link>
        </form>
      </Card>
      <Card label="Entries" pad={false}>
        {rows.length === 0 ? <Empty icon="clock-counter-clockwise" title="No entries match">Change the filters or clear them.</Empty> : (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Time</th><th scope="col">Admin</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Reason</th><th scope="col">Details</th></tr></thead>
            <tbody>{rows.map((r) => {
              const href = targetHref(r.target_type, r.target_id);
              return (
                <tr key={r.id}>
                  <td className="t-sm" style={{ whiteSpace: "nowrap" }}><When at={r.at} /></td>
                  <td className="t-sm">{r.actor_email ?? <span className="ink-3">System</span>}<span className="t-xs ink-3" style={{ display: "block" }}>{r.actor_roles.join(", ")}</span></td>
                  <td><span className="a-id t-xs">{r.action}</span></td>
                  <td className="t-sm">{href ? <Link href={href}>{r.target_label ?? r.target_id}</Link> : r.target_label ?? r.target_id ?? <span className="ink-3">—</span>}
                    {r.target_type && r.target_id ? <Link className="t-xs" style={{ display: "block" }} href={`/admin/audit?type=${r.target_type}&target=${encodeURIComponent(r.target_id)}`}>Same target history</Link> : null}</td>
                  <td className="t-sm">{r.reason ?? <span className="ink-3">—</span>}</td>
                  <td className="t-sm">
                    <details><summary>Before, after, device</summary>
                      <div className="a-stack sm" style={{ marginTop: 6, minWidth: 260 }}>
                        {r.before !== null ? <><span className="t-over">Before</span><pre className="a-pre">{JSON.stringify(r.before, null, 2)}</pre></> : null}
                        {r.after !== null ? <><span className="t-over">After</span><pre className="a-pre">{JSON.stringify(r.after, null, 2)}</pre></> : null}
                        <span className="t-xs ink-2">IP {r.ip ?? "—"} · {r.user_agent ?? "—"}</span>
                        {r.session_id ? <Link className="t-xs" href={`/admin/audit?session=${r.session_id}`}>The whole session</Link> : null}
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
        <Pager page={page} more={more} href={qs} total={total} />
      </Card>
    </main>
  );
}
