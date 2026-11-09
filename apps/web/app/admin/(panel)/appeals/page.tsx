import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { appealCounts, appealList, REASON_LABEL, type AppealTab } from "@/lib/admin/data/appeals";
import { people } from "@/lib/admin/data/billing";
import { lessonTitle } from "@/lib/admin/data/learners";
import { Card, Empty, Filters, NoAccess, PageHead, Pager, St, Tabs, When, Who, withQuery } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appeals and reviews" };

const PER = 50;
const TABS: { id: AppealTab; label: string }[] = [
  { id: "open", label: "Waiting" }, { id: "accepted", label: "Accepted" }, { id: "declined", label: "Rejected" }, { id: "quality", label: "Sent to quality" },
];

export default async function AppealsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "appeals.view")) return <NoAccess what="Appeals and reviews" roles="a support role" />;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total }, counts] = await Promise.all([appealList(tab, { reason: sp.reason, lesson: sp.lesson }, page, PER), appealCounts()]);
  const who = await people(rows.map((r) => r.user_id));
  const base = { tab: tab === "open" ? undefined : tab, reason: sp.reason, lesson: sp.lesson };
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "People" }, { label: "Appeals and reviews" }]} title="Appeals and reviews"
        sub="A learner thinks their answer should count. Accepting credits the skill; rejecting keeps the result with a reply that explains why. Oldest first." />
      <Tabs label="Requests" items={TABS.map((t) => ({ href: withQuery("/admin/appeals", { reason: sp.reason, lesson: sp.lesson }, { tab: t.id === "open" ? undefined : t.id }), label: t.label, count: counts[t.id], current: t.id === tab }))} />
      <Card label="Requests" pad={false}>
        <Filters action="/admin/appeals" hidden={{ ...(tab === "open" ? {} : { tab }), ...(sp.lesson ? { lesson: sp.lesson } : {}) }} selects={[
          { name: "reason", label: "Reason", value: sp.reason, options: Object.entries(REASON_LABEL) },
        ]} />
        {sp.lesson ? <p className="t-sm ink-2" style={{ padding: "0 16px 8px" }}>Only lesson <b>{sp.lesson}</b>. <Link href={withQuery("/admin/appeals", base, { lesson: undefined })}>Show all lessons</Link></p> : null}
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Step</th><th scope="col">Learner</th><th scope="col">Reason</th><th scope="col">Status</th><th scope="col">Asked</th></tr></thead>
            <tbody>{rows.map((r) => {
              const p = who.get(r.user_id);
              return (
                <tr key={r.id}>
                  <td style={{ maxWidth: 360 }}>
                    <Link href={`/admin/appeals/${r.id}`} className="w7" style={{ display: "block" }}>{lessonTitle(r.lesson_id)}</Link>
                    <span className="t-xs ink-3">{r.lesson_id} · {r.step_id}{r.to_quality ? " · sent to quality" : ""}</span>
                  </td>
                  <td><Who id={r.user_id} name={p?.display_name} email={p?.email} /></td>
                  <td>{REASON_LABEL[r.reason] ?? r.reason}{r.note ? <span className="t-xs ink-3" style={{ display: "block", maxWidth: 260 }} dir="auto">“{r.note.slice(0, 80)}{r.note.length > 80 ? "…" : ""}”</span> : null}</td>
                  <td>{r.status === "open" ? <St tone="wait">To answer</St> : r.status === "accepted" ? <St tone="good">Accepted{r.xp_added ? ` · +${r.xp_added} XP` : ""}</St> : <St tone="off">Rejected</St>}</td>
                  <td><When at={r.created_at} rel /></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="scales" title={tab === "open" ? "Nothing to answer" : "No requests here"}>{tab === "open" ? "Requests from the lesson’s “Ask for a review” show up here." : null}</Empty>}
        <Pager page={page} more={page * PER < total} total={total} href={(n) => withQuery("/admin/appeals", base, { page: n })} />
      </Card>
    </main>
  );
}
