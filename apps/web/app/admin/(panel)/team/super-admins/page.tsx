import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { listGrants, listMembers } from "@/lib/admin/data/team";
import { GRANT_PHRASE } from "@/lib/admin/rules";
import { fmtDuration } from "@/lib/admin/format";
import { Card, Empty, I, NoAccess, Note, PageHead, St, When } from "@/components/admin/ui";
import { Confirm } from "@/components/admin/forms";
import { TeamTabs } from "@/components/admin/TeamTabs";
import { cancelGrant, grantSuper, removeSuper } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Super admins" };

export default async function SuperAdmins() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "team.view")) return <NoAccess what="Super admins" roles="the Admin or Super admin role" />;
  const [members, grants] = await Promise.all([listMembers(), listGrants()]);
  const supers = members.filter((m) => m.roles.includes("super_admin"));
  const pending = grants.filter((g) => g.status === "pending");
  const canManage = allowed(ctx, "team.super");
  const fresh = isFresh(ctx);
  const eligible = members.filter((m) => m.status === "active" && !m.roles.includes("super_admin") && m.twoStep === "app" && !pending.some((g) => g.target === m.userId));
  const activeSupers = supers.filter((m) => m.status === "active").length;
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/team", label: "Team and roles" }, { label: "Super admins" }]} title="Super admins" sub="Super admins can do everything, including giving and removing super admin." />
      <TeamTabs current="super" counts={{ super: `${supers.length}${pending.length ? ` + ${pending.length} pending` : ""}` }} />
      <Card title="Super admins" label="Super admins" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Person</th><th scope="col">Status</th><th scope="col">Last sign-in</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
          <tbody>{supers.map((m) => (
            <tr key={m.userId}>
              <td><span className="w7">{m.name ?? m.email}</span><span className="t-xs ink-2" style={{ display: "block" }}>{m.email}</span></td>
              <td>{m.founding ? <St tone="info" icon="crown-simple-fill">Founding · protected</St> : m.status === "active" ? <St tone="good">Active</St> : <St tone="off">Suspended</St>}</td>
              <td className="t-sm"><When at={m.lastSignInAt} rel /></td>
              <td>{canManage && !m.founding && m.userId !== ctx.userId ? (
                <Confirm action={removeSuper} small ghost danger label="Remove super admin" title={`Remove super admin from ${m.email}?`} fresh={fresh} hidden={[{ name: "user", value: m.userId }]} disabled={activeSupers <= 1 ? "The panel always keeps one active super admin" : false}
                  effects={[{ icon: "user-gear", text: "Their other roles stay." }, { icon: "envelope-simple", text: "Every other super admin gets an email." }]} />
              ) : m.founding ? <span className="t-xs ink-3"><I n="lock-simple" s={12} /> Only a database change by the owner can change this</span> : null}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      <Card title="Pending grants" label="Pending grants">
        {pending.length === 0 ? <Empty icon="hourglass-medium" title="No pending grants">A new super admin waits 24 hours, so any super admin can cancel it.</Empty> : (
          <div className="a-stack">{pending.map((g) => {
            const left = (new Date(g.effectiveAt).getTime() - Date.now()) / 1000;
            return (
              <article key={g.id} className="a-appr">
                <div className="a-appr-h"><St tone="wait" icon="hourglass-medium">Takes effect in {fmtDuration(left)}</St><span className="w7 a-grow">{g.targetEmail}</span><span className="t-xs ink-3"><When at={g.createdAt} rel /></span></div>
                <div className="a-appr-b"><p className="t-sm">Asked by <b>{g.grantedByEmail}</b>: “{g.reason}”. Effective <When at={g.effectiveAt} />.</p></div>
                {canManage ? <div className="a-appr-f"><Confirm action={cancelGrant} small danger label="Cancel grant" title={`Cancel super admin for ${g.targetEmail}?`} hidden={[{ name: "grant", value: g.id }]} /></div> : null}
              </article>
            );
          })}</div>
        )}
      </Card>
      {canManage ? (
        <Card title="Make someone a super admin" label="Grant super admin">
          {eligible.length === 0 ? <p className="t-sm ink-2">Nobody is eligible. A new super admin must be an active team member with two-step sign-in on.</p> : (
            <div className="a-stack">
              {eligible.map((m) => (
                <div key={m.userId} className="a-row" style={{ gap: 10 }}>
                  <span className="a-grow"><b>{m.name ?? m.email}</b> <span className="t-xs ink-2">{m.email}</span></span>
                  <Confirm action={grantSuper} small label="Grant super admin" title={`Make ${m.email} a super admin?`} fresh={fresh} typed={GRANT_PHRASE} icon="crown-simple" hidden={[{ name: "user", value: m.userId }]}
                    effects={[{ icon: "hourglass-medium", text: "It takes effect in 24 hours. Any super admin can cancel it before then." }, { icon: "envelope-simple", text: "Every other super admin gets an email now." }, { icon: "clock-counter-clockwise", text: "Logged in the audit log." }]} />
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}
      <Note icon="shield-check">The rules: only active team members with two-step sign-in can become super admins. Granting needs a fresh authenticator code and the typed words {GRANT_PHRASE}. The founding account (uxgate8@gmail.com) cannot be removed or suspended from the panel, and the last active super admin cannot be removed. If the founding account is lost, recovery is a documented database step for the owner (docs/admin/README.md).</Note>
    </main>
  );
}
