import Link from "next/link";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { contentTree, type LessonRow } from "@/lib/admin/data/content";
import { Card, Empty, I, Id, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { ContentTabs } from "@/components/admin/ContentTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paths and lessons" };

function LessonState({ l }: { l: LessonRow }) {
  if (l.draft?.status === "in_review") return <St tone="wait" icon="eye">In review</St>;
  if (l.draft) return <St tone="info" icon="pencil-simple">Draft</St>;
  if (l.liveNo) return <span><St tone="good">Live v{l.liveNo}{l.liveHow === "rollback" ? " · rolled back" : ""}</St>{l.panelOwned ? <span className="t-xs ink-2" style={{ display: "block" }}>Panel-owned: content PRs skip it</span> : null}</span>;
  return <St tone="off" icon="minus-circle">Not imported</St>;
}

/** CNT-1 and CNT-3: every path, unit and lesson with what is live, what is in draft and what is in review. */
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "content.view")) return <NoAccess what="Content" roles="a content role" />;
  const sp = await searchParams;
  const { paths, ready } = await contentTree();
  const built = paths.filter((p) => p.built);
  const open = paths.find((p) => p.id === sp.path) ?? built[0];
  const lessons = built.flatMap((p) => p.units.flatMap((u) => u.lessons));
  const drafts = lessons.filter((l) => l.draft?.status === "draft").length;
  const review = lessons.filter((l) => l.draft?.status === "in_review").length;
  const canEdit = allowed(ctx, "content.edit");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Content" }]} title="Paths and lessons"
        sub="What learners get now, and what is being changed. Words are edited here in English and Arabic side by side; new steps and answers still go through the content files."
        actions={<Link className="a-btn" href="/admin/content/releases"><I n="rocket-launch" />Releases{review ? <span className="a-count">{review}</span> : null}</Link>} />
      <ContentTabs current="paths" />
      {!ready ? <Note icon="warning">The content tables are not in the database yet (migration 0060 and then <span className="a-code">content-live.sql</span>). Until then the panel shows the compiled lessons and cannot save drafts.</Note> : null}
      <div className="a-kpis">
        <div className="a-kpi"><span className="t-xs ink-2">Paths with lessons</span><b className="num">{built.length} of {paths.length}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">Lessons and banks</span><b className="num">{lessons.length}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">Drafts</span><b className="num">{drafts}</b></div>
        <div className="a-kpi"><span className="t-xs ink-2">In review</span><b className="num">{review}</b></div>
      </div>
      <div className="a-side">
        <Card label="Paths" pad={false}>
          <nav className="a-tree" aria-label="Paths">
            <ul style={{ listStyle: "none", margin: 0, padding: 8 }}>
              {paths.map((p) => (
                <li key={p.id}>
                  {p.built ? (
                    <Link href={`/admin/content?path=${p.id}`} aria-current={p.id === open?.id ? "page" : undefined} className="a-row t-sm" style={{ gap: 8, padding: "6px 8px", borderRadius: 8, background: p.id === open?.id ? "var(--surface-2)" : undefined }}>
                      <Id>{p.id}</Id><span className="a-grow">{p.name}</span><span className="t-xs ink-3">{p.units.length} units</span>
                    </Link>
                  ) : (
                    <span className="a-row t-sm ink-3" style={{ gap: 8, padding: "6px 8px" }}><Id>{p.id}</Id><span className="a-grow">{p.name}</span><span className="t-xs">Coming soon</span></span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </Card>
        {open ? (
          <div className="a-stack">
            {open.units.map((u) => (
              <Card key={u.id} label={u.title.en} title={<span className="a-row" style={{ gap: 8 }}><Id>{u.id}</Id>{u.title.en}{u.free ? <St tone="info" icon="gift">Free</St> : null}</span>}
                actions={<span className="t-xs ink-2">{u.skills} skills</span>} pad={false}>
                <p className="a-ar t-sm" dir="rtl" lang="ar" style={{ margin: "0 16px 8px" }}>{u.title.ar}</p>
                <div className="a-tbl-wrap">
                  <table className="a-tbl">
                    <thead><tr><th scope="col">Lesson</th><th scope="col">Arabic title</th><th scope="col">Kind</th><th scope="col">Status</th><th scope="col">Changed</th><th scope="col"><span className="sr">Open</span></th></tr></thead>
                    <tbody>
                      {u.lessons.map((l) => (
                        <tr key={l.id}>
                          <td><Id>{l.id}</Id> <span className="w6">{l.title.en}</span></td>
                          <td><span dir="rtl" lang="ar" className="t-sm">{l.title.ar}</span></td>
                          <td className="t-sm">{l.mode === "bank" ? "Re-test bank" : l.mode === "check" ? "Skill check" : `Lesson · ${l.minutes} min`}</td>
                          <td><LessonState l={l} /></td>
                          <td className="t-sm"><When at={l.draft?.updatedAt ?? l.liveSince} rel /></td>
                          <td style={{ textAlign: "end" }}><Link className="a-btn sm" href={`/admin/content/lessons/${l.id}`}><I n={canEdit ? "pencil-simple" : "eye"} />{canEdit ? "Edit" : "Open"}</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        ) : <Card><Empty icon="book-open" title="No paths with lessons yet" /></Card>}
      </div>
    </main>
  );
}
