import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnit } from "@uxgate/content";
import { requireAdmin, allowed } from "@/lib/admin/guard";
import { lessonForEditor, names } from "@/lib/admin/data/content";
import { Card, I, Id, KV, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { LessonEditor } from "@/components/admin/LessonEditor";
import { discardDraft, handBackLesson, saveDraft, sendForReview, withdrawRelease } from "../../actions";
import { isFresh } from "@/lib/admin/fresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lesson editor" };

const ORIGIN: Record<string, string> = { import: "v1 import", yaml: "Content files", editor: "Panel" };

export default async function LessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "content.view")) return <NoAccess what="The lesson editor" roles="a content role" />;
  const { id } = await params;
  const ed = await lessonForEditor(id);
  if (!ed) notFound();
  const unit = getUnit(ed.meta.unitId);
  const canEdit = allowed(ctx, "content.edit") && ed.ready;
  const inReview = ed.draft?.status === "in_review";
  const editorNames = await names(ed.draft?.editors ?? []);
  const start = ed.draft?.body ?? ed.base.body;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/content", label: "Content" }, { href: `/admin/content?path=${ed.meta.pathId}`, label: ed.meta.pathId }, { label: id }]}
        title={<span className="a-row" style={{ gap: 8 }}><Id>{id}</Id>{ed.meta.body.title.en}</span>}
        sub={<span dir="rtl" lang="ar">{ed.meta.body.title.ar}</span>}
        actions={<>
          {ed.draft && !inReview && canEdit ? <Confirm action={discardDraft} ghost danger label="Discard draft" title={`Discard the draft of ${id}?`} hidden={[{ name: "lesson", value: id }]} icon="trash"
            effects={[{ icon: "arrow-counter-clockwise", text: "Every unsaved and saved change in this draft goes. The live version stays as it is." }]} /> : null}
          {ed.live.panelOwned && allowed(ctx, "content.publish") && ed.ready && !inReview ? (
            <Confirm action={handBackLesson} label="Hand back to content files" icon="arrow-u-up-left" title={`Hand ${id} back to the content files?`} typed={id} fresh={isFresh(ctx)}
              hidden={[{ name: "lesson", value: id }]}
              effects={[
                { icon: "users-three", text: "While panel lessons are on, learners get the content files' version of this lesson within a minute." },
                { icon: "git-pull-request", text: "From then on, content PRs update this lesson again. The panel versions stay in the history." },
              ]} />
          ) : null}
          {inReview && ed.draft?.releaseId ? <Link className="a-btn" href={`/admin/content/releases/${ed.draft.releaseId}`}><I n="eye" />Open the release</Link> : null}
        </>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <Card title="This lesson" label="This lesson">
          <KV rows={[
            ["Unit", unit ? `${unit.id} · ${unit.title.en}` : ed.meta.unitId],
            ["Kind", ed.meta.mode === "bank" ? "Re-test bank" : ed.meta.mode === "check" ? "Skill check" : `Lesson · ${ed.meta.minutes} min`],
            ["Live", ed.base.no ? <St tone="good">v{ed.base.no}</St> : <St tone="off">Compiled files (not imported)</St>],
            ["Content PRs", !ed.live.how ? <span className="ink-3">—</span> : ed.live.panelOwned ? <St tone="wait" icon="lock-simple">Skipped: the panel owns this lesson</St>
              : ed.live.how === "rollback" ? <St tone="info">Rolled back: only new text from the content files comes in</St> : <St tone="good">Update this lesson</St>],
            ["Draft", ed.draft ? <span>{inReview ? <St tone="wait" icon="eye">In review</St> : <St tone="info" icon="pencil-simple">Draft</St>} <span className="t-xs ink-2">by {[...editorNames.values()].join(", ") || "—"}, <When at={ed.draft.updatedAt} rel /></span></span> : <span className="ink-3">None</span>],
          ]} />
        </Card>
        <Card title="Version history" label="Version history" pad={false}>
          {ed.history.length ? (
            <div className="a-tbl-wrap"><table className="a-tbl">
              <thead><tr><th scope="col">Version</th><th scope="col">From</th><th scope="col">When</th></tr></thead>
              <tbody>{ed.history.slice(0, 6).map((h) => <tr key={h.versionId}><td>v{h.no}{h.live ? <> <St tone="good">Live</St></> : null}</td><td className="t-sm">{ORIGIN[h.origin] ?? h.origin}{h.author ? ` · ${h.author}` : ""}</td><td className="t-sm"><When at={h.createdAt} rel /></td></tr>)}</tbody>
            </table></div>
          ) : <div className="a-card-b t-sm ink-2">No numbered versions yet. The v1 import numbers the current version.</div>}
        </Card>
      </div>
      {!ed.ready ? <Note icon="warning">Saving needs migration 0060 and the v1 import. You can read the lesson and its checks now.</Note> : null}
      {inReview ? <Note icon="lock-simple">This lesson is in review, so it cannot be changed. The person who sent it can withdraw the release to edit again.
        {ed.draft?.releaseId ? <span style={{ marginInlineStart: 8 }}><Confirm action={withdrawRelease} small label="Withdraw release" title="Withdraw this release?" reason={false} hidden={[{ name: "release", value: ed.draft.releaseId }]} icon="arrow-u-up-left" effects={[{ icon: "pencil-simple", text: "Every lesson in it becomes an editable draft again." }]} /></span> : null}</Note> : null}
      <Note icon="info">Words only. To add or remove steps, change answers, mocks or videos, use the content files and a pull request; the full validator runs there.</Note>
      <LessonEditor lessonId={id} base={ed.base.body} start={start} acks0={ed.draft?.acks ?? []} canEdit={canEdit} frozen={inReview} save={saveDraft} submit={sendForReview} previewKey={ed.draft?.updatedAt ?? ed.base.hash} />
    </main>
  );
}
