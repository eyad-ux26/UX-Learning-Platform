import { allowed, requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { flagOn } from "@/lib/app-config";
import { approvalStates } from "@/lib/admin/data/comms";
import { Card, Empty, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm, Drawer } from "@/components/admin/forms";
import { COMMS_STATUS, CommsTabs, cairoLocal } from "@/components/admin/CommsTabs";
import { backToDraft, cancelAnnouncement, saveAnnouncement, scheduleAnnouncement } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Announcements" };

type A = { id: string; title: { en: string; ar: string }; body: { en: string; ar: string }; link: string | null; audience: string; starts_at: string; ends_at: string; status: string; approval_id: string | null; audience_count: number | null };
const AUD: Record<string, string> = { all: "Everyone", free: "Free learners", pro: "Pro learners" };

function Fields({ a }: { a?: A }) {
  const now = Date.now();
  return (
    <>
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <div className="a-field"><label htmlFor={`t-en-${a?.id ?? "n"}`}>Title in English<span className="req" aria-hidden="true">*</span></label><input id={`t-en-${a?.id ?? "n"}`} name="title_en" className="a-in" lang="en" dir="ltr" minLength={3} maxLength={80} required defaultValue={a?.title.en} /></div>
      <div className="a-field"><label htmlFor={`t-ar-${a?.id ?? "n"}`}>Title in Arabic<span className="req" aria-hidden="true">*</span></label><input id={`t-ar-${a?.id ?? "n"}`} name="title_ar" className="a-in a-ar" lang="ar" dir="rtl" minLength={3} maxLength={80} required defaultValue={a?.title.ar} /></div>
      <div className="a-field"><label htmlFor={`b-en-${a?.id ?? "n"}`}>Text in English<span className="req" aria-hidden="true">*</span></label><textarea id={`b-en-${a?.id ?? "n"}`} name="body_en" className="a-ta" rows={2} lang="en" dir="ltr" minLength={3} maxLength={240} required defaultValue={a?.body.en} /></div>
      <div className="a-field"><label htmlFor={`b-ar-${a?.id ?? "n"}`}>Text in Arabic<span className="req" aria-hidden="true">*</span></label><textarea id={`b-ar-${a?.id ?? "n"}`} name="body_ar" className="a-ta a-ar" rows={2} lang="ar" dir="rtl" minLength={3} maxLength={240} required defaultValue={a?.body.ar} /></div>
      <div className="a-field"><label htmlFor={`l-${a?.id ?? "n"}`}>Link (optional)</label><input id={`l-${a?.id ?? "n"}`} name="link" className="a-in" placeholder="/paths/P15" maxLength={120} defaultValue={a?.link ?? ""} /><span className="help">A page of the app: /app, /paths or /pricing, and what follows. The language is added for each learner.</span></div>
      <div className="a-field"><label htmlFor={`au-${a?.id ?? "n"}`}>Who sees it</label><select id={`au-${a?.id ?? "n"}`} name="audience" className="a-in" defaultValue={a?.audience ?? "all"}>{Object.entries(AUD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="a-row" style={{ gap: 8 }}>
        <div className="a-field a-grow"><label htmlFor={`s-${a?.id ?? "n"}`}>Starts (Cairo time)</label><input id={`s-${a?.id ?? "n"}`} type="datetime-local" name="starts_at" className="a-in" required defaultValue={cairoLocal(a?.starts_at ?? now)} /></div>
        <div className="a-field a-grow"><label htmlFor={`e-${a?.id ?? "n"}`}>Ends (Cairo time)</label><input id={`e-${a?.id ?? "n"}`} type="datetime-local" name="ends_at" className="a-in" required defaultValue={cairoLocal(a?.ends_at ?? now + 7 * 86_400_000)} /></div>
      </div>
    </>
  );
}

/** COM-3: in-app announcements, a banner at the top of the learner app while it runs. */
export default async function AnnouncementsPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "comms.view")) return <NoAccess what="Communications" roles="a marketing or admin role" />;
  const { data, error } = await createAdminClient().from("announcements").select("*").order("starts_at", { ascending: false }).limit(100);
  const rows = (data ?? []) as A[];
  const [on, ap] = await Promise.all([flagOn("announcements"), approvalStates(rows.map((r) => r.approval_id))]);
  const can = allowed(ctx, "comms.send");
  const now = Date.now();
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Grow" }, { label: "Communications" }]} title="Communications" sub="Banners in the learner app, emails to learners, and the emails the app sends by itself."
        actions={can && !error ? <Drawer label="New announcement" icon="megaphone" primary title="New announcement" action={saveAnnouncement} submit="Save draft"><Fields /></Drawer> : null} />
      <CommsTabs current="announcements" />
      {error ? <Note icon="warning">Migration 0063 is not in the database yet.</Note> : !on ? <Note>The announcements flag is off (Platform settings), so learners see no banner even when one is scheduled.</Note> : null}
      <Card label="Announcements" pad={false}>
        {rows.length ? (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Announcement</th><th scope="col">Who</th><th scope="col">When</th><th scope="col">Status</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{rows.map((a) => {
              const live = a.status === "scheduled" && new Date(a.starts_at).getTime() <= now && new Date(a.ends_at).getTime() > now;
              const ended = a.status === "scheduled" && new Date(a.ends_at).getTime() <= now;
              const [tone, icon, label] = live ? (["good", "megaphone", "Showing now"] as const) : ended ? (["off", "check", "Ended"] as const) : COMMS_STATUS[a.status] ?? ["off", "info", a.status];
              const apState = a.approval_id ? ap.get(a.approval_id) : null;
              return (
                <tr key={a.id}>
                  <td style={{ maxWidth: 380 }}><b className="t-sm">{a.title.en}</b><span className="t-xs ink-2" style={{ display: "block" }}>{a.body.en}</span><span className="t-xs ink-2 a-ar" dir="rtl" lang="ar" style={{ display: "block" }}>{a.title.ar} · {a.body.ar}</span></td>
                  <td className="t-sm">{AUD[a.audience]}{a.audience_count != null ? <span className="t-xs ink-2" style={{ display: "block" }}>≈ {a.audience_count.toLocaleString("en")}</span> : null}</td>
                  <td className="t-sm"><When at={a.starts_at} /><span className="t-xs ink-2" style={{ display: "block" }}>to <When at={a.ends_at} /></span></td>
                  <td><St tone={tone} icon={icon}>{label}</St>{apState && apState !== "waiting" && a.status === "waiting_approval" ? <span className="t-xs ink-2" style={{ display: "block" }}>Approval {apState}</span> : null}</td>
                  <td style={{ textAlign: "end" }}>
                    {can ? <div className="a-row" style={{ gap: 6, justifyContent: "end" }}>
                      {a.status === "draft" ? <>
                        <Drawer label="Edit" icon="pencil-simple" title="Edit announcement" action={saveAnnouncement} submit="Save draft"><Fields a={a} /></Drawer>
                        <Confirm action={scheduleAnnouncement} small label="Schedule" icon="clock-counter-clockwise" title="Schedule this announcement?" hidden={[{ name: "id", value: a.id }]}
                          effects={[{ icon: "users-three", text: `${AUD[a.audience]} see it from the start time${on ? "" : " (once the announcements flag is on)"}.` }, { icon: "scales", text: "Over 500 people, a second team member approves it first." }]} />
                      </> : null}
                      {a.status === "waiting_approval" && apState && apState !== "waiting" ? <Confirm action={backToDraft} small label="Back to draft" icon="pencil-simple" title="Edit it again?" reason={false} hidden={[{ name: "id", value: a.id }, { name: "type", value: "announcement" }]} /> : null}
                      {a.status === "scheduled" && !ended || a.status === "waiting_approval" ? <Confirm action={cancelAnnouncement} small danger label="Stop" icon="minus-circle" title="Stop this announcement?" hidden={[{ name: "id", value: a.id }]} effects={[{ icon: "megaphone", text: "Learners stop seeing it within a minute." }]} /> : null}
                    </div> : null}
                  </td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ) : <Empty icon="megaphone" title="No announcements yet">An announcement is a short banner at the top of the learner app, in English and Arabic, for a time you pick.</Empty>}
      </Card>
    </main>
  );
}
