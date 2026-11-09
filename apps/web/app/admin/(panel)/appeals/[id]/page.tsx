import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { APPEAL_COLS, REASON_LABEL, sameStepCount, type AppealRow } from "@/lib/admin/data/appeals";
import { people } from "@/lib/admin/data/billing";
import { describeRequest } from "@/lib/requests";
import { Ar, Card, I, Id, KV, NoAccess, Note, PageHead, St, When, Who } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { quality } from "../actions";
import { Decide } from "../Decide";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appeal" };

export default async function AppealPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "appeals.view")) return <NoAccess what="Appeals and reviews" roles="a support role" />;
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data } = await db.from("review_requests").select(APPEAL_COLS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as unknown as AppealRow;
  const [en, ar, who, same, ticket] = await Promise.all([
    describeRequest(r, "en"), describeRequest(r, "ar"), people([r.user_id, r.decided_by]), sameStepCount(r.lesson_id, r.step_id),
    db.from("support_tickets").select("id").eq("link_type", "review_request").eq("link_id", id).maybeSingle().then((x) => x.data),
  ]);
  const p = who.get(r.user_id);
  const decider = r.decided_by ? who.get(r.decided_by) : null;
  const reply = typeof r.reply === "object" && r.reply ? r.reply : null;
  const canDecide = allowed(ctx, "appeals.decide");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "People" }, { href: "/admin/appeals", label: "Appeals and reviews" }, { label: `${r.lesson_id} ${r.step_id}` }]}
        title={en.question || `${r.lesson_id} · ${r.step_id}`}
        sub={<>{en.pathTitle} · Unit {en.unitNo} · Lesson {en.lessonNo} · Step {en.stepNo}</>}
        actions={<>
          {ticket ? <Link className="a-btn" href={`/admin/support/${ticket.id}`}><I n="tray" />Ticket #{ticket.id}</Link> : null}
          <Link className="a-btn" href={`/admin/appeals?lesson=${encodeURIComponent(r.lesson_id)}`}><I n="list" />All requests for this lesson</Link>
        </>} />
      <div className="a-split">
        <div className="a-main-col">
          <Card title="What the learner saw">
            {en.scenario ? <p className="t-sm ink-2" style={{ marginBottom: 8 }}>{en.speaker ? <b>{en.speaker.name}, {en.speaker.role}: </b> : null}{en.scenario}</p> : null}
            <p className="w7">{en.question}</p>
            <ul className="a-stack" style={{ listStyle: "none", padding: 0, marginTop: 8, gap: 6 }}>
              {en.options.map((o) => (
                <li key={o.key} className="a-row t-sm" style={{ gap: 8, alignItems: "flex-start" }}>
                  <b className="a-code">{o.key}</b>
                  <span className="a-grow">{o.label}</span>
                  {o.mine ? <St tone={o.correct ? "good" : "bad"} icon="user">Their pick</St> : null}
                  {o.correct ? <St tone="good">Our answer</St> : null}
                </li>
              ))}
            </ul>
            {ar.question ? <details style={{ marginTop: 12 }}><summary className="t-sm">Arabic version</summary><Ar>{ar.question}</Ar>{ar.options.map((o) => <Ar key={o.key} className="t-sm">{o.key}. {o.label}</Ar>)}</details> : null}
          </Card>
          <Card title="Their request">
            <KV rows={[
              ["Reason", REASON_LABEL[r.reason] ?? r.reason],
              ["Their words", r.note ? <span dir="auto">{r.note}</span> : null],
              ["Asked", <When key="a" at={r.created_at} />],
              ["Others on this step", same > 1 ? <St tone="wait">{same - 1} more {same - 1 === 1 ? "learner" : "learners"} asked about it</St> : "Nobody else"],
            ]} />
          </Card>
          {r.status === "open" ? (
            canDecide ? <Card title="Your answer"><Decide id={r.id} quality={r.to_quality} /></Card>
              : <Note icon="lock-simple">Answering needs a support role that can decide appeals.</Note>
          ) : (
            <Card title="The answer" actions={r.status === "accepted" ? <St tone="good">Accepted{r.xp_added ? ` · +${r.xp_added} XP` : ""}</St> : <St tone="off">Result kept</St>}>
              <KV rows={[
                ["By", decider?.display_name || decider?.email || "Team"],
                ["When", <When key="w" at={r.replied_at} />],
                ["English", reply?.en ?? (typeof r.reply === "string" ? r.reply : null)],
                ["Arabic", reply?.ar ? <Ar key="ar">{reply.ar}</Ar> : null],
              ]} />
            </Card>
          )}
        </div>
        <aside className="a-rail a-stack">
          <Card title="Learner"><Who id={r.user_id} name={p?.display_name} email={p?.email} /><p className="t-xs ink-3" style={{ marginTop: 8 }}>Language: {p?.locale === "ar" ? "Arabic" : "English"}</p></Card>
          <Card title="Content quality">
            <p className="t-sm ink-2">{r.to_quality ? "This step is on the content team’s list." : "Send it when the question itself needs fixing."}</p>
            {canDecide ? (
              <div style={{ marginTop: 8 }}>
                <Confirm action={quality} label={r.to_quality ? "Take off the list" : "Send to quality"} title={r.to_quality ? "Take this step off the quality list?" : "Send this step to content quality?"}
                  small reason={false} fresh hidden={[{ name: "id", value: r.id }, { name: "on", value: r.to_quality ? "off" : "on" }]} icon="flag" />
              </div>
            ) : null}
          </Card>
          <Card title="Ids"><KV rows={[["Request", <Id key="i">{r.id}</Id>], ["Lesson", <Id key="l">{r.lesson_id}</Id>], ["Step", <Id key="s">{r.step_id}</Id>]]} /></Card>
        </aside>
      </div>
    </main>
  );
}
