import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { settingsData } from "@/lib/admin/data/settings";
import { names } from "@/lib/admin/data/content";
import { Card, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { SettingsTabs } from "@/components/admin/SettingsTabs";
import { setFlag } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feature flags" };

/** What turning a flag on or off does, in plain words, for the confirm dialog. */
const EFFECT: Record<string, { on: string; off: string }> = {
  leaderboard: { on: "Learners see the Board tab and can join the weekly leaderboard.", off: "The Board tab is hidden. Nobody's XP is lost." },
  trials: { on: "New learners who never had Pro can start a free Pro trial. Update the terms first: they say \"No trial\".", off: "Nobody can start a new trial. Trials already running carry on to their end." },
  announcements: { on: "Running announcements show as a banner in the learner app.", off: "No banners show. Announcements stay as they are." },
  content_db: { on: "Learners get the lesson versions published from Content > Releases. Lessons already started keep their version.", off: "Learners get the versions built from the content files again." },
};

/** SET-1: feature flags, with who changed each one and when. */
export default async function FlagsPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "settings.view", "settings.flags")) return <NoAccess what="Platform settings" roles="a settings role" />;
  const { ready, flags } = await settingsData();
  const who = await names(flags.map((f) => f.updatedBy).filter(Boolean) as string[]);
  const can = allowed(ctx, "settings.flags");
  const fresh = isFresh(ctx);
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Platform settings" }]} title="Platform settings" sub="Switch features on and off for every learner. Each change needs a reason and is kept in the audit log." />
      <SettingsTabs current="flags" />
      {!ready ? <Note icon="warning">Migration 0061 is not in the database yet. Until it runs, flags show without labels and cannot be changed here.</Note> : null}
      <Card label="Feature flags" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Feature</th><th scope="col">State</th><th scope="col">Last change</th><th scope="col"><span className="sr">Change</span></th></tr></thead>
          <tbody>{flags.map((fl) => {
            const e = EFFECT[fl.key];
            return (
              <tr key={fl.key}>
                <td style={{ maxWidth: 420 }}><b className="t-sm">{fl.label ?? fl.key}</b> <span className="a-code t-xs">{fl.key}</span>{fl.description ? <span className="t-xs ink-2" style={{ display: "block" }}>{fl.description}</span> : null}</td>
                <td>{fl.enabled ? <St tone="good" icon="toggle-right">On</St> : <St tone="off" icon="toggle-left">Off</St>}</td>
                <td className="t-sm">{fl.updatedAt ? <><When at={fl.updatedAt} rel />{fl.updatedBy ? <span className="t-xs ink-2" style={{ display: "block" }}>{who.get(fl.updatedBy) ?? "A team member"}</span> : null}</> : <span className="ink-3">Never</span>}</td>
                <td style={{ textAlign: "end" }}>
                  {can && ready ? (
                    <Confirm action={setFlag} small danger={fl.enabled} label={fl.enabled ? "Turn off" : "Turn on"} icon={fl.enabled ? "toggle-left" : "toggle-right"}
                      title={`${fl.enabled ? "Turn off" : "Turn on"} ${fl.label ?? fl.key}?`} sub="Every server uses the change within a minute."
                      effects={[{ icon: "users-three", text: (fl.enabled ? e?.off : e?.on) ?? "This changes the learner app for everyone." }]}
                      hidden={[{ name: "key", value: fl.key }, { name: "enabled", value: fl.enabled ? "0" : "1" }]}
                      typed={fl.key === "content_db" || fl.key === "trials" ? fl.key : undefined} fresh={fresh} />
                  ) : null}
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </Card>
    </main>
  );
}
