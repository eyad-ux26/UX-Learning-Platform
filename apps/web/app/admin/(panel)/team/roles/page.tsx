import { requireAdmin, allowed } from "@/lib/admin/guard";
import { isFresh } from "@/lib/admin/fresh";
import { listRoles } from "@/lib/admin/data/team";
import { PERMISSIONS, PERMISSION_KEYS, type Permission } from "@/lib/admin/permissions";
import { Card, I, NoAccess, Note, PageHead } from "@/components/admin/ui";
import { Confirm, Drawer } from "@/components/admin/forms";
import { TeamTabs } from "@/components/admin/TeamTabs";
import { deleteRole, saveRole } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roles" };

const AREA_LABEL: Record<string, string> = { overview: "Overview", learners: "Learners", support: "Support", billing: "Money", certificates: "Certificates", team: "Team", audit: "Audit log", testing: "Testing", content: "Content", grow: "Grow", settings: "Settings and health" };

function PermPicker({ have = [] as string[] }) {
  const areas = [...new Set(PERMISSION_KEYS.map((k) => PERMISSIONS[k][0]))];
  return (
    <div className="a-stack">
      {areas.map((a) => (
        <fieldset key={a} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="t-over" style={{ marginBottom: 4 }}>{AREA_LABEL[a] ?? a}</legend>
          {PERMISSION_KEYS.filter((k) => PERMISSIONS[k][0] === a && k !== "team.super").map((k) => (
            <label key={k} className="a-row t-sm" style={{ gap: 8, alignItems: "flex-start", padding: "2px 0" }}>
              <input type="checkbox" name="perms" value={k} defaultChecked={have.includes(k)} /><span>{PERMISSIONS[k][1]} <span className="a-id t-xs ink-3">{k}</span></span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export default async function RolesPage() {
  const ctx = await requireAdmin();
  if (!allowed(ctx, "team.view")) return <NoAccess what="Roles" roles="the Admin or Super admin role" />;
  const roles = await listRoles();
  const canEdit = allowed(ctx, "team.roles");
  const fresh = isFresh(ctx);
  const builtin = roles.filter((r) => r.builtin);
  const custom = roles.filter((r) => !r.builtin);
  const keys = PERMISSION_KEYS;
  const Fields = ({ r }: { r?: (typeof roles)[number] }) => (
    <>
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <div className="a-field"><label htmlFor={`rn-${r?.id ?? "new"}`}>Role name<span className="req" aria-hidden="true">*</span></label><input id={`rn-${r?.id ?? "new"}`} name="name" className="a-in" defaultValue={r?.name} required maxLength={60} /></div>
      <div className="a-field"><label htmlFor={`rd-${r?.id ?? "new"}`}>What it is for</label><input id={`rd-${r?.id ?? "new"}`} name="description" className="a-in" defaultValue={r?.description} maxLength={300} /></div>
      <PermPicker have={r?.permissions} />
      <div className="a-field"><label htmlFor={`rr-${r?.id ?? "new"}`}>Reason (saved in the audit log)<span className="req" aria-hidden="true">*</span></label><textarea id={`rr-${r?.id ?? "new"}`} name="reason" className="a-ta" required minLength={3} rows={2} /></div>
    </>
  );
  return (
    <main className="a-page">
      <PageHead crumbs={[{ href: "/admin/team", label: "Team and roles" }, { label: "Roles" }]} title="Roles"
        sub="Built-in roles follow the permission matrix and cannot be changed. Custom roles are sets of permissions you tick. A person can have more than one role."
        actions={canEdit ? <Drawer label="New custom role" title="New custom role" icon="plus" primary action={saveRole} submit="Create role" fresh={fresh}><Fields /></Drawer> : null} />
      <TeamTabs current="roles" counts={{ roles: roles.length }} />
      <Card title="Permission matrix" label="Permission matrix" pad={false}>
        <div className="a-tbl-wrap">
          <table className="a-tbl">
            <thead><tr><th scope="col">Permission</th>{builtin.map((r) => <th key={r.id} scope="col" className="t-xs" style={{ whiteSpace: "normal", minWidth: 70 }}>{r.name}<span className="ink-3" style={{ display: "block" }}>{r.members} {r.members === 1 ? "person" : "people"}</span></th>)}</tr></thead>
            <tbody>
              {keys.map((k: Permission) => (
                <tr key={k}>
                  <th scope="row" className="t-sm" style={{ fontWeight: 600 }}>{PERMISSIONS[k][1]}</th>
                  {builtin.map((r) => <td key={r.id} style={{ textAlign: "center" }}>{r.permissions.includes(k) ? <><I n="check" className="ink-good" /><span className="sr">yes</span></> : <span className="ink-3" aria-label="no">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Custom roles" label="Custom roles">
        {custom.length === 0 ? <p className="t-sm ink-2">No custom roles yet.{canEdit ? " Create one with New custom role." : ""}</p> : (
          <div className="a-stack">
            {custom.map((r) => (
              <div key={r.id} className="a-row" style={{ gap: 10, alignItems: "flex-start", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <div className="a-grow"><b>{r.name}</b> <span className="t-xs ink-3">{r.members} {r.members === 1 ? "person" : "people"}</span><p className="t-sm ink-2">{r.description}</p>
                  <p className="t-xs ink-3">{r.permissions.map((p) => PERMISSIONS[p as Permission]?.[1] ?? p).join(" · ")}</p></div>
                {canEdit ? <>
                  <Drawer label="Edit" title={`Edit ${r.name}`} action={saveRole} submit="Save role" fresh={fresh}><Fields r={r} /></Drawer>
                  <Confirm action={deleteRole} small ghost danger label="Delete" title={`Delete ${r.name}?`} hidden={[{ name: "id", value: r.id }]} disabled={r.members ? "Change the roles of the people who have it first" : false} />
                </> : null}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Note icon="lock-simple">A custom role can never manage super admins. Phase 2 areas are listed so their menu items can be given now; they open a placeholder until built.</Note>
    </main>
  );
}
