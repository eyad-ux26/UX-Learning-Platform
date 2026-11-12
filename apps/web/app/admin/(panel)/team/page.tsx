import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { listInvites, listMembers, listRoles } from "@/lib/admin/data/team";
import { roleName } from "@/lib/admin/permissions";
import { Card, Empty, I, NoAccess, Note, PageHead, RoleChip, St, When } from "@/components/admin/ui";
import { Confirm, Drawer } from "@/components/admin/forms";
import { TeamTabs } from "@/components/admin/TeamTabs";
import { cancelInvite, changeRoles, inviteMember, removeMember, resendInvite, setMemberStatus } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team and roles" };

export default async function TeamPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "team.view")) return <NoAccess what="Team and roles" roles="the Admin or Super admin role" />;
  const [members, invites, roles] = await Promise.all([listMembers(), listInvites(), listRoles()]);
  const canInvite = allowed(ctx, "team.invite");
  const fresh = isFresh(ctx);
  const assignable = roles.filter((r) => r.id !== "super_admin" && (r.builtin || allowed(ctx, "team.roles")));
  const custom = roles.filter((r) => !r.builtin);
  const RolePicker = ({ have = [] as string[] }) => (
    <fieldset className="a-field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="t-sm w6" style={{ marginBottom: 6 }}>Roles</legend>
      <div className="a-stack sm">
        {assignable.map((r) => (
          <label key={r.id} className="a-row t-sm" style={{ gap: 8, alignItems: "flex-start" }}>
            <input type="checkbox" name="roles" value={r.id} defaultChecked={have.includes(r.id)} />
            <span><b>{r.name}</b><span className="t-xs ink-2" style={{ display: "block" }}>{r.description}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "Team and roles" }]} title="Team and roles" sub="Who can use the admin panel and what each person can do. A new person sees nothing until they have a role."
        actions={canInvite ? (
          <Drawer label="Invite a team member" title="Invite a team member" icon="user-plus" primary action={inviteMember} submit="Send invite">
            <div className="a-field"><label htmlFor="inv-email">Email<span className="req" aria-hidden="true">*</span></label><input id="inv-email" name="email" type="email" className="a-in" required />
              <span className="help">The invite only works for someone who signs in with this exact email. It expires in 72 hours.</span></div>
            <RolePicker />
            <Note icon="shield-check">They set up two-step sign-in before they see anything. Super admin is given separately, with a 24-hour wait.</Note>
          </Drawer>
        ) : null} />
      <TeamTabs current="members" counts={{ members: members.length, roles: roles.length }} />
      <Card label="Team members" pad={false}>
        <div className="a-toolbar"><span className="t-sm ink-2">{members.filter((m) => m.status === "active").length} active</span><span className="a-grow" /><span className="t-xs ink-3">Sessions end after 30 minutes idle or 12 hours in total</span></div>
        <div className="a-tbl-wrap">
          <table className="a-tbl">
            <thead><tr><th scope="col">Person</th><th scope="col">Roles</th><th scope="col">Status</th><th scope="col">Two-step sign-in</th><th scope="col">Last sign-in</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {members.map((m) => {
                const self = m.userId === ctx.userId;
                const isSuper = m.roles.includes("super_admin");
                const canChange = canInvite && !self && !m.founding && (!isSuper || allowed(ctx, "team.super"));
                return (
                  <tr key={m.userId}>
                    <td><span className="w7">{m.name ?? m.email.split("@")[0]}</span><span className="t-xs ink-2" style={{ display: "block" }}>{m.email}{self ? " · you" : ""}</span></td>
                    <td><span className="a-row" style={{ gap: 4 }}>{m.roles.length ? m.roles.map((r) => <RoleChip key={r} id={r} name={roleName(r, custom) + (r === "super_admin" && m.founding ? " · founding" : "")} />) : <span className="ink-3 t-sm">No role</span>}</span></td>
                    <td>{m.status === "active" ? <St tone="good">Active</St> : <St tone="off" icon="pause-circle">Suspended</St>}</td>
                    <td>{m.twoStep === "app" ? <St tone="good" icon="shield-check">Authenticator app</St> : <St tone="wait" icon="warning">Not set up yet</St>}</td>
                    <td className="t-sm"><When at={m.lastSignInAt} rel /></td>
                    <td>
                      {canChange ? (
                        <span className="a-row" style={{ gap: 6, justifyContent: "flex-end" }}>
                          <Confirm action={changeRoles} small label="Change roles" title={`Change roles for ${m.email}`} fresh={fresh} hidden={[{ name: "user", value: m.userId }]} icon="user-gear"
                            effects={[{ icon: "list-checks", text: "Their menu and access change on their next page." }, { icon: "clock-counter-clockwise", text: "Logged with before and after." }]}>
                            <RolePicker have={m.roles} />
                          </Confirm>
                          {m.status === "active" ? (
                            <Confirm action={setMemberStatus} small ghost danger label="Suspend" title={`Suspend ${m.email}?`} fresh={fresh} hidden={[{ name: "user", value: m.userId }, { name: "status", value: "suspended" }]} icon="pause-circle"
                              effects={[{ icon: "sign-out", text: "All their admin sessions end at once." }, { icon: "clock-counter-clockwise", text: "Their past actions stay in the audit log under their name." }]} />
                          ) : (
                            <Confirm action={setMemberStatus} small ghost label="Unsuspend" title={`Unsuspend ${m.email}?`} fresh={fresh} hidden={[{ name: "user", value: m.userId }, { name: "status", value: "active" }]} icon="play-circle"
                              effects={[{ icon: "sign-in", text: "They can sign in again with two-step sign-in." }]} />
                          )}
                          {!isSuper ? (
                            <Confirm action={removeMember} small ghost danger label="Remove" title={`Remove ${m.email} from the team?`} fresh={fresh} hidden={[{ name: "user", value: m.userId }]} icon="user-minus"
                              effects={[{ icon: "sign-out", text: "Their sessions end and their roles go. Their learner account stays." }, { icon: "clock-counter-clockwise", text: "The audit log keeps their name." }]} />
                          ) : null}
                        </span>
                      ) : self ? <span className="t-xs ink-3">Ask another admin to change your roles</span> : m.founding ? <span className="t-xs ink-3"><I n="lock-simple" s={12} /> Protected</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Open invites" label="Open invites" pad={invites.length === 0}>
        {invites.length === 0 ? <Empty icon="envelope-simple" title="No open invites">Invites you send show here until they are accepted, cancelled or expire.</Empty> : (
          <div className="a-tbl-wrap"><table className="a-tbl">
            <thead><tr><th scope="col">Email</th><th scope="col">Roles</th><th scope="col">Sent</th><th scope="col">Expires</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
            <tbody>{invites.map((i) => {
              const expired = new Date(i.expiresAt) <= new Date();
              return (
                <tr key={i.email}>
                  <td>{i.email}</td>
                  <td><span className="a-row" style={{ gap: 4 }}>{i.roles.map((r) => <RoleChip key={r} id={r} name={roleName(r, custom)} />)}</span></td>
                  <td className="t-sm"><When at={i.createdAt} rel /></td>
                  <td>{i.bounce ? (
                    <span className="a-col" style={{ gap: 2 }}>
                      <St tone="bad" icon="warning">{i.bounce.kind === "bounced" ? "Email bounced" : i.bounce.kind === "complained" ? "Marked as spam" : "Not delivered (address blocked)"}</St>
                      <span className="t-xs ink-3" title={i.bounce.detail ?? undefined}>Resend the invite, copy the link it shows, and send it another way.</span>
                    </span>
                  ) : expired ? <St tone="off" icon="clock">Expired</St> : <St tone="info" icon="envelope-simple"><When at={i.expiresAt} /></St>}</td>
                  <td>{canInvite ? <span className="a-row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <Confirm action={resendInvite} small label="Resend invite" title={`Send a new invite to ${i.email}?`} reason={false} hidden={[{ name: "invite", value: i.id }]} icon="paper-plane-tilt" effects={[{ icon: "link", text: "A new link for 72 hours. The old link stops working." }]} />
                    <Confirm action={cancelInvite} small ghost danger label="Cancel" title={`Cancel the invite to ${i.email}?`} reason={false} hidden={[{ name: "invite", value: i.id }]} icon="x" confirmLabel="Cancel invite" />
                  </span> : null}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Note icon="shield-check">Suspending someone ends all their sessions at once. Their past actions stay in the audit log under their name.</Note>
        <Note icon="list-checks"><b>Team testing tools</b> (replay the tour, open any path, mark lessons done) come with the <b>Viewer / QA tester</b> role, on the tester’s own account only.</Note>
      </div>
    </main>
  );
}
