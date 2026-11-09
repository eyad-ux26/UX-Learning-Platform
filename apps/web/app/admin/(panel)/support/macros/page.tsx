import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, requireAdmin } from "@/lib/admin/guard";
import { CATEGORY_LABEL } from "@/lib/admin/data/support";
import { Card, Empty, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Drawer } from "@/components/admin/forms";
import { saveMacro } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support macros" };

type Macro = { id: string; title: string; category: string; body_en: string; body_ar: string; actions: string[]; active: boolean; uses: number; updated_at: string };
const ACTIONS: [string, string][] = [["resend_signin", "Resend sign-in link"], ["status:waiting_learner", "Set status: Waiting on learner"], ["status:resolved", "Set status: Resolved"]];

function MacroFields({ m }: { m?: Macro }) {
  return (
    <>
      {m ? <input type="hidden" name="id" value={m.id} /> : null}
      <div className="a-field"><label htmlFor={`mc-t-${m?.id ?? "new"}`}>Name<span className="req" aria-hidden="true">*</span></label><input id={`mc-t-${m?.id ?? "new"}`} name="title" className="a-in" required maxLength={80} defaultValue={m?.title} /></div>
      <div className="a-field"><label htmlFor={`mc-c-${m?.id ?? "new"}`}>Category</label><select id={`mc-c-${m?.id ?? "new"}`} name="category" className="a-in" defaultValue={m?.category ?? "other"}>{Object.entries(CATEGORY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}><legend className="t-sm w6" style={{ marginBottom: 6 }}>Actions that run when the reply is sent</legend>
        {ACTIONS.map(([k, l]) => <label key={k} className="a-row t-sm" style={{ gap: 6 }}><input type="checkbox" name="actions" value={k} defaultChecked={m?.actions.includes(k)} />{l}</label>)}
        <span className="help">Actions use the agent’s own permissions. If the agent can’t run one, the reply is not sent and they are told why.</span></fieldset>
      <p className="t-xs ink-2">Insert: {"{first_name} {plan} {renewal_date} {agent_name}"}</p>
      <div className="a-field"><label htmlFor={`mc-en-${m?.id ?? "new"}`}>English<span className="req" aria-hidden="true">*</span></label><textarea id={`mc-en-${m?.id ?? "new"}`} name="body_en" className="a-ta" rows={6} required maxLength={5000} defaultValue={m?.body_en} lang="en" /></div>
      <div className="a-field"><label htmlFor={`mc-ar-${m?.id ?? "new"}`}>Arabic · العربية<span className="req" aria-hidden="true">*</span></label><textarea id={`mc-ar-${m?.id ?? "new"}`} name="body_ar" className="a-ta" rows={6} required maxLength={5000} defaultValue={m?.body_ar} dir="rtl" lang="ar" />
        <span className="help">Written right to left. Placeholders stay as they are.</span></div>
      <label className="a-row t-sm" style={{ gap: 6 }}><input type="checkbox" name="active" value="on" defaultChecked={m?.active ?? true} />Live (agents can use it)</label>
      <input type="hidden" name="active" value="off" />
    </>
  );
}

export default async function MacrosPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "support.view")) return <NoAccess what="Support macros" roles="a support role" />;
  const { data } = await createAdminClient().from("support_macros").select("id, title, category, body_en, body_ar, actions, active, uses, updated_at").order("category").order("title");
  const macros = (data ?? []) as Macro[];
  const edit = allowed(ctx, "support.macros");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/support", label: "Support inbox" }, { label: "Macros" }]} title="Macros" sub="Saved replies in English and Arabic. A macro can also run actions on the learner’s account."
        actions={edit ? <Drawer label="New macro" title="New macro" icon="plus" primary action={saveMacro} submit="Save macro"><MacroFields /></Drawer> : null} />
      {!edit ? <Note>Your role can use macros but not change them.</Note> : null}
      <Card label="Macros" pad={false}>
        {macros.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Macro</th><th scope="col">Category</th><th scope="col">Actions</th><th scope="col">Used</th><th scope="col">Status</th><th scope="col"><span className="sr">Edit</span></th></tr></thead>
            <tbody>{macros.map((m) => (
              <tr key={m.id}>
                <td><b>{m.title}</b><span className="t-xs ink-3" style={{ display: "block", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.body_en.split("\n").find((l) => l.trim() && !l.startsWith("Hi")) ?? ""}</span></td>
                <td>{CATEGORY_LABEL[m.category] ?? m.category} · EN AR</td>
                <td className="t-sm">{m.actions.length ? m.actions.map((a) => ACTIONS.find(([k]) => k === a)?.[1] ?? a).join(" · ") : <span className="ink-3">Reply only</span>}</td>
                <td className="num">{m.uses}</td>
                <td>{m.active ? <St tone="good">Live</St> : <St tone="off">Off</St>}<span className="t-xs ink-3" style={{ display: "block" }}>Edited <When at={m.updated_at} /></span></td>
                <td>{edit ? <Drawer label="Edit" title={`Edit “${m.title}”`} action={saveMacro} submit="Save changes"><MacroFields m={m} /></Drawer> : null}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <Empty icon="lightning" title="No macros yet" />}
      </Card>
    </main>
  );
}
