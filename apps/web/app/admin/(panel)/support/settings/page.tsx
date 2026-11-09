import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { CATEGORY_LABEL, CHANNEL_LABEL } from "@/lib/admin/data/support";
import { fmtDuration } from "@/lib/admin/format";
import { Card, Kpi, NoAccess, Note, PageHead, Tabs } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/forms";
import { saveSupportSettings } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support performance and settings" };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

export default async function SupportSettingsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "support.settings", "reports.view")) return <NoAccess what="Support performance and settings" roles="the Support lead role" />;
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const db = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [{ data: cfg }, { data: tickets }, { data: members }] = await Promise.all([
    db.from("support_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("support_tickets").select("category, channel, language, created_at, first_replied_at, first_reply_due, resolved_at, satisfaction").gte("created_at", since).limit(20000),
    db.from("admin_members").select("user_id, email, display_name").eq("status", "active"),
  ]);
  const T = tickets ?? [];
  const firsts = T.filter((t) => t.first_replied_at).map((t) => (new Date(t.first_replied_at!).getTime() - new Date(t.created_at).getTime()) / 1000);
  const resolves = T.filter((t) => t.resolved_at).map((t) => (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 1000);
  const withDue = T.filter((t) => t.first_reply_due && (t.first_replied_at || new Date(t.first_reply_due).getTime() < Date.now()));
  const met = withDue.filter((t) => t.first_replied_at && new Date(t.first_replied_at).getTime() <= new Date(t.first_reply_due!).getTime()).length;
  const rated = T.filter((t) => t.satisfaction);
  const good = rated.filter((t) => t.satisfaction === "good").length;
  const byCat = new Map<string, Record<string, number>>();
  for (const t of T) {
    const r = byCat.get(t.category) ?? {};
    r[t.channel] = (r[t.channel] ?? 0) + 1;
    byCat.set(t.category, r);
  }
  const top = [...byCat.entries()].map(([c, r]) => [c, Object.values(r).reduce((a, b) => a + b, 0)] as const).sort((a, b) => b[1] - a[1])[0];
  const channels = Object.keys(CHANNEL_LABEL);
  const edit = allowed(ctx, "support.settings");
  const sla = (cfg?.sla ?? {}) as Record<string, { first: number; resolve: number }>;
  const hours = (cfg?.hours ?? {}) as { ar?: { days: number[]; start: number; end: number }; en?: { days: number[]; start: number; end: number } };
  const cats = (cfg?.category_assignees ?? {}) as Record<string, string>;
  const survey = (cfg?.survey_text ?? {}) as { en?: string; ar?: string };
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/support", label: "Support inbox" }, { label: "Performance and settings" }]} title="Support performance and settings" />
      <Tabs label="Period" items={[7, 30, 90].map((d) => ({ href: `/admin/support/settings?days=${d}`, label: `${d} days`, current: d === days }))} />
      <div className="a-kpis">
        <Kpi label="Tickets" value={T.length} note={T.length ? `${Math.round((T.filter((t) => t.language === "ar").length / T.length) * 100)}% Arabic` : undefined} icon="tray" />
        <Kpi label="First reply, median" value={median(firsts) !== null ? fmtDuration(median(firsts)!) : "—"} icon="clock" />
        <Kpi label="Resolution, median" value={median(resolves) !== null ? fmtDuration(median(resolves)!) : "—"} icon="check-circle" />
        <Kpi label="SLA met" value={withDue.length ? `${Math.round((met / withDue.length) * 100)}%` : "—"} note="first reply on time" icon="timer" alert={withDue.length > 0 && met / withDue.length < 0.9} />
        <Kpi label="Satisfaction" value={rated.length ? `${Math.round((good / rated.length) * 100)}%` : "—"} note={`good, from ${rated.length} ratings`} icon="smiley" />
        <Kpi label="Top issue" value={top ? CATEGORY_LABEL[top[0]] ?? top[0] : "—"} note={top && T.length ? `${Math.round((top[1] / T.length) * 100)}% of tickets` : undefined} icon="chart-bar" />
      </div>
      <Card title="Volume by category and channel" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Category</th>{channels.map((c) => <th key={c} scope="col" className="num">{CHANNEL_LABEL[c]}</th>)}<th scope="col" className="num">Total</th></tr></thead>
          <tbody>{Object.entries(CATEGORY_LABEL).map(([k, l]) => {
            const r = byCat.get(k) ?? {};
            return <tr key={k}><td>{l}</td>{channels.map((c) => <td key={c} className="num">{r[c] ?? 0}</td>)}<td className="num w6">{Object.values(r).reduce((a, b) => a + b, 0)}</td></tr>;
          })}</tbody>
        </table></div>
      </Card>
      {cfg ? (
        <Card title="Settings">
          {!edit ? <Note>Only the Support lead (or an Admin) changes these.</Note> : null}
          <ActionForm action={saveSupportSettings} reset={false}>{(pending) => (
            <fieldset disabled={!edit} className="a-stack" style={{ border: 0, padding: 0, margin: 0 }}>
              <h3 className="t-h3">SLA targets (business hours)</h3>
              <div className="a-tbl-wrap"><table className="a-tbl">
                <thead><tr><th scope="col">Priority</th><th scope="col">First reply</th><th scope="col">Resolution</th></tr></thead>
                <tbody>{(["urgent", "high", "normal", "low"] as const).map((p) => (
                  <tr key={p}><td className="w6">{p[0]!.toUpperCase() + p.slice(1)}{p === "normal" ? " (default)" : ""}</td>
                    <td><label className="sr" htmlFor={`${p}_first`}>{p} first reply hours</label><input id={`${p}_first`} name={`${p}_first`} type="number" min={1} max={240} className="a-in" defaultValue={sla[p]?.first} style={{ width: 90 }} /> h</td>
                    <td><label className="sr" htmlFor={`${p}_resolve`}>{p} resolution hours</label><input id={`${p}_resolve`} name={`${p}_resolve`} type="number" min={1} max={720} className="a-in" defaultValue={sla[p]?.resolve} style={{ width: 90 }} /> h</td></tr>
                ))}</tbody>
              </table></div>
              <div className="a-row" style={{ gap: 12 }}>
                <label className="a-field" style={{ maxWidth: 260 }}><span className="t-sm">Warn the assignee this many minutes before a breach</span><input name="warn" type="number" min={0} max={1440} className="a-in" defaultValue={cfg.warn_before_minutes} /></label>
                <label className="a-field" style={{ maxWidth: 260 }}><span className="t-sm">Waiting on learner closes by itself after (days)</span><input name="auto_close" type="number" min={1} max={30} className="a-in" defaultValue={cfg.auto_close_days} /></label>
              </div>
              <h3 className="t-h3">Business hours (Cairo time)</h3>
              {(["ar", "en"] as const).map((q) => (
                <div key={q} className="a-row" style={{ gap: 12, flexWrap: "wrap" }}>
                  <b className="t-sm" style={{ width: 120 }}>{q === "ar" ? "Arabic tickets" : "English tickets"}</b>
                  <span className="a-row" style={{ gap: 6 }}>{DAYS.map((d, i) => <label key={d} className="a-row t-sm" style={{ gap: 3 }}><input type="checkbox" name={`${q}_days`} value={i} defaultChecked={hours[q]?.days.includes(i)} />{d}</label>)}</span>
                  <label className="a-row t-sm" style={{ gap: 4 }}>from<input name={`${q}_start`} type="number" min={0} max={23} className="a-in" defaultValue={hours[q]?.start} style={{ width: 70 }} /></label>
                  <label className="a-row t-sm" style={{ gap: 4 }}>to<input name={`${q}_end`} type="number" min={1} max={24} className="a-in" defaultValue={hours[q]?.end} style={{ width: 70 }} /></label>
                </div>
              ))}
              <label className="a-field"><span className="t-sm">Days off (SLA clocks pause), dates separated by commas</span><input name="days_off" className="a-in" defaultValue={(cfg.days_off ?? []).join(", ")} placeholder="2026-12-25, 2027-01-07" /></label>
              <h3 className="t-h3">Assignment</h3>
              <div className="a-row" style={{ gap: 12 }}>{[["manual", "Manual"], ["round_robin", "Round-robin"], ["category", "By category"]].map(([v, l]) => <label key={v} className="a-row t-sm" style={{ gap: 6 }}><input type="radio" name="assignment" value={v} defaultChecked={cfg.assignment === v} />{l}</label>)}</div>
              <div className="a-tbl-wrap"><table className="a-tbl"><thead><tr><th scope="col">Category</th><th scope="col">Goes to (by category)</th></tr></thead><tbody>
                {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
                  <tr key={k}><td>{l}</td><td><label className="sr" htmlFor={`cat_${k}`}>{l} goes to</label><select id={`cat_${k}`} name={`cat_${k}`} className="a-in" defaultValue={cats[k] ?? ""} style={{ maxWidth: 260 }}><option value="">Nobody (stays unassigned)</option>{(members ?? []).map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name || m.email}</option>)}</select></td></tr>
                ))}
              </tbody></table></div>
              <h3 className="t-h3">Satisfaction survey</h3>
              <label className="a-row t-sm" style={{ gap: 6 }}><input type="checkbox" name="survey" defaultChecked={cfg.survey} />Send it once, when a ticket is resolved, in the ticket’s language</label>
              <div className="a-row" style={{ gap: 12 }}>
                <label className="a-field"><span className="t-sm">English question</span><input name="survey_en" className="a-in" defaultValue={survey.en} maxLength={200} /></label>
                <label className="a-field"><span className="t-sm">Arabic question</span><input name="survey_ar" className="a-in" defaultValue={survey.ar} maxLength={200} dir="rtl" lang="ar" /></label>
              </div>
              <h3 className="t-h3">Refunds</h3>
              <label className="a-field" style={{ maxWidth: 320 }}><span className="t-sm">Support agents refund up to (USD) inside the 7 days</span><input name="refund_limit" type="number" min={0} max={1000} step={1} className="a-in" defaultValue={(cfg.refund_limit_usd_minor ?? 5000) / 100} /></label>
              <label className="a-field"><span className="t-sm">Reason for the change (saved in the audit log)<span className="req" aria-hidden="true">*</span></span><input name="reason" className="a-in" required minLength={3} maxLength={500} /></label>
              {edit ? <button type="submit" className="a-btn pri" disabled={pending} aria-busy={pending} style={{ alignSelf: "flex-start" }}>{pending ? "Saving…" : "Save settings"}</button> : null}
            </fieldset>
          )}</ActionForm>
        </Card>
      ) : null}
    </main>
  );
}
