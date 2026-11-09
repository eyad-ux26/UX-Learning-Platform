import Link from "next/link";
import { content } from "@uxgate/content";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { learnerList, type LearnerFilter } from "@/lib/admin/data/learners";
import { Card, Empty, Filters, NoAccess, PageHead, Pager, St, Tabs, When, Who, withQuery, type Tone } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learners" };

const PER = 50;
const STATUS: Record<string, [Tone, string]> = { active: ["good", "Active"], past_due: ["wait", "Past due"], cancelled: ["off", "Cancelled"], suspended: ["bad", "Suspended"], deleted: ["off", "Deleting"] };
const PLAN: Record<string, string> = { free: "Free", pro: "Pro", comp: "Pro (comp)" };
const VIEWS: { id: string; label: string; f: LearnerFilter }[] = [
  { id: "all", label: "All learners", f: {} },
  { id: "ar-pro", label: "Arabic Pro, active this week", f: { plan: "pro", locale: "ar", active: "7" } },
  { id: "comp", label: "Comp", f: { plan: "comp" } },
  { id: "past-due", label: "Past due", f: { status: "past_due" } },
  { id: "suspended", label: "Suspended", f: { status: "suspended" } },
];

export default async function LearnersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "learners.view")) return <NoAccess what="Learners" roles="a support or admin role" />;
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.id === sp.view);
  const f: LearnerFilter = view ? view.f : { q: sp.q?.trim(), plan: sp.plan, status: sp.status, locale: sp.locale, country: sp.country, path: sp.path, joined: sp.joined, active: sp.active, method: sp.method };
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total } = await learnerList(f, page, PER);
  const base = view ? { view: view.id } : (f as Record<string, string | undefined>);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "People" }, { label: "Learners" }]} title="Learners" sub="Search by name, email, user id, payment id, receipt or certificate id. Personal data is masked; Learner 360 can reveal it, logged." />
      <Tabs label="Saved views" items={VIEWS.map((v) => ({ href: v.id === "all" ? "/admin/learners" : `/admin/learners?view=${v.id}`, label: v.label, current: (view?.id ?? (Object.values(f).some(Boolean) ? "" : "all")) === v.id }))} />
      <Card label="Learners" pad={false}>
        <Filters action="/admin/learners" q={sp.q} placeholder="Name, email, user id, payment id or certificate id" selects={[
          { name: "plan", label: "Plan", value: sp.plan, options: [["free", "Free"], ["pro", "Pro"], ["comp", "Comp"]] },
          { name: "status", label: "Status", value: sp.status, options: Object.entries(STATUS).map(([k, [, l]]) => [k, l]) },
          { name: "locale", label: "Language", value: sp.locale, options: [["ar", "Arabic"], ["en", "English"]] },
          { name: "active", label: "Last active", value: sp.active, options: [["1", "Today"], ["7", "7 days"], ["30", "30 days"]] },
          { name: "joined", label: "Signed up", value: sp.joined, options: [["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]] },
          { name: "path", label: "Path", value: sp.path, options: content.paths.map((p) => [p.id, `${p.id} ${p.title.en}`]) },
          { name: "method", label: "Sign-in", value: sp.method, options: [["google", "Google"], ["email", "Email"], ["apple", "Apple"]] },
        ]} />
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col">Plan</th><th scope="col">Status</th><th scope="col">Language</th><th scope="col">Country</th><th scope="col">Streak</th><th scope="col">Last active</th><th scope="col">Signed up</th><th scope="col">Sign-in</th></tr></thead>
            <tbody>{rows.map((r) => {
              const [tone, label] = STATUS[r.status] ?? ["off", r.status];
              return (
                <tr key={r.user_id}>
                  <td><Who id={r.user_id} name={r.display_name} email={r.email} /></td>
                  <td>{PLAN[r.plan]}{r.pro_until ? <span className="t-xs ink-3" style={{ display: "block" }}>until <When at={r.pro_until} /></span> : null}</td>
                  <td><St tone={tone}>{label}</St></td>
                  <td>{r.locale === "ar" ? "Arabic" : "English"}</td>
                  <td>{r.country ?? <span className="ink-3">—</span>}</td>
                  <td className="num">{r.streak}</td>
                  <td>{r.last_active ?? <span className="ink-3">Never</span>}</td>
                  <td><When at={r.joined_at} /></td>
                  <td>{r.method.split(",").map((m) => m[0]!.toUpperCase() + m.slice(1)).join(" + ")}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="users-three" title="No learners match">Try fewer filters. <Link href="/admin/learners">Clear all</Link></Empty>}
        <Pager page={page} more={page * PER < total} total={total} href={(n) => withQuery("/admin/learners", base, { page: n })} />
      </Card>
    </main>
  );
}
