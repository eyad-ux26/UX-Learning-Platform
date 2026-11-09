import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { people } from "@/lib/admin/data/billing";
import { Card, Empty, NoAccess, PageHead, When, Who } from "@/components/admin/ui";
import { CommsTabs } from "@/components/admin/CommsTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email log" };

const KIND: Record<string, string> = { reminder: "Daily reminder", goal: "Goal still open", review: "Review reminder", badge: "Badge", answer: "Review answer", welcome: "Welcome", deleted: "Account deletion", billing: "Billing", trial: "Free trial", news: "Campaign" };

/** COM-5: the latest emails the app sent to learners (kind and time; the text is not stored). */
export default async function EmailLogPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "comms.view")) return <NoAccess what="Communications" roles="a marketing or admin role" />;
  const kind = (await searchParams).kind;
  let q = createAdminClient().from("email_log").select("user_id, kind, sent_at, provider_id").order("sent_at", { ascending: false }).limit(200);
  if (kind && KIND[kind]) q = q.eq("kind", kind);
  const { data } = await q;
  const who = await people((data ?? []).map((r) => r.user_id as string));
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Grow" }, { label: "Communications" }]} title="Communications" sub="Banners in the learner app, emails to learners, and the emails the app sends by itself." />
      <CommsTabs current="log" />
      <div className="a-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <Link className="a-btn sm" href="/admin/communications/log" aria-current={!kind ? "true" : undefined}>All</Link>
        {Object.entries(KIND).map(([k, l]) => <Link key={k} className="a-btn sm" href={`/admin/communications/log?kind=${k}`} aria-current={kind === k ? "true" : undefined}>{l}</Link>)}
      </div>
      <Card label="Email log" pad={false}>
        {data?.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Learner</th><th scope="col">Email</th><th scope="col">Sent</th><th scope="col">Provider id</th></tr></thead>
            <tbody>{data.map((r, i) => {
              const p = who.get(r.user_id as string);
              return (
                <tr key={i}>
                  <td>{r.user_id ? <Link href={`/admin/learners/${r.user_id}`}><Who name={p?.display_name} email={p?.email} link={false} /></Link> : "—"}</td>
                  <td className="t-sm">{KIND[r.kind as string] ?? r.kind}</td>
                  <td className="t-sm"><When at={r.sent_at as string} rel /></td>
                  <td className="a-code t-xs">{(r.provider_id as string) ?? "—"}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="envelope-simple" title="No emails logged" />}
      </Card>
    </main>
  );
}
