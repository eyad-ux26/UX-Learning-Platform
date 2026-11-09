import Link from "next/link";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { clips } from "@/lib/admin/data/media";
import { bunnyConfigured } from "@/lib/server/bunny";
import { Card, Empty, Id, NoAccess, Note, PageHead, St } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media library" };

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

/** MED-1: every video clip in the lessons, where it is used, and whether its captions are complete in both languages. */
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "media.view", "media.own")) return <NoAccess what="Media library" roles="a content role or instructor" />;
  const all = await clips();
  const path = (await searchParams).path;
  const paths = [...new Set(all.flatMap((c) => c.pathIds))].sort();
  const list = path ? all.filter((c) => c.pathIds.includes(path)) : all;
  const total = list.reduce((a, c) => a + c.seconds, 0);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Content" }, { label: "Media library" }]} title="Media library" sub={`${list.length} clips · ${mmss(total)} in all. Clips are hosted on Bunny Stream and placed in lessons through the content files.`} />
      {!bunnyConfigured() ? <Note icon="warning">Bunny is not set up on this server (BUNNY_STREAM_CDN_HOST and BUNNY_STREAM_TOKEN_KEY), so clips do not play here.</Note> : null}
      <Note>Replacing a clip, or uploading a new one, happens in Bunny Stream and then in the lesson&apos;s content file, so the clip id and its captions change together in one reviewed change. Captions are built from each clip&apos;s transcript, in English and Arabic.</Note>
      <div className="a-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <Link className="a-btn sm" href="/admin/media" aria-current={!path ? "true" : undefined}>All paths</Link>
        {paths.map((p) => <Link key={p} className="a-btn sm" href={`/admin/media?path=${p}`} aria-current={p === path ? "true" : undefined}>{p}</Link>)}
      </div>
      <Card label="Clips" pad={false}>
        {list.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Clip</th><th scope="col" className="num">Length</th><th scope="col">Captions</th><th scope="col">Used in</th></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id}>
                <td style={{ maxWidth: 340 }}><b className="t-sm">{c.title?.en ?? "Untitled clip"}</b>{c.title ? <span className="t-xs ink-2" dir="rtl" lang="ar" style={{ display: "block" }}>{c.title.ar}</span> : null}<span className="a-code t-xs ink-3">{c.id}</span></td>
                <td className="num">{mmss(c.seconds)}</td>
                <td>{c.captionsOk ? <St tone="good" icon="check-circle-fill">EN and AR, {c.lines} lines</St> : <St tone="bad" icon="warning">A line is missing a language</St>}</td>
                <td className="t-sm">{c.uses.map((u) => <span key={`${u.lessonId}-${u.stepId}`} style={{ display: "block" }}><Link href={`/admin/content/lessons/${u.lessonId}`}><Id>{u.lessonId}</Id> <Id>{u.stepId}</Id></Link> {u.lessonTitle}</span>)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <Empty icon="film-strip" title="No clips in lessons yet" />}
      </Card>
    </main>
  );
}
