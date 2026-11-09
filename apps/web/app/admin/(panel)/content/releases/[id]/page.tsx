import Link from "next/link";
import { notFound } from "next/navigation";
import { getLessonMeta } from "@uxgate/content";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { recentPlayers, releaseDetail } from "@/lib/admin/data/content";
import { diffText } from "@/lib/admin/content-edit";
import { Card, I, Id, KV, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { RELEASE_STATUS } from "@/components/admin/ContentTabs";
import { declineRelease, publishRelease, rollbackRelease, withdrawRelease } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Release" };

/** CNT-5, CNT-6: review a release with the change per language, the automatic checks, then publish or roll back. */
export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "releases.view", "content.view")) return <NoAccess what="Releases" roles="a content role" />;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const d = await releaseDetail(id);
  if (!d) notFound();
  const { release: r, items, names } = d;
  const nm = (u: string | null) => (u ? names.get(u) ?? "Someone" : "—");
  const [tone, icon, label] = RELEASE_STATUS[r.status] ?? ["off", "info", r.status];
  const author = r.authors.includes(ctx.userId) || r.requestedBy === ctx.userId;
  const canPublish = allowed(ctx, "content.publish") && !author;
  const fresh = isFresh(ctx);
  const reach = r.status === "in_review" || r.status === "published" ? await recentPlayers(r.lessons) : 0;
  const stale = items.some((i) => r.status === "in_review" && i.liveVersionId !== i.fromVersionId);
  const checks = (r.checks.checks ?? (r.checks as { lessons?: { lesson: string; checks: { id: string; label: string; ok: boolean; detail?: string }[] }[] }).lessons?.flatMap((l) => l.checks.map((c) => ({ ...c, label: `${l.lesson}: ${c.label}` }))) ?? []);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/content", label: "Content" }, { href: "/admin/content/releases", label: "Releases" }, { label: r.title }]} title={r.title}
        sub={<St tone={tone} icon={icon}>{label}</St>}
        actions={<>
          {r.status === "in_review" && (r.requestedBy === ctx.userId || allowed(ctx, "content.publish")) ? <Confirm action={withdrawRelease} ghost label="Withdraw" title="Withdraw this release?" reason={false} hidden={[{ name: "release", value: r.id }]} icon="arrow-u-up-left" effects={[{ icon: "pencil-simple", text: "The lessons become editable drafts again. Nothing changes for learners." }]} /> : null}
          {r.status === "in_review" && canPublish ? <Confirm action={declineRelease} label="Send back" title="Send this release back?" reasonLabel="What needs to change (the authors see this)" hidden={[{ name: "release", value: r.id }]} icon="arrow-u-up-left" /> : null}
          {r.status === "in_review" && canPublish ? (
            <Confirm action={publishRelease} label="Publish" title={`Publish “${r.title}”?`} fresh={fresh} typed="PUBLISH" hidden={[{ name: "release", value: r.id }]} icon="rocket-launch" reasonLabel="Note (saved in the audit log)"
              disabled={stale ? "A lesson changed since this was sent. Send it back." : undefined}
              effects={[
                { icon: "users-three", text: <>Reaches about <b>{reach.toLocaleString("en")}</b> learners who played these lessons in the last 30 days, and everyone after them.</> },
                { icon: "play", text: "A learner in the middle of one of these lessons finishes the version they started; answers already given stay scored on it." },
                { icon: "toggle-right", text: "Learners get panel versions while the flag “Lessons from the panel” (content_db) is on. Off, they keep the compiled lessons." },
                { icon: "clock-counter-clockwise", text: "You can roll back later with a reason." },
              ]} />
          ) : null}
          {r.status === "published" && canPublish ? (
            <Confirm action={rollbackRelease} danger label="Roll back" title={`Roll back “${r.title}”?`} fresh={fresh} typed="ROLL BACK" hidden={[{ name: "release", value: r.id }]} icon="arrow-counter-clockwise"
              effects={[{ icon: "arrow-counter-clockwise", text: "Each lesson goes back to the version it replaced, for every learner." }, { icon: "pencil-simple", text: "The change is kept as a draft so it can be fixed and sent again." }, { icon: "users-three", text: <>About <b>{reach.toLocaleString("en")}</b> recent learners.</> }]} />
          ) : null}
        </>} />
      {r.status === "in_review" && author ? <Note icon="user-circle">You wrote part of this release, so another publisher must review and publish it.</Note> : null}
      {stale ? <Note icon="warning">A lesson in this release changed since it was sent (a newer version went live). Send it back so the authors can redo the change on the new version.</Note> : null}
      <div className="a-fit" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
        <Card title="About this release" label="About this release">
          <KV rows={[
            ["Asked by", <>{nm(r.requestedBy)} · <When at={r.createdAt} rel /></>],
            ["Authors", r.authors.map(nm).join(", ") || "—"],
            ["Note", r.note ?? <span className="ink-3">None</span>],
            ...(r.decidedBy ? [[r.status === "declined" ? "Sent back by" : r.status === "withdrawn" ? "Withdrawn by" : "Published by", <>{nm(r.decidedBy)} · <When at={r.decidedAt} rel />{r.decisionNote ? <span className="t-xs ink-2" style={{ display: "block" }}>{r.decisionNote}</span> : null}</>] as [string, React.ReactNode]] : []),
            ...(r.rolledBackBy ? [["Rolled back by", <>{nm(r.rolledBackBy)} · <When at={r.rolledBackAt} rel /><span className="t-xs ink-2" style={{ display: "block" }}>{r.rollbackReason}</span></>] as [string, React.ReactNode]] : []),
          ]} />
        </Card>
        <Card title="Automatic checks" label="Automatic checks">
          {checks.length ? <ul className="a-effects">{checks.map((c, i) => <li key={i}><I n={c.ok ? "check-circle-fill" : "x-circle"} /><span className="t-sm">{c.label}{c.detail ? <span className="t-xs ink-2"> · {c.detail}</span> : null}</span></li>)}</ul> : <span className="t-sm ink-2">Run when it was sent.</span>}
        </Card>
      </div>
      {items.map((it) => {
        const meta = getLessonMeta(it.lessonId);
        const diff = it.from ? diffText(it.from, it.body) : [];
        const src = r.status === "in_review" || r.status === "declined" || r.status === "withdrawn" ? `release:${r.id}` : "live";
        return (
          <Card key={it.lessonId} label={it.lessonId} title={<span className="a-row" style={{ gap: 8 }}><Id>{it.lessonId}</Id>{meta?.body.title.en}</span>}
            actions={<span className="a-row" style={{ gap: 6 }}>
              <Link className="a-btn sm" href={`/en/preview/lesson/${it.lessonId}?src=${src}`} target="_blank"><I n="device-mobile" />English preview</Link>
              <Link className="a-btn sm" href={`/ar/preview/lesson/${it.lessonId}?src=${src}`} target="_blank"><I n="device-mobile" />Arabic preview</Link>
              <Link className="a-btn sm ghost" href={`/admin/content/lessons/${it.lessonId}`}>Editor</Link>
            </span>} pad={false}>
            {diff.length ? (
              <div className="a-tbl-wrap"><table className="a-tbl">
                <thead><tr><th scope="col">Where</th><th scope="col">English</th><th scope="col">Arabic</th></tr></thead>
                <tbody>{diff.map((x) => (
                  <tr key={x.path}>
                    <td className="t-sm"><Id>{x.stepId ?? "Lesson"}</Id> {x.label}</td>
                    <td className="t-sm">{x.en ? <div className="a-diff"><del>{x.en[0]}</del><ins>{x.en[1]}</ins></div> : <span className="ink-3">No change</span>}</td>
                    <td className="t-sm" dir="rtl" lang="ar">{x.ar ? <div className="a-diff"><del>{x.ar[0]}</del><ins>{x.ar[1]}</ins></div> : <span className="ink-3" dir="ltr">No change</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <div className="a-card-b t-sm ink-2">{it.from ? "No text changes." : "New lesson version."}</div>}
          </Card>
        );
      })}
    </main>
  );
}
