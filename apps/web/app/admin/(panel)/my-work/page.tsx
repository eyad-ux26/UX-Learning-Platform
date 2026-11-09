import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { approvalLists } from "@/lib/admin/approvals";
import { STATUS_LABEL, TICKET_COLS, type Ticket } from "@/lib/admin/data/support";
import { lessonTitle } from "@/lib/admin/data/learners";
import { maskEmail } from "@/lib/admin/mask";
import { Card, Empty, I, PageHead, St, When } from "@/components/admin/ui";
import { Sla } from "../support/Sla";

export const dynamic = "force-dynamic";
export const metadata = { title: "My work" };

/** Everything waiting on this member: their tickets, approvals they can decide, their own requests, and mentions. */
export default async function MyWork() {
  const ctx = await requireAdmin();
  const db = createAdminClient();
  const support = allowed(ctx, "support.view");
  const OPEN = ["new", "open", "waiting_team", "waiting_learner"];
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [tickets, approvals, appeals, ticketMentions, learnerMentions, settings] = await Promise.all([
    support ? db.from("support_tickets").select(TICKET_COLS).eq("assignee_id", ctx.userId).in("status", OPEN).order("first_reply_due", { ascending: true, nullsFirst: false }).limit(50).then((r) => (r.data ?? []) as Ticket[]) : Promise.resolve([] as Ticket[]),
    approvalLists(ctx),
    allowed(ctx, "appeals.decide") ? db.from("review_requests").select("id, lesson_id, step_id, created_at").eq("status", "open").order("created_at").limit(5).then((r) => r.data ?? []) : Promise.resolve([]),
    support ? db.from("support_messages").select("id, ticket_id, body, created_at").contains("mentions", [ctx.userId]).gte("created_at", since).order("created_at", { ascending: false }).limit(20).then((r) => r.data ?? []) : Promise.resolve([]),
    allowed(ctx, "learners.view") ? db.from("learner_notes").select("id, user_id, body, created_at").contains("mentions", [ctx.userId]).gte("created_at", since).order("created_at", { ascending: false }).limit(20).then((r) => r.data ?? []) : Promise.resolve([]),
    db.from("support_settings").select("warn_before_minutes").eq("id", 1).maybeSingle().then((r) => r.data),
  ]);
  const waitingMine = approvals.mine.filter((a) => a.status === "waiting");
  const mentions = [
    ...ticketMentions.map((m) => ({ id: `t${m.id}`, href: `/admin/support/${m.ticket_id}`, where: `Ticket #${m.ticket_id}`, body: m.body as string, at: m.created_at as string })),
    ...learnerMentions.map((m) => ({ id: `l${m.id}`, href: `/admin/learners/${m.user_id}`, where: "Learner note", body: m.body as string, at: m.created_at as string })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const nothing = !tickets.length && !approvals.waiting.length && !waitingMine.length && !appeals.length && !mentions.length;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "My work" }]} title="My work" sub="What is waiting on you, most urgent first." />
      {nothing ? <Card><Empty icon="check-circle" title="Nothing is waiting on you">New tickets assigned to you, approvals and mentions show up here.</Empty></Card> : null}
      <div className="a-split">
        <div className="a-main-col">
          {support ? (
            <Card title={<>My tickets <span className="a-count">{tickets.length}</span></>} actions={<Link className="t-xs w6" href="/admin/support?queue=mine">Open in inbox</Link>} pad={false}>
              {tickets.length ? (
                <div className="a-tbl-wrap"><table className="a-tbl">
                  <thead><tr><th scope="col">Ticket</th><th scope="col">From</th><th scope="col">Status</th><th scope="col">Last message</th></tr></thead>
                  <tbody>{tickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ maxWidth: 380 }}><Link href={`/admin/support/${t.id}`} className="w7" dir="auto" style={{ display: "block" }}>{t.subject}</Link><span className="t-xs ink-3">#{t.id} </span><Sla t={t} warnMinutes={settings?.warn_before_minutes ?? 120} /></td>
                      <td>{t.name ?? maskEmail(t.email)}</td>
                      <td><St tone={t.status === "waiting_learner" ? "off" : "info"}>{STATUS_LABEL[t.status]}</St></td>
                      <td><When at={t.last_message_at} rel /></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              ) : <Empty icon="tray" title="No tickets assigned to you" />}
            </Card>
          ) : null}
          {mentions.length ? (
            <Card title="Mentions, last 14 days" pad={false}>
              <ul style={{ listStyle: "none", margin: 0, padding: 6 }}>{mentions.map((m) => (
                <li key={m.id}><Link href={m.href} className="a-qa" style={{ alignItems: "flex-start", padding: 10, gap: 12 }}>
                  <I n="at" />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}><span className="w6">{m.where}</span><span className="t-sm ink-2" dir="auto" style={{ fontWeight: 400 }}>{m.body.slice(0, 160)}{m.body.length > 160 ? "…" : ""}</span></span>
                  <span className="t-xs ink-3"><When at={m.at} rel /></span>
                </Link></li>
              ))}</ul>
            </Card>
          ) : null}
        </div>
        <aside className="a-rail a-stack">
          <Card title={<>Approvals for you <span className={`a-count${approvals.waiting.length ? " hot" : ""}`}>{approvals.waiting.length}</span></>} actions={<Link className="t-xs w6" href="/admin/team/approvals">Open</Link>} pad={false}>
            {approvals.waiting.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 6 }}>{approvals.waiting.slice(0, 8).map((a) => (
                <li key={a.id}><Link href="/admin/team/approvals" className="a-qa" style={{ padding: 10, gap: 10 }}><St tone="wait">Waiting</St><span className="a-grow">{a.title}</span><span className="t-xs ink-3"><When at={a.created_at} rel /></span></Link></li>
              ))}</ul>
            ) : <Empty icon="seal-check" title="No approvals waiting" />}
          </Card>
          {waitingMine.length ? (
            <Card title="Waiting on someone else" pad={false}>
              <ul style={{ listStyle: "none", margin: 0, padding: 6 }}>{waitingMine.map((a) => (
                <li key={a.id}><Link href="/admin/team/approvals" className="a-qa" style={{ padding: 10, gap: 10 }}><I n="hourglass-medium" /><span className="a-grow">{a.title}</span><span className="t-xs ink-3"><When at={a.created_at} rel /></span></Link></li>
              ))}</ul>
            </Card>
          ) : null}
          {appeals.length ? (
            <Card title="Oldest appeals" actions={<Link className="t-xs w6" href="/admin/appeals">Open</Link>} pad={false}>
              <ul style={{ listStyle: "none", margin: 0, padding: 6 }}>{appeals.map((r) => (
                <li key={r.id as string}><Link href={`/admin/appeals/${r.id}`} className="a-qa" style={{ padding: 10, gap: 10 }}><I n="scales" /><span className="a-grow">{lessonTitle(r.lesson_id as string)} · {r.step_id as string}</span><span className="t-xs ink-3"><When at={r.created_at as string} rel /></span></Link></li>
              ))}</ul>
            </Card>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
