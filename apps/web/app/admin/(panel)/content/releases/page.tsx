import Link from "next/link";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { listReleases } from "@/lib/admin/data/content";
import { Card, Empty, I, NoAccess, Note, PageHead, St, Tabs, When } from "@/components/admin/ui";
import { ContentTabs, RELEASE_STATUS } from "@/components/admin/ContentTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Releases" };

const STATUS = RELEASE_STATUS;

/** CNT-5: releases waiting for review, published ones and their history. */
export default async function ReleasesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "releases.view", "content.view")) return <NoAccess what="Releases" roles="a content role" />;
  const sp = await searchParams;
  const status = sp.status && STATUS[sp.status] ? sp.status : undefined;
  const { rows, names, ready } = await listReleases(status);
  const nm = (id: string | null) => (id ? names.get(id) ?? "Someone" : "—");
  const canPublish = allowed(ctx, "content.publish");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/content", label: "Content" }, { label: "Releases" }]} title="Releases"
        sub="Lesson changes go live as releases. Authors send them for review; a publisher who wrote none of it publishes, and can roll back with a reason." />
      <ContentTabs current="releases" />
      {!ready ? <Note icon="warning">Releases need migration 0060.</Note> : null}
      <Tabs label="Filter by status" items={[{ href: "/admin/content/releases", label: "All", current: !status }, ...Object.entries(STATUS).map(([k, v]) => ({ href: `/admin/content/releases?status=${k}`, label: v[2], current: status === k }))]} />
      <Card label="Releases" pad={rows.length === 0}>
        {rows.length === 0 ? <Empty icon="rocket-launch" title={status ? "Nothing here" : "No releases yet"}>Send a lesson draft for review from the lesson editor. It shows here for a publisher.</Empty> : (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Release</th><th scope="col">Lessons</th><th scope="col">Status</th><th scope="col">Asked by</th><th scope="col">Decided</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
            <tbody>{rows.map((r) => {
              const [tone, icon, label] = STATUS[r.status] ?? ["off", "info", r.status];
              const mine = r.authors.includes(ctx.userId) || r.requestedBy === ctx.userId;
              return (
                <tr key={r.id}>
                  <td><span className="w6">{r.title}</span><span className="t-xs ink-2" style={{ display: "block" }}><When at={r.createdAt} rel /></span></td>
                  <td className="t-sm">{r.lessons.join(", ")}</td>
                  <td><St tone={tone} icon={icon}>{label}</St></td>
                  <td className="t-sm">{nm(r.requestedBy)}</td>
                  <td className="t-sm">{r.decidedBy ? <>{nm(r.decidedBy)} · <When at={r.decidedAt} rel /></> : "—"}</td>
                  <td style={{ textAlign: "end" }}><Link className={`a-btn sm${r.status === "in_review" && canPublish && !mine ? " pri" : ""}`} href={`/admin/content/releases/${r.id}`}><I n="eye" />{r.status === "in_review" && canPublish && !mine ? "Review" : "Open"}</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Card>
    </main>
  );
}
