import { allowed, requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { approvalStates } from "@/lib/admin/data/comms";
import { Card, Empty, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm, Drawer } from "@/components/admin/forms";
import { COMMS_STATUS, CommsTabs, cairoLocal } from "@/components/admin/CommsTabs";
import { backToDraft, cancelCampaign, saveCampaign, scheduleCampaign, testCampaign } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email campaigns" };

type C = { id: string; name: string; subject: { en: string; ar: string }; body: { en: string; ar: string }; button: { en: string; ar: string; href: string } | null; audience: string; send_at: string | null;
  status: string; approval_id: string | null; audience_count: number | null; held_note?: string | null; sent_count: number; failed_count: number };
const AUD: Record<string, string> = { all: "Everyone", free: "Free learners", pro: "Pro learners", trial: "Learners in a trial" };

function Fields({ c }: { c?: C }) {
  const k = c?.id ?? "n";
  return (
    <>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="a-field"><label htmlFor={`n-${k}`}>Name (only the team sees it)<span className="req" aria-hidden="true">*</span></label><input id={`n-${k}`} name="name" className="a-in" minLength={3} maxLength={80} required defaultValue={c?.name} /></div>
      <div className="a-field"><label htmlFor={`s-en-${k}`}>Subject in English<span className="req" aria-hidden="true">*</span></label><input id={`s-en-${k}`} name="subject_en" className="a-in" lang="en" dir="ltr" minLength={3} maxLength={120} required defaultValue={c?.subject.en} /></div>
      <div className="a-field"><label htmlFor={`s-ar-${k}`}>Subject in Arabic<span className="req" aria-hidden="true">*</span></label><input id={`s-ar-${k}`} name="subject_ar" className="a-in a-ar" lang="ar" dir="rtl" minLength={3} maxLength={120} required defaultValue={c?.subject.ar} /></div>
      <div className="a-field"><label htmlFor={`b-en-${k}`}>Text in English<span className="req" aria-hidden="true">*</span></label><textarea id={`b-en-${k}`} name="body_en" className="a-ta" rows={6} lang="en" dir="ltr" minLength={10} maxLength={4000} required defaultValue={c?.body.en} /><span className="help">Plain text. A blank line starts a new paragraph.</span></div>
      <div className="a-field"><label htmlFor={`b-ar-${k}`}>Text in Arabic<span className="req" aria-hidden="true">*</span></label><textarea id={`b-ar-${k}`} name="body_ar" className="a-ta a-ar" rows={6} lang="ar" dir="rtl" minLength={10} maxLength={4000} required defaultValue={c?.body.ar} /></div>
      <div className="a-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="a-field a-grow"><label htmlFor={`bt-en-${k}`}>Button in English</label><input id={`bt-en-${k}`} name="button_en" className="a-in" maxLength={40} defaultValue={c?.button?.en} /></div>
        <div className="a-field a-grow"><label htmlFor={`bt-ar-${k}`}>Button in Arabic</label><input id={`bt-ar-${k}`} name="button_ar" className="a-in a-ar" dir="rtl" lang="ar" maxLength={40} defaultValue={c?.button?.ar} /></div>
        <div className="a-field a-grow"><label htmlFor={`bt-l-${k}`}>Button link</label><input id={`bt-l-${k}`} name="button_link" className="a-in" placeholder="/paths" maxLength={120} defaultValue={c?.button?.href} /></div>
      </div>
      <div className="a-row" style={{ gap: 8 }}>
        <div className="a-field a-grow"><label htmlFor={`au-${k}`}>Who gets it</label><select id={`au-${k}`} name="audience" className="a-in" defaultValue={c?.audience ?? "all"}>{Object.entries(AUD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="a-field a-grow"><label htmlFor={`at-${k}`}>Send from (Cairo time)</label><input id={`at-${k}`} type="datetime-local" name="send_at" className="a-in" required defaultValue={cairoLocal(c?.send_at ?? Date.now() + 86_400_000)} /></div>
      </div>
      <p className="t-xs ink-3">Only learners who did not turn off news emails get it, each in their own language. Every email has a one-click link to turn news emails off.</p>
    </>
  );
}

/** COM-2: email campaigns to learners. Sent in batches of about 100 every 15 minutes from the send time. */
export default async function CampaignsPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "comms.view")) return <NoAccess what="Communications" roles="a marketing or admin role" />;
  const { data, error } = await createAdminClient().from("campaigns").select("*").order("created_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as C[];
  const ap = await approvalStates(rows.map((r) => r.approval_id));
  const can = allowed(ctx, "comms.send");
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Grow" }, { label: "Communications" }]} title="Communications" sub="Banners in the learner app, emails to learners, and the emails the app sends by itself."
        actions={can && !error ? <Drawer label="New campaign" icon="envelope-simple" primary title="New email campaign" action={saveCampaign} submit="Save draft"><Fields /></Drawer> : null} />
      <CommsTabs current="campaigns" />
      {error ? <Note icon="warning">Migration 0063 is not in the database yet.</Note> : null}
      <Card label="Campaigns" pad={false}>
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Campaign</th><th scope="col">Who</th><th scope="col">Send from</th><th scope="col">Status</th><th scope="col" className="num">Sent</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{rows.map((c) => {
              const [tone, icon, label] = COMMS_STATUS[c.status] ?? ["off", "info", c.status];
              const apState = c.approval_id ? ap.get(c.approval_id) : null;
              return (
                <tr key={c.id}>
                  <td style={{ maxWidth: 360 }}><b className="t-sm">{c.name}</b><span className="t-xs ink-2" style={{ display: "block" }}>{c.subject.en}</span><span className="t-xs ink-2" dir="rtl" lang="ar" style={{ display: "block" }}>{c.subject.ar}</span></td>
                  <td className="t-sm">{AUD[c.audience]}{c.audience_count != null ? <span className="t-xs ink-2" style={{ display: "block" }}>≈ {c.audience_count.toLocaleString("en")}</span> : null}</td>
                  <td className="t-sm">{c.send_at ? <When at={c.send_at} /> : "—"}</td>
                  <td><St tone={tone} icon={icon}>{label}</St>{apState && apState !== "waiting" && c.status === "waiting_approval" ? <span className="t-xs ink-2" style={{ display: "block" }}>Approval {apState}</span> : null}{c.status === "draft" && c.held_note ? <span className="t-xs ink-warn" style={{ display: "block" }}>{c.held_note}</span> : null}</td>
                  <td className="num">{c.sent_count.toLocaleString("en")}{c.failed_count ? <span className="t-xs" style={{ display: "block", color: "var(--bad-ink)" }}>{c.failed_count} failed</span> : null}</td>
                  <td style={{ textAlign: "end" }}>
                    {can ? <div className="a-row" style={{ gap: 6, justifyContent: "end", flexWrap: "wrap" }}>
                      {c.status === "draft" ? <>
                        <Drawer label="Edit" icon="pencil-simple" title="Edit campaign" action={saveCampaign} submit="Save draft"><Fields c={c} /></Drawer>
                        <Confirm action={testCampaign} small ghost label="Send a test" icon="paper-plane-tilt" title="Send a test to yourself" reason={false} hidden={[{ name: "id", value: c.id }]} confirmLabel="Send test">
                          <div className="a-field"><label htmlFor={`tl-${c.id}`}>Language</label><select id={`tl-${c.id}`} name="locale" className="a-in"><option value="en">English</option><option value="ar">Arabic</option></select><span className="help">Goes to {ctx.email} only.</span></div>
                        </Confirm>
                        <Confirm action={scheduleCampaign} small label="Schedule" icon="clock-counter-clockwise" title="Schedule this campaign?" hidden={[{ name: "id", value: c.id }]}
                          effects={[{ icon: "envelope-simple", text: `${AUD[c.audience]} who get news emails, from the send time, about 100 every 15 minutes.` }, { icon: "scales", text: "Over 500 people, a second team member approves it first." }]} />
                      </> : null}
                      {c.status === "waiting_approval" && apState && apState !== "waiting" ? <Confirm action={backToDraft} small label="Back to draft" icon="pencil-simple" title="Edit it again?" reason={false} hidden={[{ name: "id", value: c.id }, { name: "type", value: "campaign" }]} /> : null}
                      {["scheduled", "sending", "waiting_approval"].includes(c.status) ? <Confirm action={cancelCampaign} small danger label="Stop" icon="minus-circle" title="Stop this campaign?" hidden={[{ name: "id", value: c.id }]} effects={[{ icon: "envelope-simple", text: c.sent_count ? `${c.sent_count} people already got it. Nobody else will.` : "Nobody gets it." }]} /> : null}
                    </div> : null}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="envelope-simple" title="No campaigns yet">A campaign is an email in English and Arabic to a group of learners, for news such as a new path.</Empty>}
      </Card>
    </main>
  );
}
