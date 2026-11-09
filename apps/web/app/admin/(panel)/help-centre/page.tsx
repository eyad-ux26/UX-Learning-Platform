import { allowed, requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { names } from "@/lib/admin/data/content";
import { Card, Empty, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm, Drawer } from "@/components/admin/forms";
import { deleteArticle, publishArticle, saveArticle } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help centre" };

type A = { id: string; slug: string; topic: string; title: { en: string; ar: string }; body: { en: string; ar: string }; status: string; updated_by: string | null; updated_at: string; published_at: string | null };
const TOPIC: Record<string, string> = { account: "Account and sign-in", learning: "Lessons and progress", billing: "Plans and payments", certificates: "Certificates", technical: "Technical problems" };

function Fields({ a }: { a?: A }) {
  const k = a?.id ?? "n";
  return (
    <>
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <div className="a-row" style={{ gap: 8 }}>
        <div className="a-field a-grow"><label htmlFor={`sl-${k}`}>Short name<span className="req" aria-hidden="true">*</span></label><input id={`sl-${k}`} name="slug" className="a-in a-code" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} required defaultValue={a?.slug} placeholder="reset-password" /></div>
        <div className="a-field a-grow"><label htmlFor={`tp-${k}`}>Topic</label><select id={`tp-${k}`} name="topic" className="a-in" defaultValue={a?.topic ?? "account"}>{Object.entries(TOPIC).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      </div>
      <div className="a-field"><label htmlFor={`te-${k}`}>Question in English<span className="req" aria-hidden="true">*</span></label><input id={`te-${k}`} name="title_en" className="a-in" lang="en" dir="ltr" maxLength={120} required defaultValue={a?.title.en} /></div>
      <div className="a-field"><label htmlFor={`ta-${k}`}>Question in Arabic<span className="req" aria-hidden="true">*</span></label><input id={`ta-${k}`} name="title_ar" className="a-in a-ar" lang="ar" dir="rtl" maxLength={120} required defaultValue={a?.title.ar} /></div>
      <div className="a-field"><label htmlFor={`be-${k}`}>Answer in English<span className="req" aria-hidden="true">*</span></label><textarea id={`be-${k}`} name="body_en" className="a-ta" rows={6} lang="en" dir="ltr" maxLength={8000} required defaultValue={a?.body.en} /></div>
      <div className="a-field"><label htmlFor={`ba-${k}`}>Answer in Arabic<span className="req" aria-hidden="true">*</span></label><textarea id={`ba-${k}`} name="body_ar" className="a-ta a-ar" rows={6} lang="ar" dir="rtl" maxLength={8000} required defaultValue={a?.body.ar} /><span className="help">Simple Arabic; keep English UX terms with a short explanation.</span></div>
    </>
  );
}

/** SUP-11: help articles learners read in Settings, then Help, in their own language. */
export default async function HelpCentrePage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "help.view")) return <NoAccess what="Help centre" roles="a support or content role" />;
  const { data, error } = await createAdminClient().from("help_articles").select("id, slug, topic, title, body, status, updated_by, updated_at, published_at").order("topic").order("updated_at", { ascending: false });
  const rows = (data ?? []) as A[];
  const who = await names(rows.map((r) => r.updated_by).filter(Boolean) as string[]);
  const can = allowed(ctx, "help.edit");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "People" }, { label: "Help centre" }]} title="Help centre" sub="Answers learners find in Settings, then Help, after the five quick answers. Each one in English and Arabic."
        actions={can && !error ? <Drawer label="New article" icon="books" primary title="New help article" action={saveArticle} submit="Save as draft"><Fields /></Drawer> : null} />
      {error ? <Note icon="warning">Migration 0063 is not in the database yet.</Note> : null}
      <Card label="Articles" pad={false}>
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Article</th><th scope="col">Topic</th><th scope="col">Status</th><th scope="col">Changed</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id}>
                <td style={{ maxWidth: 420 }}><b className="t-sm">{a.title.en}</b><span className="t-xs ink-2" dir="rtl" lang="ar" style={{ display: "block" }}>{a.title.ar}</span><span className="a-code t-xs ink-3">{a.slug}</span></td>
                <td className="t-sm">{TOPIC[a.topic] ?? a.topic}</td>
                <td>{a.status === "published" ? <St tone="good" icon="check-circle-fill">Published</St> : <St tone="info" icon="pencil-simple">Draft</St>}</td>
                <td className="t-sm"><When at={a.updated_at} rel />{a.updated_by ? <span className="t-xs ink-2" style={{ display: "block" }}>{who.get(a.updated_by) ?? ""}</span> : null}</td>
                <td style={{ textAlign: "end" }}>{can ? <div className="a-row" style={{ gap: 6, justifyContent: "end" }}>
                  <Drawer label="Edit" icon="pencil-simple" title="Edit help article" action={saveArticle} submit="Save"><Fields a={a} /></Drawer>
                  <Confirm action={publishArticle} small label={a.status === "published" ? "Unpublish" : "Publish"} icon={a.status === "published" ? "eye-slash" : "eye"} reason={false}
                    title={a.status === "published" ? "Hide this article from learners?" : "Publish this article?"} hidden={[{ name: "id", value: a.id }, { name: "on", value: a.status === "published" ? "0" : "1" }]} />
                  {a.status !== "published" ? <Confirm action={deleteArticle} small ghost danger label="Delete" icon="x" reason={false} title="Delete this draft?" hidden={[{ name: "id", value: a.id }]} /> : null}
                </div> : null}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <Empty icon="books" title="No articles yet">Write answers to the questions support gets most, in English and Arabic.</Empty>}
      </Card>
    </main>
  );
}
