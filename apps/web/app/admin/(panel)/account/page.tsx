import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_THEME_COOKIE } from "@/lib/admin/rules";
import { PERMISSIONS, roleName, type Permission } from "@/lib/admin/permissions";
import { Card, KV, PageHead, RoleChip, St, When } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/forms";
import { setTheme, signOutEverywhere } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

export default async function AccountPage() {
  const ctx = await requireAdmin();
  const db = createAdminClient();
  const fixture = process.env.UG_ADMIN_FIXTURE === "1";
  const [{ data: sessions }, { data: mine }] = fixture ? [{ data: [] }, { data: [] }] : await Promise.all([
    db.from("admin_sessions").select("session_id, started_at, last_seen_at, ended_at, end_reason, ip, user_agent").eq("user_id", ctx.userId).order("started_at", { ascending: false }).limit(10),
    db.from("admin_audit").select("id, at, action, target_label, reason").eq("actor_id", ctx.userId).order("id", { ascending: false }).limit(15),
  ]);
  const theme = (await cookies()).get(ADMIN_THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  return (
    <main className="a-page">
      <PageHead crumbs={[{ label: "My account" }]} title="My account" sub={`${ctx.name} · ${ctx.email}`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Card title="Roles and access">
          <div className="a-stack">
            <span className="a-row" style={{ gap: 4 }}>{ctx.roles.map((r) => <RoleChip key={r} id={r} name={roleName(r)} />)}</span>
            <details><summary className="t-sm">What I can do ({ctx.perms.size} permissions)</summary>
              <ul className="t-sm ink-2" style={{ margin: "6px 0 0", paddingLeft: 18 }}>{[...ctx.perms].sort().map((p) => <li key={p}>{PERMISSIONS[p as Permission]?.[1] ?? p}</li>)}</ul>
            </details>
            <p className="t-xs ink-3">Only another admin can change your roles.</p>
          </div>
        </Card>
        <Card title="Two-step sign-in">
          <KV rows={[["Method", <St key="m" tone="good" icon="shield-check">Authenticator app</St>], ["Last check", <When key="w" at={ctx.totpAt ? new Date(ctx.totpAt * 1000) : null} rel />]]} />
          <p className="t-xs ink-3" style={{ marginTop: 8 }}>Lost your phone? Ask a super admin to reset your two-step sign-in (docs/admin/README.md).</p>
        </Card>
        <Card title="Theme">
          <ActionForm action={setTheme} reset={false}>{(p) => (
            <div className="a-row" style={{ gap: 8 }}>
              <label className="a-row t-sm" style={{ gap: 6 }}><input type="radio" name="theme" value="light" defaultChecked={theme === "light"} />Light</label>
              <label className="a-row t-sm" style={{ gap: 6 }}><input type="radio" name="theme" value="dark" defaultChecked={theme === "dark"} />Night</label>
              <button className="a-btn sm" type="submit" disabled={p}>Save</button>
            </div>
          )}</ActionForm>
        </Card>
      </div>
      <Card title="Sessions" actions={<ActionForm action={signOutEverywhere} reset={false}>{(p) => <button className="a-btn sm danger" type="submit" disabled={p}><span className="i i-sign-out" aria-hidden="true" />Sign out everywhere</button>}</ActionForm>} pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Started</th><th scope="col">Last seen</th><th scope="col">Device</th><th scope="col">Status</th></tr></thead>
          <tbody>{(sessions ?? []).map((s) => (
            <tr key={s.session_id}>
              <td className="t-sm"><When at={s.started_at} /></td><td className="t-sm"><When at={s.last_seen_at} rel /></td>
              <td className="t-sm">{s.ip ?? "—"} · <span className="ink-2">{(s.user_agent ?? "").slice(0, 80)}</span></td>
              <td>{s.session_id === ctx.sessionId ? <St tone="good">This session</St> : s.ended_at ? <St tone="off">Ended · {s.end_reason}</St> : <St tone="info">Open</St>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>
      <Card title="My recent actions" pad={false}>
        <div className="a-tbl-wrap"><table className="a-tbl">
          <thead><tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Reason</th></tr></thead>
          <tbody>{(mine ?? []).map((a) => <tr key={a.id}><td className="t-sm"><When at={a.at} rel /></td><td><span className="a-id t-xs">{a.action}</span></td><td className="t-sm">{a.target_label ?? "—"}</td><td className="t-sm">{a.reason ?? "—"}</td></tr>)}</tbody>
        </table></div>
      </Card>
    </main>
  );
}
