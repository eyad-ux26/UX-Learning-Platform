import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { RANGES, REPORTS, report, reportReaders, savedReports, type ReportId } from "@/lib/admin/data/reports";
import { names } from "@/lib/admin/data/content";
import { Card, Empty, NoAccess, Note, PageHead, St, Tabs, When } from "@/components/admin/ui";
import { Confirm, Drawer } from "@/components/admin/forms";
import { ExportButton } from "@/components/admin/Download";
import { deleteSavedReport, exportReport, saveReport } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

/** RPT-1 to RPT-5: learning, growth, money and certificates, for a range, with saved and weekly views. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string; days?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "reports.view")) return <NoAccess what="Reports" roles="an analyst, marketing or admin role" />;
  const sp = await searchParams;
  const ids = (Object.keys(REPORTS) as ReportId[]).filter((k) => allowed(ctx, REPORTS[k].needs));
  const id = ids.includes(sp.r as ReportId) ? (sp.r as ReportId) : ids[0];
  const days = (RANGES as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;
  const [t, saved] = await Promise.all([report(id, days), savedReports()]);
  const canSave = allowed(ctx, "reports.schedule");
  // Only members whose roles allow this report can be picked (the Money report needs revenue.view).
  const team = canSave ? await reportReaders(id) : [];
  const who = await names(saved.rows.map((s) => s.created_by).filter(Boolean) as string[]);
  const fresh = isFresh(ctx);
  const href = (r: string, d: number) => `/admin/reports?r=${r}&days=${d}`;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Grow" }, { label: "Reports" }]} title="Reports" sub={REPORTS[id].sub}
        actions={<>
          <ExportButton action={exportReport} label="Download CSV" title={`Download ${REPORTS[id].label.toLowerCase()} report`} fresh={fresh} hidden={[{ name: "report", value: id }, { name: "range", value: String(days) }]} note="Counts only: no names or emails. The download is kept in the audit log." />
          {canSave ? (
            <Drawer label="Save this view" icon="star" title="Save this report" action={saveReport} submit="Save">
              <input type="hidden" name="report" value={id} /><input type="hidden" name="range" value={days} />
              <div className="a-field"><label htmlFor="sr-name">Name<span className="req" aria-hidden="true">*</span></label><input id="sr-name" name="name" className="a-in" required minLength={3} maxLength={80} defaultValue={`${REPORTS[id].label}, last ${days} days`} /></div>
              <label className="a-row t-sm" style={{ gap: 8 }}><input type="checkbox" name="weekly" value="1" />Email it every Monday morning</label>
              <fieldset className="a-field"><legend className="t-sm">Send to (team members only)</legend>
                <div className="a-stack sm">{team.map((m) => <label key={m.email as string} className="a-row t-sm" style={{ gap: 8 }}><input type="checkbox" name="to" value={m.email as string} defaultChecked={m.email === ctx.email} />{(m.display_name as string) || (m.email as string)} <span className="ink-3">{m.email as string}</span></label>)}</div>
              </fieldset>
            </Drawer>
          ) : null}
        </>} />
      <Tabs label="Report" items={ids.map((k) => ({ href: href(k, days), label: REPORTS[k].label, current: k === id }))} />
      <div className="a-seg" role="group" aria-label="Range">{RANGES.map((d) => <Link key={d} href={href(id, d)} aria-current={d === days ? "true" : undefined} className="a-btn sm" style={d === days ? { background: "var(--surface-2)" } : undefined}>Last {d} days</Link>)}</div>
      {!t.ready ? <Note icon="warning">Migration 0063 is not in the database yet, so reports are empty.</Note> : null}
      <Card label={REPORTS[id].label} pad={false}>
        {t.rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr>{t.columns.map((c, i) => <th key={c} scope="col" className={i ? "num" : undefined}>{c}</th>)}</tr></thead>
            <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className={j ? "num" : "w6"}>{typeof v === "number" ? v.toLocaleString("en") : v}</td>)}</tr>)}</tbody>
            {t.total ? <tfoot><tr>{t.total.map((v, j) => <td key={j} className={j ? "num w6" : "w6"}>{typeof v === "number" ? v.toLocaleString("en") : v}</td>)}</tr></tfoot> : null}
          </table></div>
        ) : <Empty icon="chart-bar" title="Nothing in this range yet" />}
      </Card>
      {t.note ? <p className="t-xs ink-3">{t.note}</p> : null}
      <Card label="Saved reports" title="Saved reports" pad={false}>
        {saved.rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Name</th><th scope="col">Report</th><th scope="col">Email</th><th scope="col">Saved by</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{saved.rows.map((s) => (
              <tr key={s.id}>
                <td><Link className="w6" href={href(s.report, s.range_days)}>{s.name}</Link></td>
                <td className="t-sm">{REPORTS[s.report]?.label ?? s.report}, {s.range_days} days</td>
                <td className="t-sm">{s.weekly ? <><St tone="info" icon="envelope-simple">Mondays</St><span className="t-xs ink-2" style={{ display: "block" }}>{s.recipients.length} {s.recipients.length === 1 ? "person" : "people"}{s.last_sent_at ? <> · last <When at={s.last_sent_at} rel /></> : null}</span></> : <span className="ink-3">No</span>}</td>
                <td className="t-sm">{s.created_by ? who.get(s.created_by) ?? "A team member" : "—"}</td>
                <td style={{ textAlign: "end" }}>{canSave ? <Confirm action={deleteSavedReport} small ghost label="Remove" icon="x" title={`Remove "${s.name}"?`} reason={false} hidden={[{ name: "id", value: s.id }]} effects={[{ icon: "envelope-simple", text: s.weekly ? "The Monday email stops." : "Only the saved view goes." }]} /> : null}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <Empty icon="star" title="No saved reports">Save a view to come back to it, or to email it to the team every Monday.</Empty>}
      </Card>
    </main>
  );
}
