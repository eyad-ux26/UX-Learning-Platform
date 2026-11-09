import Link from "next/link";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { contentTree } from "@/lib/admin/data/content";
import { skillsFor } from "@/lib/admin/data/quality";
import { Card, Empty, Id, NoAccess, Note, PageHead } from "@/components/admin/ui";
import { ContentTabs } from "@/components/admin/ContentTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Skills and misconceptions" };

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

/** CNT-4: every skill of a path with how learners do on it, and the misconceptions they hit most. */
export default async function SkillsPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "content.view")) return <NoAccess what="Content" roles="a content role" />;
  const { paths } = await contentTree();
  const built = paths.filter((p) => p.built);
  const sp = await searchParams;
  const open = built.find((p) => p.id === sp.path) ?? built[0];
  const data = open ? await skillsFor(open.id) : null;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Content", href: "/admin/content" }, { label: "Skills and misconceptions" }]} title="Skills and misconceptions" sub="How learners do on each skill: first tries right, and how many reached Shown and Kept. Skills change in the content files." />
      <ContentTabs current="skills" />
      <div className="a-row" style={{ gap: 6, flexWrap: "wrap" }}>{built.map((p) => <Link key={p.id} className="a-btn sm" href={`/admin/content/skills?path=${p.id}`} aria-current={p.id === open?.id ? "true" : undefined}><Id>{p.id}</Id> {p.name}</Link>)}</div>
      {data && !data.ready ? <Note icon="warning">Migration 0063 is not in the database yet, so the numbers are empty.</Note> : null}
      {data ? (
        <>
          <Card label="Skills" pad={false}>
            {data.rows.length ? (
              <div className="a-tbl-wrap"><table className="a-tbl">
                <thead><tr><th scope="col">Skill</th><th scope="col">Unit</th><th scope="col" className="num">First tries</th><th scope="col" className="num">Right first time</th><th scope="col" className="num">Shown</th><th scope="col" className="num">Kept</th></tr></thead>
                <tbody>{data.rows.map((s) => (
                  <tr key={s.id}>
                    <td style={{ maxWidth: 360 }}><Id>{s.id}</Id> <span className="t-sm w6">{s.title.en}</span><span className="t-xs ink-2" dir="rtl" lang="ar" style={{ display: "block" }}>{s.title.ar}</span></td>
                    <td className="t-sm"><Id>{s.unitId}</Id> {s.unitTitle}</td>
                    <td className="num">{s.firstTries.toLocaleString("en")}</td>
                    <td className="num">{pct(s.firstRight, s.firstTries)}</td>
                    <td className="num">{s.shown.toLocaleString("en")}</td>
                    <td className="num">{s.kept.toLocaleString("en")}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <Empty icon="star" title="No skills in this path yet" />}
          </Card>
          <Card label="Misconceptions" title="Misconceptions hit most (last 90 days)" pad={false}>
            {data.misconceptions.length ? (
              <div className="a-tbl-wrap"><table className="a-tbl">
                <thead><tr><th scope="col">Misconception</th><th scope="col" className="num">First tries that hit it</th></tr></thead>
                <tbody>{data.misconceptions.slice(0, 30).map((m) => <tr key={m.id}><td><Id>{m.id}</Id></td><td className="num">{m.hits.toLocaleString("en")}</td></tr>)}</tbody>
              </table></div>
            ) : <Empty icon="star" title="No misconceptions hit yet" />}
          </Card>
        </>
      ) : <Card><Empty icon="book-open" title="No paths with lessons yet" /></Card>}
    </main>
  );
}
