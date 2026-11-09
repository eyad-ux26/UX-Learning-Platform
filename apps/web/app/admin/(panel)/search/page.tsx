import Link from "next/link";
import { content } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { learnerList } from "@/lib/admin/data/learners";
import { PAYMENT_COLS, type PaymentRow } from "@/lib/admin/data/refunds";
import { certId } from "@/lib/certificate-share";
import { maskEmail, maskName } from "@/lib/admin/mask";
import { mayReveal } from "@/lib/admin/permissions";
import { fmtMoney } from "@/lib/admin/format";
import { withinDbLimit } from "@/lib/server/rate-limit";
import { Card, Empty, I, NoAccess, PageHead, Tabs } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

type Hit = { href: string; title: string; sub: string; tag: string };
type Group = { id: string; label: string; icon: string; hits: Hit[] };

/** One search box (SRC-1): learners, tickets, payments, certificates, paths and lessons, admins. Results follow the role. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 120);
  const groups: Group[] = [];
  let limited = false;
  if (q.length >= 2) {
    limited = !(await withinDbLimit(createAdminClient(), ctx.userId, "admin_search", 60, 60).catch(() => true));
  }
  if (q.length >= 2 && !limited) {
    const db = createAdminClient();
    const like = `%${q.replace(/[%_,()]/g, "")}%`;
    const tasks: Promise<void>[] = [];
    if (allowed(ctx, "learners.view")) tasks.push(learnerList({ q }, 1, 8).then(({ rows }) => {
      groups.push({ id: "learners", label: "Learners", icon: "users-three", hits: rows.map((r) => ({ href: `/admin/learners/${r.user_id}`, title: r.display_name ? maskName(r.display_name) : maskEmail(r.email), sub: `${maskEmail(r.email)} · ${r.plan === "free" ? "Free" : "Pro"} · ${r.locale === "ar" ? "Arabic" : "English"}`, tag: "Learner" })) });
    }));
    if (allowed(ctx, "support.view")) tasks.push((async () => {
      const id = /^#?\d{4,9}$/.test(q) ? Number(q.replace("#", "")) : null;
      const r = id ? await db.from("support_tickets").select("id, subject, status, email").eq("id", id).limit(1) : await db.from("support_tickets").select("id, subject, status, email").or(`subject.ilike.${like},email.ilike.${like}`).order("last_message_at", { ascending: false }).limit(8);
      groups.push({ id: "tickets", label: "Tickets", icon: "tray", hits: (r.data ?? []).map((t) => ({ href: `/admin/support/${t.id}`, title: `#${t.id} ${t.subject}`, sub: `${maskEmail(t.email)} · ${t.status.replace("_", " ")}`, tag: "Ticket" })) });
    })());
    if (allowed(ctx, "payments.view")) tasks.push((async () => {
      const v = q.replace(/[,()]/g, "");
      const r = await db.from("payments").select(PAYMENT_COLS).or(`provider_payment_id.eq.${v},receipt_no.eq.${v.toUpperCase()}`).limit(5);
      groups.push({ id: "payments", label: "Payments", icon: "credit-card", hits: ((r.data ?? []) as PaymentRow[]).map((p) => ({ href: `/admin/billing/payments/${p.id}`, title: `${fmtMoney(p.amount_minor, p.currency)} · ${p.receipt_no}`, sub: `${p.provider} · ${p.status} · ${new Date(p.paid_at).toISOString().slice(0, 10)}`, tag: "Payment" })) });
    })());
    if (allowed(ctx, "certs.view")) tasks.push((async () => {
      const m = q.match(/^(?:UXG-)?(?:P\d{2}-)?([0-9A-Fa-f]{6,12})$/i);
      if (!m) return;
      const r = await db.from("certificates").select("code, path_id, user_id, issued_at, revoked_at").like("code", `${m[1]!.toLowerCase()}%`).limit(5);
      groups.push({ id: "certs", label: "Certificates", icon: "certificate", hits: (r.data ?? []).map((c) => ({ href: `/admin/certificates?q=${certId(c.path_id, c.code)}`, title: certId(c.path_id, c.code), sub: `${c.path_id} · ${c.revoked_at ? "revoked" : "valid"}`, tag: "Certificate" })) });
    })());
    if (allowed(ctx, "team.view")) tasks.push((async () => {
      const r = await db.from("admin_members").select("user_id, email, display_name, status").or(`email.ilike.${like},display_name.ilike.${like}`).limit(5);
      groups.push({ id: "admins", label: "Admins", icon: "user-gear", hits: (r.data ?? []).map((m) => ({ href: "/admin/team", title: m.display_name ?? m.email, sub: `${m.email} · ${m.status}`, tag: "Admin" })) });
    })());
    const ql = q.toLowerCase();
    const paths = content.paths.filter((p) => p.id.toLowerCase() === ql || p.title.en.toLowerCase().includes(ql) || p.title.ar.includes(q)).slice(0, 5);
    const lessons = content.lessons.filter((l) => l.lessonId.toLowerCase() === ql || (l.body.title?.en ?? "").toLowerCase().includes(ql) || (l.body.title?.ar ?? "").includes(q)).slice(0, 8);
    groups.push({ id: "content", label: "Paths and lessons", icon: "book-open", hits: [
      ...paths.map((p) => ({ href: `/admin/learners?path=${p.id}`, title: `${p.id} · ${p.title.en}`, sub: p.title.ar, tag: "Path" })),
      ...lessons.map((l) => ({ href: `/admin/appeals?lesson=${l.lessonId}`, title: `${l.lessonId} · ${l.body.title?.en ?? ""}`, sub: `${l.pathId} · ${l.body.title?.ar ?? ""}`, tag: "Lesson" })),
    ] });
    await Promise.all(tasks);
  }
  const order = ["learners", "tickets", "payments", "certs", "content", "admins"];
  const found = groups.filter((g) => g.hits.length).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const shown = sp.type ? found.filter((g) => g.id === sp.type) : found;
  if (!allowed(ctx, "learners.view") && !allowed(ctx, "support.view") && !allowed(ctx, "payments.view") && !allowed(ctx, "certs.view") && !allowed(ctx, "team.view")) {
    return <NoAccess what="Search" roles="a role that opens learners, tickets or payments" />;
  }
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Search" }]} title="Search" sub="Paste a payment, ticket or certificate id to jump straight to it." />
      <form method="get" action="/admin/search" role="search" className="a-row" style={{ gap: 8 }}>
        <label htmlFor="gs-q" className="sr">Search</label>
        <input id="gs-q" name="q" className="a-in" defaultValue={q} autoFocus placeholder="Name, email, ticket #, payment id, receipt, certificate id, lesson" style={{ flex: 1 }} />
        <button className="a-btn pri" type="submit"><I n="magnifying-glass" />Search</button>
      </form>
      {found.length > 1 ? <Tabs label="Result type" items={[{ href: `/admin/search?q=${encodeURIComponent(q)}`, label: "All", current: !sp.type }, ...found.map((g) => ({ href: `/admin/search?q=${encodeURIComponent(q)}&type=${g.id}`, label: g.label, count: g.hits.length, current: sp.type === g.id }))]} /> : null}
      {limited ? <Card><Empty icon="hourglass-medium" title="Too many searches in a minute">Wait a moment and try again.</Empty></Card>
        : q.length < 2 ? <Card><Empty icon="magnifying-glass" title="Type at least 2 characters" /></Card>
        : shown.length ? shown.map((g) => (
          <Card key={g.id} title={<><I n={g.icon} /> {g.label}</>} pad={false}>
            <ul className="a-stack" style={{ listStyle: "none", margin: 0, padding: 8 }}>
              {g.hits.map((h, i) => (
                <li key={i}><Link href={h.href} className="a-row" style={{ gap: 10, padding: "6px 8px", borderRadius: 8, textDecoration: "none", color: "inherit" }}>
                  <span style={{ flex: 1, minWidth: 0 }}><span className="w6" dir="auto" style={{ display: "block" }}>{h.title}</span><span className="t-xs ink-3" dir="auto">{h.sub}</span></span>
                  <span className="a-tagx t-xs">{h.tag}</span>
                </Link></li>
              ))}
            </ul>
          </Card>
        )) : <Card><Empty icon="magnifying-glass" title={`Nothing matches “${q}”`}>Try an email, a ticket number or a payment id.</Empty></Card>}
      <p className="t-xs ink-3">{mayReveal(ctx.perms) ? "Emails are masked here; Learner 360 can reveal them, logged." : "Emails are masked for your role."} {allowed(ctx, "team.view") ? "" : "Admins are not searched for your role."}</p>
    </main>
  );
}
