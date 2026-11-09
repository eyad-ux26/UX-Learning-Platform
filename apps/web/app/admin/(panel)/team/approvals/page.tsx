import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { approvalLists, type Approval } from "@/lib/admin/approvals";
import { Card, Empty, PageHead, St, When } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { TeamTabs } from "@/components/admin/TeamTabs";
import { decideApproval } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Approvals" };

const STATUS: Record<string, [string, "wait" | "good" | "bad" | "off"]> = { waiting: ["Waiting", "wait"], approved: ["Approved", "good"], declined: ["Declined", "bad"], cancelled: ["Cancelled", "off"], failed: ["Approved, failed", "bad"] };
const href = (a: Approval) => (a.target_type === "refund_request" ? `/admin/billing/refunds?open=${a.target_id}` : a.target_type === "payment" ? `/admin/billing/payments/${a.target_id}` : null);

export default async function ApprovalsPage() {
  const ctx = await requireAdmin();
  const { waiting, mine, decided, names } = await approvalLists(ctx);
  const fresh = isFresh(ctx);
  const Item = ({ a, act }: { a: Approval; act: "decide" | "cancel" | null }) => {
    const d = a.detail as { before?: unknown; after?: unknown; facts?: [string, string][] };
    const [label, tone] = STATUS[a.status] ?? [a.status, "off"];
    const link = href(a);
    return (
      <article className="a-appr">
        <div className="a-appr-h"><St tone={tone}>{label}</St><span className="w7 a-grow">{a.title}</span><span className="t-xs ink-3"><When at={a.created_at} rel /></span></div>
        <div className="a-appr-b a-stack sm">
          <p className="t-sm"><b>{names.get(a.requested_by) ?? "Someone"}</b> asked: “{a.reason}”</p>
          {d.facts?.length ? <dl className="a-kv">{d.facts.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : null}
          {a.decided_by ? <p className="t-xs ink-2">{STATUS[a.status]?.[0]} by {names.get(a.decided_by) ?? "someone"} <When at={a.decided_at} rel />{a.note ? `: “${a.note}”` : ""}</p> : null}
          {link ? <Link href={link} className="t-sm">Open the record</Link> : null}
        </div>
        {act === "decide" ? (
          <div className="a-appr-f">
            <Confirm action={decideApproval} small label="Decline" title={`Decline: ${a.title}?`} reasonLabel="Why (the person who asked sees this)" hidden={[{ name: "id", value: a.id }, { name: "decision", value: "declined" }]} />
            <Confirm action={decideApproval} small label="Approve" title={`Approve: ${a.title}?`} reason={false} fresh={fresh} hidden={[{ name: "id", value: a.id }, { name: "decision", value: "approved" }]} icon="check"
              effects={[{ icon: "flow-arrow", text: "It is carried out right away (for a refund: sent to the payment provider)." }, { icon: "clock-counter-clockwise", text: "You are logged as the second person." }]} />
          </div>
        ) : act === "cancel" ? (
          <div className="a-appr-f"><Confirm action={decideApproval} small ghost label="Cancel request" title="Cancel this request?" reason={false} hidden={[{ name: "id", value: a.id }, { name: "decision", value: "cancelled" }]} /></div>
        ) : null}
      </article>
    );
  };
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/team", label: "Team and roles" }, { label: "Approvals" }]} title="Approvals" sub="Requests that need a second person. Nobody approves their own request. Unanswered requests remind the approvers after 4 hours." />
      <TeamTabs current="approvals" counts={{ approvals: waiting.length }} />
      <Card title={`Waiting for me (${waiting.length})`} label="Waiting for me">
        {waiting.length ? <div className="a-stack">{waiting.map((a) => <Item key={a.id} a={a} act="decide" />)}</div> : <Empty icon="check-circle" title="Nothing waiting for you">Requests you can approve show here.</Empty>}
      </Card>
      <Card title="Asked by me" label="Asked by me">
        {mine.length ? <div className="a-stack">{mine.map((a) => <Item key={a.id} a={a} act={a.status === "waiting" ? "cancel" : null} />)}</div> : <p className="t-sm ink-2">You have not asked for any approvals.</p>}
      </Card>
      <Card title="Decided" label="Decided">
        {decided.length ? <div className="a-stack">{decided.map((a) => <Item key={a.id} a={a} act={null} />)}</div> : <p className="t-sm ink-2">Nothing decided yet.</p>}
      </Card>
    </main>
  );
}
