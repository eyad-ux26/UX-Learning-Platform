import { Drawer } from "@/components/admin/forms";
import { Note } from "@/components/admin/ui";
import { AGENT_COMP_DAYS } from "@/lib/admin/rules";
import { grantComp } from "./actions";

const day = (d: Date) => d.toISOString().slice(0, 10);

/** "Grant Pro access (comp)": free Pro with an end date, never charged, counted apart from revenue. */
export function CompDrawer({ user, label = "Grant comp access", unlimited, primary = false }: { user?: { id: string; name: string } | null; label?: string; unlimited: boolean; primary?: boolean }) {
  const max = new Date(Date.now() + AGENT_COMP_DAYS * 86_400_000);
  return (
    <Drawer label={label} title="Grant Pro access (comp)" icon="gift" primary={primary} action={grantComp} submit="Grant Pro">
      <p className="t-sm ink-2">Free Pro for team members, partners or as a goodwill gesture. It never charges the learner and is shown apart from paid revenue.</p>
      {user ? (
        <><input type="hidden" name="user" value={user.id} /><div className="a-field"><span className="t-sm w6">Learner</span><span>{user.name}</span></div></>
      ) : (
        <div className="a-field"><label htmlFor="comp-user">Learner id<span className="req" aria-hidden="true">*</span></label>
          <input id="comp-user" name="user" className="a-in" required placeholder="Open the learner and copy the id, or use Learner 360" pattern="[0-9a-fA-F-]{36}" />
          <span className="help">Find the learner in Learners first; their page has this same button.</span></div>
      )}
      <div className="a-field"><label htmlFor="comp-until">Ends on<span className="req" aria-hidden="true">*</span></label>
        <input id="comp-until" name="until" type="date" className="a-in" required min={day(new Date(Date.now() + 86_400_000))} max={unlimited ? undefined : day(max)} defaultValue={day(max)} />
        <span className="help">{unlimited ? "Billing managers can choose any date." : `Support agents can grant up to ${AGENT_COMP_DAYS} days.`}</span></div>
      <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="t-sm w6" style={{ marginBottom: 6 }}>Reason<span className="req" aria-hidden="true">*</span></legend>
        <div className="a-row" style={{ gap: 12 }}>
          {["Team", "Partner", "Support goodwill", "Other"].map((k, i) => <label key={k} className="a-row t-sm" style={{ gap: 6 }}><input type="radio" name="kind" value={k} defaultChecked={i === 2} />{k}</label>)}
        </div>
      </fieldset>
      <div className="a-field"><label htmlFor="comp-note">Note for the audit log<span className="req" aria-hidden="true">*</span></label><textarea id="comp-note" name="reason" className="a-ta" rows={2} required minLength={3} maxLength={400} /></div>
      <Note>A paid plan that runs longer keeps going. Ending comp early hands back to any paid plan still running.</Note>
    </Drawer>
  );
}
