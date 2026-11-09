import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { CATEGORY_LABEL, CHANNEL_LABEL, STATUS_LABEL, TICKET_COLS, type Ticket } from "@/lib/admin/data/support";
import { maskEmail } from "@/lib/admin/mask";
import { Card, Empty, Filters, I, NoAccess, PageHead, Pager, St, Tabs, When, withQuery, type Tone } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/forms";
import { newTicket } from "./actions";
import { Sla } from "./Sla";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support inbox" };

const PER = 50;
const OPEN = ["new", "open", "waiting_team"];
const TONE: Record<string, Tone> = { new: "info", open: "info", waiting_team: "wait", waiting_learner: "off", resolved: "good", closed: "off" };
const QUEUES = [
  { id: "open", label: "Open" }, { id: "mine", label: "My tickets" }, { id: "unassigned", label: "Unassigned" }, { id: "late", label: "Past SLA" },
  { id: "waiting_learner", label: "Waiting on learner" }, { id: "resolved", label: "Resolved" },
] as const;

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "support.view")) return <NoAccess what="The support inbox" roles="a support role" />;
  const sp = await searchParams;
  const queue = QUEUES.find((q) => q.id === sp.queue)?.id ?? "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createAdminClient();
  const now = new Date().toISOString();
  let q = db.from("support_tickets").select(TICKET_COLS, { count: "exact" });
  if (queue === "open") q = q.in("status", OPEN);
  if (queue === "mine") q = q.eq("assignee_id", ctx.userId).in("status", OPEN);
  if (queue === "unassigned") q = q.is("assignee_id", null).in("status", OPEN);
  if (queue === "late") q = q.in("status", OPEN).is("first_replied_at", null).lt("first_reply_due", now);
  if (queue === "waiting_learner") q = q.eq("status", "waiting_learner");
  if (queue === "resolved") q = q.in("status", ["resolved", "closed"]);
  if (sp.category) q = q.eq("category", sp.category);
  if (sp.channel) q = q.eq("channel", sp.channel);
  if (sp.lang) q = q.eq("language", sp.lang);
  const s = (sp.q ?? "").trim().replace(/[%,()]/g, "");
  if (/^#?\d{4,9}$/.test(s)) q = q.eq("id", Number(s.replace("#", "")));
  else if (s) q = q.or(`subject.ilike.%${s}%,email.ilike.%${s}%`);
  q = queue === "resolved" ? q.order("resolved_at", { ascending: false }) : sp.sort === "new" ? q.order("last_message_at", { ascending: false }) : q.order("first_reply_due", { ascending: true, nullsFirst: false });
  const [{ data, count }, members, settings, counts] = await Promise.all([
    q.range((page - 1) * PER, page * PER - 1),
    db.from("admin_members").select("user_id, email, display_name").eq("status", "active").then((r) => r.data ?? []),
    db.from("support_settings").select("warn_before_minutes").eq("id", 1).maybeSingle().then((r) => r.data),
    Promise.all([
      db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", OPEN),
      db.from("support_tickets").select("id", { count: "exact", head: true }).eq("assignee_id", ctx.userId).in("status", OPEN),
      db.from("support_tickets").select("id", { count: "exact", head: true }).is("assignee_id", null).in("status", OPEN),
      db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", OPEN).is("first_replied_at", null).lt("first_reply_due", now),
    ]).then((r) => r.map((x) => x.count ?? 0)),
  ]);
  const rows = (data ?? []) as Ticket[];
  const name = new Map(members.map((m) => [m.user_id, m.display_name || m.email.split("@")[0]]));
  const qc: Record<string, number | undefined> = { open: counts[0], mine: counts[1], unassigned: counts[2], late: counts[3] };
  const base = { queue: queue === "open" ? undefined : queue, q: sp.q, category: sp.category, channel: sp.channel, lang: sp.lang, sort: sp.sort };
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "People" }, { label: "Support inbox" }]} title="Support inbox" sub="Email to support@uxgate.org, refund requests and lesson reports, in one place. Oldest due first."
        actions={<>
          {allowed(ctx, "support.macros") ? <Link className="a-btn" href="/admin/support/macros"><I n="lightning" />Macros</Link> : null}
          {allowed(ctx, "support.settings") ? <Link className="a-btn" href="/admin/support/settings"><I n="gear-six" />SLA and assignment</Link> : null}
          {allowed(ctx, "support.reply") ? (
            <Drawer label="New ticket" title="Open a ticket" icon="plus" action={newTicket} submit="Create ticket">
              <div className="a-field"><label htmlFor="nt-email">Learner email<span className="req" aria-hidden="true">*</span></label><input id="nt-email" name="email" type="email" className="a-in" required /></div>
              <div className="a-field"><label htmlFor="nt-subject">Subject<span className="req" aria-hidden="true">*</span></label><input id="nt-subject" name="subject" className="a-in" required maxLength={300} dir="auto" /></div>
              <div className="a-field"><label htmlFor="nt-cat">Category</label><select id="nt-cat" name="category" className="a-in">{Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div className="a-field"><label htmlFor="nt-lang">Language</label><select id="nt-lang" name="lang" className="a-in"><option value="ar">Arabic</option><option value="en">English</option></select></div>
              <div className="a-field"><label htmlFor="nt-body">What they asked (internal note)<span className="req" aria-hidden="true">*</span></label><textarea id="nt-body" name="body" className="a-ta" rows={4} required dir="auto" /></div>
            </Drawer>
          ) : null}
        </>} />
      <Tabs label="Queues" items={QUEUES.map((x) => ({ href: withQuery("/admin/support", {}, { queue: x.id === "open" ? undefined : x.id }), label: x.label, count: qc[x.id], current: x.id === queue }))} />
      <Card label="Tickets" pad={false}>
        <Filters action="/admin/support" q={sp.q} placeholder="Ticket number, subject or email" hidden={queue === "open" ? {} : { queue }} selects={[
          { name: "category", label: "Category", value: sp.category, options: Object.entries(CATEGORY_LABEL) },
          { name: "channel", label: "Channel", value: sp.channel, options: Object.entries(CHANNEL_LABEL) },
          { name: "lang", label: "Language", value: sp.lang, options: [["ar", "Arabic"], ["en", "English"]] },
          { name: "sort", label: "Sort", value: sp.sort, options: [["new", "Newest message first"]] },
        ]} />
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Ticket</th><th scope="col">From</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Assignee</th><th scope="col">Last message</th></tr></thead>
            <tbody>{rows.map((t) => (
              <tr key={t.id}>
                <td style={{ maxWidth: 380 }}><Link href={`/admin/support/${t.id}`} className="w7" dir="auto" style={{ display: "block" }}>{t.subject}</Link>
                  <span className="t-xs ink-3">#{t.id} · {CHANNEL_LABEL[t.channel]} · {t.language === "ar" ? "Arabic" : "English"}{t.priority !== "normal" ? ` · ${t.priority}` : ""} </span><Sla t={t} warnMinutes={settings?.warn_before_minutes ?? 120} /></td>
                <td>{t.name ?? maskEmail(t.email)}<span className="t-xs ink-3" style={{ display: "block" }}>{maskEmail(t.email)}</span></td>
                <td>{CATEGORY_LABEL[t.category]}</td>
                <td><St tone={TONE[t.status] ?? "off"}>{STATUS_LABEL[t.status]}</St></td>
                <td>{t.assignee_id ? (t.assignee_id === ctx.userId ? "You" : name.get(t.assignee_id) ?? "Team") : <span className="ink-3">Nobody</span>}</td>
                <td><When at={t.last_message_at} rel /></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <Empty icon="tray" title={queue === "mine" ? "Nothing assigned to you" : "No tickets here"}>{queue === "open" ? "New email to support@uxgate.org shows up here." : null}</Empty>}
        <Pager page={page} more={page * PER < (count ?? 0)} total={count} href={(n) => withQuery("/admin/support", base, { page: n })} />
      </Card>
    </main>
  );
}
