import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { CATEGORY_LABEL, CHANNEL_LABEL, fillPlaceholders, STATUS_LABEL, TICKET_COLS, type Message, type Ticket } from "@/lib/admin/data/support";
import { people } from "@/lib/admin/data/billing";
import { maskEmail, maskName } from "@/lib/admin/mask";
import { REGION_LABEL } from "@/lib/admin/format";
import { Card, I, Id, KV, Money, NoAccess, PageHead, St, When, type Tone } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { AutoSelect, Composer, type MacroOption } from "@/components/admin/Composer";
import { changeTicket, sendReply } from "../actions";
import { resendSignIn } from "../../learners/actions";
import { CompDrawer } from "../../billing/CompDrawer";
import { Sla } from "../Sla";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ticket" };

const TONE: Record<string, Tone> = { new: "info", open: "info", waiting_team: "wait", waiting_learner: "off", resolved: "good", closed: "off" };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "support.view")) return <NoAccess what="The support inbox" roles="a support role" />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const db = createAdminClient();
  const { data: t0 } = await db.from("support_tickets").select(TICKET_COLS).eq("id", id).maybeSingle();
  if (!t0) notFound();
  const t = t0 as Ticket;
  const [msgs, members, macros, settings, learner] = await Promise.all([
    db.from("support_messages").select("id, ticket_id, kind, author_id, from_email, body, language, mentions, delivery, attachments, created_at").eq("ticket_id", id).order("created_at").then((r) => (r.data ?? []) as Message[]),
    db.from("admin_members").select("user_id, email, display_name").eq("status", "active").then((r) => r.data ?? []),
    db.from("support_macros").select("id, title, category, body_en, body_ar, actions").eq("active", true).order("uses", { ascending: false }).then((r) => r.data ?? []),
    db.from("support_settings").select("warn_before_minutes").eq("id", 1).maybeSingle().then((r) => r.data),
    t.user_id ? Promise.all([
      people([t.user_id]).then((m) => m.get(t.user_id!)),
      db.from("entitlements").select("plan, valid_until, source").eq("user_id", t.user_id).maybeSingle().then((r) => r.data),
      db.from("subscriptions").select("period, region, provider, current_period_end, renew_amount_minor, currency, status").eq("user_id", t.user_id).in("status", ["active", "grace", "cancelled"]).maybeSingle().then((r) => r.data),
      db.from("streaks").select("current, freezes_available").eq("user_id", t.user_id).maybeSingle().then((r) => r.data),
      db.from("support_tickets").select("id, subject, status").eq("user_id", t.user_id).neq("id", id).order("created_at", { ascending: false }).limit(5).then((r) => r.data ?? []),
      db.from("billing_accounts").select("country").eq("user_id", t.user_id).maybeSingle().then((r) => r.data),
    ]) : null,
  ]);
  const name = new Map(members.map((m) => [m.user_id, m.display_name || m.email.split("@")[0]!]));
  const [person, ent, sub, streak, others, acct] = learner ?? [null, null, null, null, [], null];
  const pro = !!ent && ent.plan === "pro" && !!ent.valid_until && new Date(ent.valid_until).getTime() > Date.now();
  const first = (person?.display_name || t.name || "").split(/\s+/)[0] || "";
  const vars = { first_name: first, agent_name: ctx.name.split(/\s+/)[0], plan: pro ? "Pro" : "Free", renewal_date: sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null };
  const options: MacroOption[] = macros.map((m) => ({ id: m.id, title: m.title, category: m.category, actions: m.actions ?? [], en: fillPlaceholders(m.body_en, vars), ar: fillPlaceholders(m.body_ar, vars) }));
  const sorted = [...options.filter((o) => o.category === t.category), ...options.filter((o) => o.category !== t.category)];
  const canReply = allowed(ctx, "support.reply");
  const assignees: [string, string][] = [["", "Nobody"], ...members.filter((m) => allowed(ctx, "support.assign") || m.user_id === ctx.userId).map((m) => [m.user_id, m.user_id === ctx.userId ? `${name.get(m.user_id)} (you)` : name.get(m.user_id)!] as [string, string])];
  const link = t.link_type === "payment" ? `/admin/billing/payments/${t.link_id}` : t.link_type === "refund_request" ? "/admin/billing/refunds" : t.link_type === "review_request" ? `/admin/appeals/${t.link_id}` : t.link_type === "certificate" ? `/admin/certificates?q=${t.link_id}` : null;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/support", label: "Support inbox" }, { label: `#${t.id}` }]} title={<span dir="auto">{t.subject}</span>}
        sub={<span className="a-row" style={{ gap: 8 }}>
          <span className="t-sm ink-2">#{t.id} · {CHANNEL_LABEL[t.channel]} · <When at={t.created_at} /></span>
          <St tone={TONE[t.status] ?? "off"}>{STATUS_LABEL[t.status]}</St><Sla t={t} warnMinutes={settings?.warn_before_minutes ?? 120} />
          {t.satisfaction ? <St tone={t.satisfaction === "good" ? "good" : "bad"} icon="smiley">Rated {t.satisfaction === "good" ? "Good" : "Not good"}</St> : null}
        </span>} />
      <div className="a-split">
        <div className="a-main-col">
          {canReply ? (
            <Card label="Ticket fields">
              <div className="a-row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <AutoSelect action={changeTicket} ticket={t.id} field="status" value={t.status} label="Status" options={Object.entries(STATUS_LABEL)} />
                <AutoSelect action={changeTicket} ticket={t.id} field="priority" value={t.priority} label="Priority" options={[["low", "Low"], ["normal", "Normal"], ["high", "High"], ["urgent", "Urgent"]]} />
                <AutoSelect action={changeTicket} ticket={t.id} field="assignee_id" value={t.assignee_id ?? ""} label="Assignee" options={assignees} />
                <AutoSelect action={changeTicket} ticket={t.id} field="category" value={t.category} label="Category" options={Object.entries(CATEGORY_LABEL)} />
                <AutoSelect action={changeTicket} ticket={t.id} field="language" value={t.language} label="Language" options={[["ar", "Arabic"], ["en", "English"]]} />
              </div>
              {t.tags.length ? <p className="t-xs ink-2" style={{ marginTop: 8 }}>Tags: {t.tags.join(", ")}</p> : null}
            </Card>
          ) : null}
          <section className="a-stack" aria-label="Conversation">
            {msgs.map((m) => m.kind === "event" ? (
              <p key={m.id} className="t-xs ink-3" style={{ textAlign: "center" }}><I n="info" /> {m.body} · <When at={m.created_at} /></p>
            ) : (
              <div key={m.id} className="a-msg">
                <span className={`a-av sm${m.kind === "inbound" ? "" : " v3"}`} aria-hidden="true">{m.kind === "inbound" ? (first[0] ?? "?").toUpperCase() : (name.get(m.author_id ?? "") ?? "T")[0]!.toUpperCase()}</span>
                <div className={`a-bub${m.kind === "note" ? " note" : m.kind === "reply" ? " team" : ""}`}>
                  <div className="a-bub-h">
                    <span className="n">{m.kind === "inbound" ? (person?.display_name ? maskName(person.display_name) : t.name ?? maskEmail(m.from_email)) : name.get(m.author_id ?? "") ?? "Team"}</span>
                    <span className="m">{m.kind === "note" ? "Internal note · " : m.kind === "reply" ? `Reply${m.language === "ar" ? " in Arabic" : m.language === "en" ? " in English" : ""} · ` : ""}<When at={m.created_at} /></span>
                    {m.kind === "reply" && m.delivery !== "sent" ? <St tone="bad">{m.delivery === "skipped" ? "Not sent: email is off on this server" : "Email failed"}</St> : null}
                    {m.attachments ? <span className="t-xs ink-3"><I n="paperclip" /> {m.attachments} attachment{m.attachments > 1 ? "s" : ""} (in the forwarded copy)</span> : null}
                  </div>
                  <p className="t-sm" dir="auto" lang={m.language ?? undefined} style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
                </div>
              </div>
            ))}
          </section>
          {canReply ? <Composer action={sendReply} ticket={t.id} lang={t.language} macros={sorted} /> : <p className="t-sm ink-2">Your role can read tickets but not reply.</p>}
        </div>
        <aside className="a-rail" aria-label="Learner">
          <div className="a-rail-s">
            {person ? (
              <>
                <Link href={`/admin/learners/${t.user_id}`} className="w7">{person.display_name ? maskName(person.display_name) : maskEmail(person.email)}</Link>
                <span className="t-xs ink-2">{maskEmail(person.email)} · {acct?.country ?? "country unknown"} · app in {person.locale === "ar" ? "Arabic" : "English"}</span>
                <KV rows={[
                  ["Plan", pro ? (ent?.source === "manual" ? "Pro (comp)" : `Pro ${sub?.period === "year" ? "annual" : "monthly"}${sub ? ` · ${REGION_LABEL[sub.region] ?? sub.region}` : ""}`) : "Free"],
                  ["Renews", sub ? <span key="r"><When at={sub.current_period_end} /> · <Money minor={sub.renew_amount_minor} currency={sub.currency} usd={false} /></span> : null],
                  ["Streak", streak ? `${streak.current} days · ${streak.freezes_available} freeze${streak.freezes_available === 1 ? "" : "s"}` : null],
                ]} />
              </>
            ) : <><b className="t-sm">{t.name ?? maskEmail(t.email)}</b><span className="t-xs ink-2">{maskEmail(t.email)} · no UXGate account with this email</span></>}
          </div>
          {person && t.user_id ? (
            <div className="a-rail-s"><b className="t-sm">Quick actions</b>
              {allowed(ctx, "learners.act") ? <Confirm action={resendSignIn} label="Resend sign-in link" title="Send a new sign-in link?" small reason={false} icon="envelope-simple" hidden={[{ name: "user", value: t.user_id }]}
                effects={[{ icon: "envelope-simple", text: "A one-time link in their language, valid for an hour." }]} /> : null}
              {allowed(ctx, "learners.act", "comp.grant") ? <CompDrawer user={{ id: t.user_id, name: person.display_name ?? "This learner" }} label="Grant Pro (comp)" unlimited={allowed(ctx, "comp.grant")} /> : null}
              <Link className="t-sm" href={`/admin/learners/${t.user_id}`}>Open Learner 360 (freezes, lessons, view as learner)</Link>
            </div>
          ) : null}
          <div className="a-rail-s"><b className="t-sm">Linked records</b>
            {link ? <Link className="t-sm" href={link}>{t.link_type?.replace("_", " ")} <Id>{t.link_id?.slice(0, 8)}</Id></Link> : <span className="t-xs ink-3">None</span>}
          </div>
          {others.length ? <div className="a-rail-s"><b className="t-sm">Other tickets</b>{others.map((o) => <Link key={o.id} className="t-sm" href={`/admin/support/${o.id}`} dir="auto">#{o.id} {o.subject} · {STATUS_LABEL[o.status as keyof typeof STATUS_LABEL]}</Link>)}</div> : null}
        </aside>
      </div>
    </main>
  );
}
