import { requireAdmin, allowed } from "@/lib/admin/guard";
import { healthChecks, jobRuns } from "@/lib/admin/data/settings";
import { getAppConfig } from "@/lib/app-config";
import { Card, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "System health" };

const DAY = 86_400_000;

/**
 * SYS-1 and SYS-2: what the app depends on, and when each scheduled job last ran. Nothing here can send email to
 * learners: a job that emails people is never started by hand from the panel (it runs again on its schedule).
 */
export default async function HealthPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "health.view")) return <NoAccess what="System health" roles="a super admin, admin or analyst role" />;
  const [checks, jobs, cfg] = await Promise.all([healthChecks(), jobRuns(), getAppConfig()]);
  const now = Date.now();
  const late = (j: (typeof jobs)[number]) => !j.lastRun || now - new Date(j.lastRun).getTime() > (j.schedule.startsWith("Every 15") ? 3_600_000 : 1.5 * DAY);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Admin" }, { label: "System health" }]} title="System health" sub="The services the app needs, and the scheduled jobs. Checked when this page opens." />
      <Card label="Services" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Service</th><th scope="col">State</th><th scope="col">Detail</th></tr></thead>
          <tbody>{checks.map((c) => (
            <tr key={c.id}>
              <td className="w6">{c.label}</td>
              <td>{c.ok === true ? <St tone="good" icon="check-circle-fill">Working</St> : c.ok === false ? <St tone="bad" icon="warning">Problem</St> : <St tone="off" icon="info">Not set up</St>}</td>
              <td className="t-sm ink-2">{c.detail}</td>
            </tr>
          ))}
          <tr>
            <td className="w6">Panel settings</td>
            <td>{Object.keys(cfg.flags).length ? <St tone="good" icon="check-circle-fill">Read</St> : <St tone="off" icon="info">Defaults</St>}</td>
            <td className="t-sm ink-2">{Object.keys(cfg.flags).length} flags and {Object.keys(cfg.settings).length} settings, cached for a minute on each server</td>
          </tr></tbody>
        </table></div>
      </Card>
      <Card label="Scheduled jobs" title="Scheduled jobs" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Job</th><th scope="col">Runs</th><th scope="col">Last run</th><th scope="col">Result</th></tr></thead>
          <tbody>{jobs.map((j) => (
            <tr key={j.name}>
              <td style={{ maxWidth: 360 }}><b className="t-sm">{j.label}</b>{j.emailsLearners ? <span className="t-xs ink-2" style={{ display: "block" }}>Emails learners: runs only on its schedule</span> : null}</td>
              <td className="t-sm">{j.schedule}</td>
              <td className="t-sm">{j.lastRun ? <When at={j.lastRun} rel /> : <span className="ink-3">No run noted yet</span>}</td>
              <td>{j.lastOk === null ? <St tone="off">—</St> : !j.lastOk ? <St tone="bad" icon="warning">Failed</St> : late(j) ? <St tone="wait" icon="warning">Late</St> : <St tone="good" icon="check-circle-fill">Worked</St>}
                {j.lastDetail ? <span className="a-code t-xs" style={{ display: "block", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={j.lastDetail}>{j.lastDetail}</span> : null}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      <Note>Runs are noted from migration 0063 on and kept for 30 days. The Cloudflare dashboard (Workers, then uxgate-web, then Logs) keeps the full output of each run.</Note>
    </main>
  );
}
