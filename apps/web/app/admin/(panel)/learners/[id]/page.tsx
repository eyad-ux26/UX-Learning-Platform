import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { learner360, learnerAudit } from "@/lib/admin/data/learners";
import { people } from "@/lib/admin/data/billing";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/admin/data/support";
import { maskEmail } from "@/lib/admin/mask";
import { REGION_LABEL } from "@/lib/admin/format";
import { AGENT_COMP_DAYS } from "@/lib/admin/rules";
import { learningRules } from "@/lib/app-config";
import { ActionForm, Confirm } from "@/components/admin/forms";
import { ExportButton } from "@/components/admin/Download";
import { Reveal } from "@/components/admin/Reveal";
import { Card, Empty, I, Id, Kpi, KV, Money, NoAccess, Note, PageHead, St, Tabs, When } from "@/components/admin/ui";
import { CompDrawer } from "../../billing/CompDrawer";
import { endComp } from "../../billing/actions";
import { PaymentStatus } from "../../billing/PaymentStatus";
import { addFreeze, addNote, changeEmail, coverDay, deleteLearner, exportLearner, resendSignIn, resetLesson, reveal, setSuspended, startViewAs, undoDelete } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learner 360" };

const TABS = ["overview", "learning", "billing", "support", "emails", "activity"] as const;
type Tab = (typeof TABS)[number];
const SKILL: Record<string, string> = { practiced: "Practised", shown: "Shown", kept: "Mastered" };

export default async function Learner360Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "learners.view")) return <NoAccess what="Learner 360" roles="a support or admin role" />;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sp = await searchParams;
  const tab = (TABS.find((t) => t === sp.tab) ?? "overview") as Tab;
  const d = await learner360(id);
  if (!d) notFound();
  const [audit, authors, rules] = await Promise.all([learnerAudit(id), people(d.notes.map((n) => n.author_id)), learningRules()]);
  const FREEZE_MAX = rules.freezeMax; // Learning rules (0061)
  const name = d.profile?.display_name || d.facts.email.split("@")[0]!;
  const L = d.learner;
  const fresh = isFresh(ctx);
  const act = allowed(ctx, "learners.act");
  const manage = allowed(ctx, "learners.manage");
  const suspended = !!d.facts.banned_until && new Date(d.facts.banned_until).getTime() > Date.now();
  const deleting = d.profile?.delete_after ?? null;
  const sub = d.subs.find((s) => ["active", "grace", "cancelled"].includes(s.status as string)) ?? null;
  const comp = L?.entitlement?.source === "manual" && L.pro;
  const openTicket = d.tickets.find((t) => !["resolved", "closed"].includes(t.status));
  const u = { name, id };
  const hidden = [{ name: "user", value: id }];
  const lessons = d.paths.flatMap((p) => p.units.flatMap((un) => un.lessons.filter((l) => l.state === "done" || l.state === "in_progress").map((l) => ({ ...l, path: p.id }))));
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/learners", label: "Learners" }, { label: name }]} title={name}
        sub={<span className="a-row" style={{ gap: 6 }}>
          {suspended ? <St tone="bad">Suspended</St> : deleting ? <St tone="wait">Deleting <When at={deleting} /></St> : <St tone="good">Active</St>}
          <St tone={L?.pro ? "good" : "off"} icon="crown-simple">{L?.pro ? (comp ? "Pro (comp)" : `Pro ${sub?.period === "year" ? "annual" : "monthly"}`) : "Free"}</St>
          <St tone="info" icon="translate">{d.lang === "ar" ? "Arabic" : "English"}</St>
        </span>}
        actions={<>
          {allowed(ctx, "learners.view_as") ? <Confirm action={startViewAs} label="View as learner" title={`View the app as ${name}?`} icon="eye" hidden={hidden} go={`/admin/learners/${id}/view`}
            effects={[{ icon: "lock-simple", text: "Read only. Nothing you open changes their account." }, { icon: "clock", text: "Ends by itself after 30 minutes." }, { icon: "clipboard-text", text: "Logged with your reason." }]} /> : null}
          {openTicket ? <Link className="a-btn" href={`/admin/support/${openTicket.id}`}><I n="tray" />Open ticket #{openTicket.id}</Link> : null}
        </>} />
      <div className="a-split">
        <div className="a-main-col">
          <Card label="Profile">
            <KV rows={[
              ["Email", allowed(ctx, "learners.reveal") ? <Reveal action={reveal} masked={maskEmail(d.facts.email)} user={id} field="email" /> : maskEmail(d.facts.email)],
              ["User id", <Id key="i">{id}</Id>],
              ["Country", d.country ? `${d.country}${d.profile?.time_zone ? ` · ${d.profile.time_zone}` : ""}` : d.profile?.time_zone ?? null],
              ["Signed up", <span key="s"><When at={d.facts.created_at} /> · {d.facts.methods.length ? d.facts.methods.join(" + ") : "email"}</span>],
              ["Email confirmed", d.facts.email_confirmed_at ? <When at={d.facts.email_confirmed_at} /> : <St tone="wait">Not yet</St>],
              ["Last sign-in", <When key="l" at={d.facts.last_sign_in_at} rel />],
              ["Week starts", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][L?.weekStart ?? 1]],
              ["Last IP", allowed(ctx, "learners.reveal") ? <Reveal action={reveal} masked="•••.•••.•.•" user={id} field="ip" /> : "Masked"],
            ]} />
          </Card>
          <Tabs label="Learner sections" items={TABS.map((t) => ({ href: t === "overview" ? `/admin/learners/${id}` : `/admin/learners/${id}?tab=${t}`, label: t[0]!.toUpperCase() + t.slice(1), current: t === tab, count: t === "support" ? d.tickets.length : undefined }))} />
          {tab === "overview" ? (
            <>
              <div className="a-kpis">
                <Kpi label="Streak" value={`${L?.progress.streak ?? 0} days`} note={`best ${L?.longestStreak ?? 0}`} icon="flame" />
                <Kpi label="Freezes held" value={`${L?.freezes ?? 0} of ${FREEZE_MAX}`} icon="snowflake" />
                <Kpi label="XP" value={(L?.progress.xpTotal ?? 0).toLocaleString("en")} icon="lightning" />
                <Kpi label="Certificates" value={d.certs.filter((c) => !c.revoked_at).length} icon="certificate" />
                <Kpi label="Appeals" value={d.reviews.length} note={`${d.reviews.filter((r) => r.status === "accepted").length} accepted`} icon="scales" />
              </div>
              <PathsCard paths={d.paths} />
            </>
          ) : null}
          {tab === "learning" ? (
            <>
              <PathsCard paths={d.paths} detail />
              <Card title="Certificates" pad={false}>
                {d.certs.length ? <div className="a-tbl-wrap"><table className="a-tbl"><tbody>{d.certs.map((c) => (
                  <tr key={c.code}><td><Link href={`/admin/certificates?q=${c.code}`}><Id>{c.code}</Id></Link></td><td>{c.path_id}</td><td><When at={c.issued_at} /></td><td>{c.revoked_at ? <St tone="bad">Revoked</St> : <St tone="good">Valid</St>}</td></tr>
                ))}</tbody></table></div> : <Empty icon="certificate" title="No certificates yet" />}
              </Card>
              <Card title="Appeals and reports" pad={false}>
                {d.reviews.length ? <div className="a-tbl-wrap"><table className="a-tbl"><tbody>{d.reviews.map((r) => (
                  <tr key={r.id}><td><Link href={`/admin/appeals/${r.id}`}>{r.lesson_id} · {r.step_id}</Link></td><td>{r.reason.replace("_", " ")}</td><td>{r.status}</td><td><When at={r.created_at} /></td></tr>
                ))}</tbody></table></div> : <Empty icon="scales" title="No appeals" />}
              </Card>
            </>
          ) : null}
          {tab === "billing" ? (
            <>
              <Card title="Plan and billing" actions={sub ? <Link className="t-sm" href={`/admin/billing/subscriptions?q=${encodeURIComponent(d.facts.email)}`}>Open subscription</Link> : null}>
                {sub ? <KV rows={[
                  ["Plan", `Pro ${sub.period === "year" ? "annual" : "monthly"} · ${REGION_LABEL[sub.region as string] ?? sub.region} price`],
                  ["Renews at", <Money key="m" minor={sub.renew_amount_minor as number} currency={sub.currency as string} />],
                  ["Provider", `${sub.provider === "paddle" ? "Paddle" : sub.provider === "paymob" ? "Paymob" : "Test"}${sub.card_last4 ? ` · ${sub.card_brand ?? "card"} •••• ${sub.card_last4}` : ""}`],
                  ["Status", String(sub.status)], [sub.status === "cancelled" ? "Pro until" : "Renews", <When key="r" at={sub.current_period_end as string} />],
                ]} /> : comp ? <p className="t-sm">Free Pro from the team until <When at={L?.entitlement?.validUntil} />.</p> : <p className="t-sm ink-2">Free plan.</p>}
                {d.student?.valid_until && new Date(d.student.valid_until).getTime() > Date.now() ? <p className="t-sm" style={{ marginTop: 8 }}><St tone="good" icon="student">Student price until <When at={d.student.valid_until} /></St></p> : null}
              </Card>
              <Card title="Payments" pad={false}>
                {d.pays.length ? <div className="a-tbl-wrap"><table className="a-tbl"><tbody>{d.pays.map((p) => (
                  <tr key={p.id}><td><Link href={`/admin/billing/payments/${p.id}`}><When at={p.paid_at} /></Link></td><td>{p.kind === "first" ? "First payment" : "Renewal"}</td><td className="num"><Money minor={p.amount_minor} currency={p.currency} /></td><td><PaymentStatus p={p} /></td></tr>
                ))}</tbody></table></div> : <Empty icon="credit-card" title="No payments" />}
              </Card>
              {d.comp.length ? <Card title="Comp access history" pad={false}><div className="a-tbl-wrap"><table className="a-tbl"><tbody>{d.comp.map((c, i) => (
                <tr key={i}><td>{c.kind === "end" ? "Ended" : "Granted"}</td><td>until <When at={c.until} /></td><td className="t-sm">{c.reason}</td><td><When at={c.created_at} /></td></tr>
              ))}</tbody></table></div></Card> : null}
            </>
          ) : null}
          {tab === "support" ? (
            <Card title="Tickets" pad={false} actions={<Link className="t-sm" href="/admin/support">Open inbox</Link>}>
              {d.tickets.length ? <div className="a-tbl-wrap"><table className="a-tbl"><tbody>{d.tickets.map((t) => (
                <tr key={t.id}><td><Link href={`/admin/support/${t.id}`}>#{t.id}</Link></td><td dir="auto">{t.subject}</td><td>{CATEGORY_LABEL[t.category]}</td><td>{STATUS_LABEL[t.status]}</td><td><When at={t.created_at} /></td><td>{t.satisfaction ? `Rated ${t.satisfaction === "good" ? "Good" : "Not good"}` : null}</td></tr>
              ))}</tbody></table></div> : <Empty icon="tray" title="No tickets" />}
            </Card>
          ) : null}
          {tab === "emails" ? (
            <Card title="Emails sent" pad={false}>
              {d.billingEmails.length + d.emails.length ? <div className="a-tbl-wrap"><table className="a-tbl">
                <thead><tr><th scope="col">Email</th><th scope="col">When</th><th scope="col">Delivery</th></tr></thead>
                <tbody>
                  {[...d.billingEmails.map((e) => ({ k: `Billing: ${e.kind}`, at: e.created_at as string, s: e.status as string })), ...d.emails.map((e) => ({ k: e.kind as string, at: e.sent_at as string, s: "sent" }))]
                    .sort((a, b) => b.at.localeCompare(a.at)).map((e, i) => <tr key={i}><td>{e.k}</td><td><When at={e.at} /></td><td>{e.s === "sent" ? <St tone="good">Sent</St> : e.s === "failed" ? <St tone="bad">Failed</St> : <St tone="off">{e.s}</St>}</td></tr>)}
                </tbody></table></div> : <Empty icon="envelope-simple" title="No emails recorded" />}
              <div className="a-card-b"><KV rows={[
                ["Reminder", d.profile?.reminder_time ? `${d.profile.reminder_time.slice(0, 5)} daily` : "Off"],
                ["Push", d.push.length ? `On · ${d.push.length} device${d.push.length > 1 ? "s" : ""}` : "Off"],
              ]} /></div>
            </Card>
          ) : null}
          {tab === "activity" ? (
            <Card title="Team actions on this learner" actions={allowed(ctx, "audit.view", "audit.area_support") ? <Link className="t-sm" href={`/admin/audit?target=${id}`}>Audit trail for this learner</Link> : null}>
              {audit.length ? <div className="a-tl">{audit.map((a) => (
                <div key={a.id} className="a-tl-i"><span className="a-tl-dot team"><I n="user-gear" /></span><div><div className="a-tl-t">{a.action} · {a.actor_email}</div><div className="a-tl-m"><When at={a.at} />{a.reason ? ` · ${a.reason}` : ""}</div></div></div>
              ))}</div> : <p className="t-sm ink-2">No team actions yet.</p>}
            </Card>
          ) : null}
          <Card title="Team notes" actions={<span className="t-xs ink-3">Only the team sees these</span>}>
            <div className="a-stack">
              {d.notes.map((n) => (
                <div key={n.id} className="a-msg"><div className="a-bub note"><div className="a-bub-h"><span className="n">{authors.get(n.author_id as string)?.display_name ?? "Team"}</span><span className="m"><When at={n.created_at as string} /></span></div><p className="t-sm" dir="auto" style={{ whiteSpace: "pre-wrap" }}>{n.body as string}</p></div></div>
              ))}
              {allowed(ctx, "learners.notes") ? (
                <ActionForm action={addNote}>{(pending) => (
                  <><input type="hidden" name="user" value={id} />
                    <div className="a-field"><label htmlFor="note-body" className="sr">Add a note</label><textarea id="note-body" name="body" className="a-ta" rows={2} required maxLength={4000} placeholder="Add a note. Type @ and a name to mention someone." dir="auto" /></div>
                    <button className="a-btn sm" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Saving…" : "Add note"}</button></>
                )}</ActionForm>
              ) : null}
            </div>
          </Card>
        </div>
        <aside className="a-rail" aria-label="Quick actions">
          <div className="a-rail-s">
            <b className="t-sm">Quick actions</b>
            {!act && !manage ? <p className="t-xs ink-2">Your role can view this learner but not change anything. Personal data is masked.</p> : null}
            {act ? <Confirm action={resendSignIn} label="Resend sign-in link" title="Send a new sign-in link?" icon="envelope-simple" small reason={false} hidden={hidden}
              effects={[{ icon: "envelope-simple", text: `A one-time link in ${d.lang === "ar" ? "Arabic" : "English"}, valid for an hour. It works in any browser.` }]} /> : null}
            {act ? <Confirm action={addFreeze} label="Add a freeze" title="Add a streak freeze?" icon="snowflake" small hidden={hidden} disabled={(L?.freezes ?? 0) >= FREEZE_MAX ? `They hold ${FREEZE_MAX}, the most allowed` : false}
              effects={[{ icon: "snowflake", text: `They hold ${L?.freezes ?? 0}; this makes ${(L?.freezes ?? 0) + 1}.` }]} /> : null}
            {act ? <Confirm action={coverDay} label="Restore a lost streak" title="Cover a missed day with a freeze?" icon="flame" small hidden={hidden}
              effects={[{ icon: "flame", text: "The missed day counts as frozen and the streak is counted again." }]}>
              <div className="a-field"><label htmlFor="cover-day">Missed day (their time)<span className="req" aria-hidden="true">*</span></label><input id="cover-day" name="day" type="date" className="a-in" required /></div>
            </Confirm> : null}
            {act || allowed(ctx, "comp.grant") ? (comp ? <Confirm action={endComp} label="End free Pro" title="End free Pro now?" small ghost hidden={hidden} effects={[{ icon: "minus-circle", text: "A paid plan still running takes over." }]} />
              : <CompDrawer user={u} label={`Grant Pro (comp)${allowed(ctx, "comp.grant") ? "" : ` up to ${AGENT_COMP_DAYS} days`}`} unlimited={allowed(ctx, "comp.grant")} />) : null}
            {act && lessons.length ? <Confirm action={resetLesson} label="Reset one lesson" title="Reset one lesson?" icon="arrow-counter-clockwise" small hidden={hidden}
              effects={[{ icon: "arrow-counter-clockwise", text: "Its plays, answers and XP go, so it starts fresh. Skills already shown stay." }]}>
              <div className="a-field"><label htmlFor="reset-l">Lesson<span className="req" aria-hidden="true">*</span></label>
                <select id="reset-l" name="lesson" className="a-in" required>{lessons.map((l) => <option key={l.id} value={l.id}>{l.path} · {l.title}</option>)}</select></div>
            </Confirm> : null}
            {allowed(ctx, "students.review") ? <Link className="t-sm" href={`/admin/billing/discounts/students?user=${id}`}>Approve student price</Link> : null}
          </div>
          {manage ? (
            <div className="a-rail-s">
              <b className="t-sm">Account</b>
              <Confirm action={changeEmail} label="Change email" title="Move this account to a new email?" icon="at" small hidden={hidden} fresh={fresh}
                effects={[{ icon: "envelope-simple", text: "We email a confirm link to the new address. The email changes only when they open it." }]}>
                <div className="a-field"><label htmlFor="new-email">New email<span className="req" aria-hidden="true">*</span></label><input id="new-email" name="email" type="email" className="a-in" required /></div>
              </Confirm>
              <Confirm action={setSuspended} label={suspended ? "Unsuspend" : "Suspend"} title={suspended ? "Let them sign in again?" : "Suspend this account?"} icon={suspended ? "play" : "pause-circle"} small danger={!suspended}
                hidden={[...hidden, { name: "to", value: suspended ? "unsuspend" : "suspend" }]}
                effects={suspended ? [{ icon: "check", text: "They can sign in again." }] : [{ icon: "lock-simple", text: "They cannot sign in. Their plan is not cancelled; cancel it first if needed." }]} />
              <ExportButton action={exportLearner} label="Export their data" title="Export everything we hold about this learner" hidden={hidden} fresh={fresh} note="One JSON file, for a data request. Logged with your reason." />
              {deleting ? <Confirm action={undoDelete} label="Undo delete" title="Keep this account?" small hidden={hidden} effects={[{ icon: "check", text: "The account stays. A cancelled plan does not restart by itself." }]} />
                : <Confirm action={deleteLearner} label="Delete account" title="Delete this account?" icon="trash" small danger hidden={hidden} fresh={fresh} typed={d.facts.email}
                  effects={[{ icon: "trash", text: "Everything is deleted in 7 days. You can undo it here until then." }, { icon: "minus-circle", text: "Renewal stops now. A refund is a separate step." }]} />}
            </div>
          ) : null}
          <div className="a-rail-s"><Note icon="clipboard-text">Every action asks for a reason and is written to the audit log. Actions on email, export and delete ask for a fresh authenticator code.</Note></div>
        </aside>
      </div>
    </main>
  );
}

type PathRow = NonNullable<Awaited<ReturnType<typeof learner360>>>["paths"][number];

function PathsCard({ paths, detail = false }: { paths: PathRow[]; detail?: boolean }) {
  return (
    <Card title="Paths and progress" pad={false} actions={<span className="t-xs ink-3">Skills: Practised · Shown · Mastered</span>}>
      {paths.length ? (
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Path and unit</th><th scope="col">Lessons</th><th scope="col">Skills</th>{detail ? <th scope="col">Lessons done</th> : <th scope="col">Next</th>}</tr></thead>
          <tbody>{paths.flatMap((p) => [
            <tr key={p.id}><td className="w7">{p.id} · {p.title}</td><td className="num">{p.done} / {p.total}</td><td /><td className="t-sm">{detail ? null : p.next ?? "Finished"}</td></tr>,
            ...p.units.filter((un) => detail || un.done > 0).map((un) => (
              <tr key={un.id}><td style={{ paddingInlineStart: 24 }}>Unit {un.number} · {un.title}</td><td className="num">{un.done} / {un.total}</td>
                <td className="t-sm">{un.practised} · {un.shown} · {un.mastered} <span className="ink-3">of {un.skills}</span></td>
                <td className="t-xs">{detail ? un.lessons.filter((l) => l.state !== "locked" && l.state !== "available").map((l) => `${l.title}${l.state === "in_progress" ? " (started)" : ""}`).join(" · ") : null}</td></tr>
            )),
          ])}</tbody>
        </table></div>
      ) : <Empty icon="book-open" title="Has not started a path" />}
      <p className="t-xs ink-3" style={{ padding: "8px 12px" }}>{Object.values(SKILL).join(" → ")}</p>
    </Card>
  );
}
