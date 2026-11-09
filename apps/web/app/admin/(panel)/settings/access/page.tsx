import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { settingsData, workerAccess } from "@/lib/admin/data/settings";
import { Card, KV, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { ActionForm, Confirm } from "@/components/admin/forms";
import { SettingsTabs } from "@/components/admin/SettingsTabs";
import { setComingSoon, setMaintenance, setMaintenanceMessage, setTeamPassword } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Access and maintenance" };

/**
 * SET-3: who can reach the site. The panel adds to the Worker's own switches (UG_COMING_SOON, UG_MAINTENANCE): it can
 * turn the Coming Soon gate or maintenance on, but a Worker variable that is on stays on until it is removed in Cloudflare.
 */
export default async function AccessPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "settings.view", "settings.access")) return <NoAccess what="Access settings" roles="a settings role" />;
  const { ready, settings, teamPasswordSet } = await settingsData();
  const w = workerAccess();
  const can = allowed(ctx, "settings.access") && ready;
  const fresh = isFresh(ctx);
  const maint = settings.get("access.maintenance")?.value === true;
  const msg = (settings.get("access.maintenance_message")?.value ?? { en: "", ar: "" }) as { en: string; ar: string };
  const cs = settings.get("access.coming_soon")?.value;
  const gateOn = w.comingSoon || cs === true;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Admin" }, { label: "Platform settings" }]} title="Platform settings" sub="Who can reach the site: the Coming Soon gate, maintenance and the team password." />
      <SettingsTabs current="access" />
      {!ready ? <Note icon="warning">Migration 0061 is not in the database yet. Until it runs, these switches only follow the Cloudflare variables.</Note> : null}

      <Card label="Coming Soon gate" title="Coming Soon gate" actions={gateOn ? <St tone="wait" icon="lock-simple">On: the public sees Coming Soon</St> : <St tone="good" icon="check-circle-fill">Off: the site is open</St>}>
        <KV rows={[
          ["Cloudflare variable UG_COMING_SOON", w.comingSoon ? <St tone="wait">On</St> : <St tone="off">Not set</St>],
          ["From the panel", cs === true ? <St tone="wait">On</St> : <span className="t-sm ink-2">Follows Cloudflare</span>],
        ]} />
        {w.comingSoon ? <p className="t-sm ink-2">The gate is on in Cloudflare. To open the site for everyone, remove UG_COMING_SOON from the Worker&apos;s variables (and set this back to &quot;Follows Cloudflare&quot;).</p> : null}
        {can ? (
          <div className="a-row" style={{ gap: 8, marginTop: 8 }}>
            {cs === true ? (
              <Confirm action={setComingSoon} label="Follow Cloudflare again" icon="check" title="Hand the gate back to Cloudflare?" hidden={[{ name: "value", value: "follow" }]} fresh={fresh}
                effects={[{ icon: "users-three", text: w.comingSoon ? "Nothing changes for visitors: the Cloudflare variable still keeps the gate on." : "The site opens to everyone within a minute." }]} />
            ) : (
              <Confirm action={setComingSoon} danger label="Turn the gate on" icon="lock-simple" title="Show Coming Soon to the public?" hidden={[{ name: "value", value: "on" }]} typed="COMING SOON" fresh={fresh}
                effects={[{ icon: "users-three", text: "Visitors and signed-in learners without a team pass see the Coming Soon page within a minute." }, { icon: "lock-simple", text: "The team gets in with the team password at /team." }]} />
            )}
          </div>
        ) : null}
      </Card>

      <Card label="Maintenance" title="Maintenance" actions={maint || w.maintenance ? <St tone="bad" icon="warning">On: learners see the maintenance page</St> : <St tone="good" icon="check-circle-fill">Off</St>}>
        <KV rows={[
          ["Cloudflare variable UG_MAINTENANCE", w.maintenance ? <St tone="bad">On</St> : <St tone="off">Not set</St>],
          ["From the panel", maint ? <St tone="bad">On</St> : <St tone="off">Off</St>],
          ["Last change", settings.get("access.maintenance")?.updatedBy ? <When at={settings.get("access.maintenance")?.updatedAt} rel /> : null],
        ]} />
        {can ? (
          <>
            <ActionForm action={setMaintenanceMessage} reset={false} className="a-stack sm">
              {(pending) => (
                <>
                  <div className="a-row" style={{ gap: 8, alignItems: "start", flexWrap: "wrap" }}>
                    <div className="a-field a-grow"><label htmlFor="m-en">Message in English</label><textarea id="m-en" name="message_en" className="a-ta" rows={2} maxLength={300} defaultValue={msg.en} required lang="en" dir="ltr" /></div>
                    <div className="a-field a-grow"><label htmlFor="m-ar">Message in Arabic</label><textarea id="m-ar" name="message_ar" className="a-ta a-ar" rows={2} maxLength={300} defaultValue={msg.ar} required lang="ar" dir="rtl" /></div>
                  </div>
                  <div><button type="submit" className="a-btn sm" disabled={pending} aria-busy={pending}>{pending ? "Saving…" : "Save message"}</button></div>
                </>
              )}
            </ActionForm>
            <div className="a-row" style={{ gap: 8, marginTop: 8 }}>
              {maint ? (
                <Confirm action={setMaintenance} label="End maintenance" icon="check" title="End maintenance?" hidden={[{ name: "on", value: "0" }]} fresh={fresh}
                  effects={[{ icon: "users-three", text: w.maintenance ? "The Cloudflare variable is still on, so learners keep seeing maintenance until it is removed." : "Learners get the app back within a minute." }]} />
              ) : (
                <Confirm action={setMaintenance} danger label="Start maintenance" icon="warning" title="Start maintenance?" hidden={[{ name: "on", value: "1" }]} typed="MAINTENANCE" fresh={fresh}
                  effects={[{ icon: "users-three", text: "Every learner page shows the maintenance message within a minute. Lessons in progress cannot be saved." }, { icon: "user-gear", text: "This panel keeps working." }]} />
              )}
            </div>
          </>
        ) : null}
      </Card>

      <Card label="Team password" title="Team password">
        <KV rows={[
          ["Set in", teamPasswordSet ? "The panel (stored only as a hash)" : w.teamPasswordSecret ? "Cloudflare secret UG_TEAM_PASSWORD" : <span className="ink-3">Not set: nobody gets past the gate</span>],
          ["Used for", "Getting past the Coming Soon gate at /team. A pass lasts 12 hours."],
        ]} />
        {can ? (
          <div style={{ marginTop: 8 }}>
            <Confirm action={setTeamPassword} label="Change the team password" icon="lock-simple" title="Change the team password" fresh={fresh}
              effects={[{ icon: "users-three", text: "Everyone with a team pass needs the new password within a minute." }, { icon: "lock-simple", text: "Only a hash is stored. Nobody can read the password back, not even here." }]}>
              <div className="a-field"><label htmlFor="pw1">New password<span className="req" aria-hidden="true">*</span></label><input id="pw1" name="password" type="password" className="a-in" minLength={14} maxLength={200} autoComplete="new-password" required /><span className="help">At least 14 characters.</span></div>
              <div className="a-field"><label htmlFor="pw2">Type it again<span className="req" aria-hidden="true">*</span></label><input id="pw2" name="password2" type="password" className="a-in" minLength={14} maxLength={200} autoComplete="new-password" required /></div>
            </Confirm>
          </div>
        ) : null}
      </Card>
    </main>
  );
}
