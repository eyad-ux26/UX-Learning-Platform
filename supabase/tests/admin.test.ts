import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILTIN_ROLES, PERMISSION_KEYS } from "../../apps/web/lib/admin/permissions";

// Admin panel access (0044+): the database rules that must hold whatever the app does. Runs every migration on an
// in-process Postgres with Supabase-shaped roles.

const here = path.dirname(fileURLToPath(import.meta.url));
const migrations = fs.readdirSync(path.join(here, "../migrations")).filter((f) => f.endsWith(".sql")).sort();

const BOOT = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
`;

let db: PGlite;
let F: string; // founding super admin
let S: string; // support agent
let L: string; // support lead
let N: string; // invited newcomer
let X: string; // a learner, not on the team

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const svc = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  let rows: T[] = [];
  await db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    rows = (await tx.query<T>(sql, params)).rows;
  });
  return rows;
};
async function asUser<T>(who: "anon" | "authenticated", uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  let rows: T[] = [];
  await db.transaction(async (tx) => {
    await tx.exec(`set local role ${who}`);
    if (uid) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    try { rows = (await tx.query<T>(sql, params)).rows; } finally { await tx.rollback(); }
  });
  return rows;
}
const perms = async (u: string) => (await one<{ p: string[] }>(`select public.admin_perms($1) p`, [u])).p;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BOOT);
  // The founding account exists before 0044 runs, as in production.
  F = (await one<{ id: string }>(`insert into auth.users (email) values ('UXGate8@gmail.com') returning id`)).id;
  for (const f of migrations) await db.exec(fs.readFileSync(path.join(here, "../migrations", f), "utf8"));
  const mk = async (email: string) => (await one<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [email])).id;
  S = await mk("agent@uxgate.org");
  L = await mk("lead@uxgate.org");
  N = await mk("new@uxgate.org");
  X = await mk("learner@example.com");
  // Two members join through invites, as the panel does it.
  for (const [u, email, role] of [[S, "agent@uxgate.org", "support_agent"], [L, "lead@uxgate.org", "support_lead"]]) {
    await svc(`select public.admin_invite($1, $2, array[$3], $4, null, null, null)`, [F, email, role, `tok-${email}`]);
    await svc(`select public.admin_accept_invite($1, $2, $3, 'Name', null, null)`, [u, email, `tok-${email}`]);
  }
});

describe("permissions and roles", () => {
  it("seeds the same permission keys and built-in roles as the app", async () => {
    const keys = (await db.query<{ key: string }>(`select key from admin_permission_keys order by key`)).rows.map((r) => r.key);
    expect(keys).toEqual([...PERMISSION_KEYS].sort());
    for (const r of BUILTIN_ROLES) {
      const row = await one<{ permissions: string[]; builtin: boolean }>(`select permissions, builtin from admin_roles where id = $1`, [r.id]);
      expect(row.builtin).toBe(true);
      expect([...row.permissions].sort()).toEqual([...r.permissions].sort());
    }
  });

  it("makes the founding account a protected super admin with every permission", async () => {
    const m = await one<{ founding: boolean; status: string }>(`select founding, status from admin_members where user_id = $1`, [F]);
    expect(m).toEqual({ founding: true, status: "active" });
    expect((await perms(F)).sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it("gives a learner who is not on the team no permissions", async () => {
    expect(await perms(X)).toEqual([]);
  });

  it("refuses unknown permissions, changes to built-in roles and custom roles that manage super admins", async () => {
    await expect(svc(`insert into admin_roles (id, name, permissions) values ('x_role', 'X', array['nope.nope'])`)).rejects.toThrow(/unknown permission/);
    await expect(svc(`update admin_roles set permissions = array['dashboard.view'] where id = 'support_agent'`)).rejects.toThrow(/read only/);
    await expect(svc(`delete from admin_roles where id = 'admin'`)).rejects.toThrow(/cannot be deleted/);
    await expect(svc(`insert into admin_roles (id, name, permissions) values ('sneaky', 'Sneaky', array['team.super'])`)).rejects.toThrow(/cannot manage super admins/);
    const r = await svc<{ id: string }>(`insert into admin_roles (id, name, permissions) values ('night_support', 'Night support', array['support.view']) returning id`);
    expect(r[0].id).toBe("night_support");
  });
});

describe("only the server reaches admin data", () => {
  const tables = ["admin_permission_keys", "admin_roles", "admin_members", "admin_member_roles", "admin_sessions", "admin_invites", "super_admin_grants", "admin_approvals", "learner_notes", "admin_audit"];
  it.each(tables)("%s is closed to learners and visitors", async (t) => {
    await expect(asUser("authenticated", F, `select * from ${t}`)).rejects.toThrow(/permission denied/);
    await expect(asUser("anon", null, `select * from ${t}`)).rejects.toThrow(/permission denied/);
  });
  it("closes the admin functions to a signed-in session, even the founding admin's", async () => {
    await expect(asUser("authenticated", F, `select public.admin_perms($1)`, [F])).rejects.toThrow(/permission denied/);
    await expect(asUser("authenticated", F, `select public.admin_log($1, 'x.y', 'x', null, null, null, null, null, null, null, null, null)`, [F])).rejects.toThrow(/permission denied/);
  });
});

describe("audit log", () => {
  it("is append-only for everyone, the service role included", async () => {
    await svc(`select public.admin_log($1, 'test.entry', 'test', 'x', '1', 'label', '{"a":1}', '{"a":2}', 'why', '1.2.3.4', 'ua', null)`, [F]);
    const e = await one<{ actor_email: string; actor_roles: string[] }>(`select actor_email, actor_roles from admin_audit where action = 'test.entry'`);
    expect(e.actor_email).toBe("uxgate8@gmail.com");
    expect(e.actor_roles).toEqual(["super_admin"]);
    await expect(svc(`update admin_audit set reason = 'changed'`)).rejects.toThrow(/append-only|permission denied/);
    await expect(svc(`delete from admin_audit`)).rejects.toThrow(/append-only|permission denied/);
    await expect(db.exec(`update admin_audit set reason = 'changed'`)).rejects.toThrow(/append-only/);
    await expect(db.exec(`delete from admin_audit`)).rejects.toThrow(/append-only/);
    await expect(db.exec(`truncate admin_audit`)).rejects.toThrow(/append-only/);
  });
});

describe("super admins", () => {
  it("cannot be made by writing the role directly", async () => {
    await expect(svc(`insert into admin_member_roles (user_id, role_id) values ($1, 'super_admin')`, [S])).rejects.toThrow(/24 hours/);
    await expect(svc(`select public.admin_set_roles($1, $2, array['super_admin'], 'r', null, null, null)`, [F, S])).rejects.toThrow(/own grant/);
  });

  it("keeps the founding super admin and the last super admin", async () => {
    await expect(svc(`delete from admin_member_roles where user_id = $1 and role_id = 'super_admin'`, [F])).rejects.toThrow(/founding/);
    await expect(svc(`update admin_members set status = 'suspended' where user_id = $1`, [F])).rejects.toThrow(/founding/);
    await expect(svc(`delete from admin_members where user_id = $1`, [F])).rejects.toThrow(/founding/);
    await expect(svc(`select public.admin_remove_member($1, $2, 'r', null, null, null)`, [L, F])).rejects.toThrow(/team.invite|founding/);
  });

  it("only the founding protection stops removing super admin: a second super admin can be removed, the founding cannot", async () => {
    const g = (await svc<{ id: string }>(`select public.admin_request_super($1, $2, 'Second founder', null, null, null) id`, [F, L]))[0].id;
    // Nothing happens before the 24 hours pass.
    await svc(`select public.admin_activate_super_grants()`);
    expect(await perms(L)).not.toContain("team.super");
    await db.query(`update super_admin_grants set effective_at = now() - interval '1 second' where id = $1`, [g]);
    await svc(`select * from public.admin_context($1)`, [L]); // the guard's load activates due grants
    expect(await perms(L)).toContain("team.super");
    expect((await one<{ status: string }>(`select status from super_admin_grants where id = $1`, [g])).status).toBe("active");
    // L, now a super admin, cannot remove the founding one, nor themselves.
    await expect(svc(`select public.admin_remove_super($1, $2, 'r', null, null, null)`, [L, F])).rejects.toThrow(/founding/);
    await expect(svc(`select public.admin_remove_super($1, $2, 'r', null, null, null)`, [L, L])).rejects.toThrow(/own roles/);
    await svc(`select public.admin_remove_super($1, $2, 'Back to lead', null, null, null)`, [F, L]);
    expect(await perms(L)).not.toContain("team.super");
  });

  it("lets a super admin cancel a pending grant, and a non-super cannot ask for one", async () => {
    await expect(svc(`select public.admin_request_super($1, $2, 'Nope', null, null, null)`, [L, S])).rejects.toThrow(/team.super/);
    const g = (await svc<{ id: string }>(`select public.admin_request_super($1, $2, 'Maybe', null, null, null) id`, [F, S]))[0].id;
    await svc(`select public.admin_cancel_super($1, $2, 'Changed my mind', null, null, null)`, [F, g]);
    await db.query(`update super_admin_grants set effective_at = now() - interval '1 second' where id = $1`, [g]);
    await svc(`select public.admin_activate_super_grants()`);
    expect(await perms(S)).not.toContain("team.super");
  });
});

describe("team changes", () => {
  it("nobody changes their own roles, and roles need team.invite", async () => {
    await expect(svc(`select public.admin_set_roles($1, $1, array['admin'], 'r', null, null, null)`, [F])).rejects.toThrow(/own roles/);
    await expect(svc(`select public.admin_set_roles($1, $2, array['admin'], 'r', null, null, null)`, [S, L])).rejects.toThrow(/team.invite/);
    await svc(`select public.admin_set_roles($1, $2, array['support_agent', 'billing_manager'], 'Covers billing', null, null, null)`, [F, S]);
    expect(await perms(S)).toContain("refunds.approve_any");
    const a = await one<{ before: { roles: string[] }; after: { roles: string[] } }>(`select before, after from admin_audit where action = 'team.roles_changed' order by id desc limit 1`);
    expect(a.before.roles).toEqual(["support_agent"]);
    expect(a.after.roles).toEqual(["billing_manager", "support_agent"]);
    await svc(`select public.admin_set_roles($1, $2, array['support_agent'], 'Back', null, null, null)`, [F, S]);
  });

  it("suspending ends every panel session and takes all permissions", async () => {
    expect((await svc<{ s: string }>(`select public.admin_touch_session('00000000-0000-0000-0000-000000000001', $1, '1.1.1.1', 'ua') s`, [S]))[0].s).toBe("ok");
    await svc(`select public.admin_set_status($1, $2, 'suspended', 'Left the team', null, null, null)`, [F, S]);
    expect(await perms(S)).toEqual([]);
    expect((await svc<{ s: string }>(`select public.admin_touch_session('00000000-0000-0000-0000-000000000001', $1, '1.1.1.1', 'ua') s`, [S]))[0].s).toBe("ended");
    await svc(`select public.admin_set_status($1, $2, 'active', 'Back', null, null, null)`, [F, S]);
    expect(await perms(S)).toContain("support.reply");
    // The old session stays ended; a new sign-in makes a new session id.
    expect((await svc<{ s: string }>(`select public.admin_touch_session('00000000-0000-0000-0000-000000000001', $1, '1.1.1.1', 'ua') s`, [S]))[0].s).toBe("ended");
  });

  it("ends a session after 30 minutes idle or 12 hours in total", async () => {
    const id = "00000000-0000-0000-0000-000000000002";
    expect((await svc<{ s: string }>(`select public.admin_touch_session($1, $2, null, null) s`, [id, L]))[0].s).toBe("ok");
    await db.query(`update admin_sessions set last_seen_at = now() - interval '31 minutes' where session_id = $1`, [id]);
    expect((await svc<{ s: string }>(`select public.admin_touch_session($1, $2, null, null) s`, [id, L]))[0].s).toBe("expired");
    expect((await svc<{ s: string }>(`select public.admin_touch_session($1, $2, null, null) s`, [id, L]))[0].s).toBe("ended");
    const id2 = "00000000-0000-0000-0000-000000000003";
    await svc(`select public.admin_touch_session($1, $2, null, null)`, [id2, L]);
    await db.query(`update admin_sessions set started_at = now() - interval '12 hours 1 minute' where session_id = $1`, [id2]);
    expect((await svc<{ s: string }>(`select public.admin_touch_session($1, $2, null, null) s`, [id2, L]))[0].s).toBe("expired");
  });

  it("a session id belongs to one admin", async () => {
    const id = "00000000-0000-0000-0000-000000000004";
    await svc(`select public.admin_touch_session($1, $2, null, null)`, [id, L]);
    expect((await svc<{ s: string }>(`select public.admin_touch_session($1, $2, null, null) s`, [id, S]))[0].s).toBe("ended");
  });
});

describe("invites", () => {
  it("only work for the invited email, within 72 hours, and never carry super admin", async () => {
    await expect(svc(`select public.admin_invite($1, 'x@uxgate.org', array['super_admin'], 'tok-x', null, null, null)`, [F])).rejects.toThrow();
    await svc(`select public.admin_invite($1, 'New@UXGate.org', array['analyst'], 'tok-new', null, null, null)`, [F]);
    await expect(svc(`select public.admin_accept_invite($1, 'other@uxgate.org', 'tok-new', 'N', null, null)`, [N])).rejects.toThrow(/another email/);
    await db.exec(`update admin_invites set expires_at = now() - interval '1 second' where token_hash = 'tok-new'`);
    await expect(svc(`select public.admin_accept_invite($1, 'new@uxgate.org', 'tok-new', 'N', null, null)`, [N])).rejects.toThrow(/expired/);
    // A new invite replaces the old one; the old link stops working.
    await svc(`select public.admin_invite($1, 'new@uxgate.org', array['analyst'], 'tok-new-2', null, null, null)`, [F]);
    await expect(svc(`select public.admin_accept_invite($1, 'new@uxgate.org', 'tok-new', 'N', null, null)`, [N])).rejects.toThrow(/not found|expired/);
    await svc(`select public.admin_accept_invite($1, 'new@uxgate.org', 'tok-new-2', 'N', null, null)`, [N]);
    expect(await perms(N)).toContain("reports.view");
    expect(await perms(N)).not.toContain("learners.reveal");
  });

  it("a support agent cannot invite", async () => {
    await expect(svc(`select public.admin_invite($1, 'y@uxgate.org', array['analyst'], 'tok-y', null, null, null)`, [S])).rejects.toThrow(/team.invite/);
  });
});

describe("approvals", () => {
  it("need a second person who holds the permission", async () => {
    const id = (await svc<{ id: string }>(`select public.admin_request_approval($1, 'refund', 'refunds.approve_any', 'Refund $72', '{"amount":7200}', 'refund_request', 'r1', 'Over the limit', null, null, null) id`, [S]))[0].id;
    await expect(svc(`select public.admin_decide_approval($1, $2, 'approved', 'ok', null, null, null)`, [S, id])).rejects.toThrow(/refunds.approve_any|own request/);
    await expect(svc(`select public.admin_decide_approval($1, $2, 'approved', 'ok', null, null, null)`, [N, id])).rejects.toThrow(/refunds.approve_any/);
    await expect(db.query(`update admin_approvals set status = 'approved', decided_by = requested_by where id = $1`, [id])).rejects.toThrow(/own request/);
    const a = (await svc<{ status: string }>(`select (public.admin_decide_approval($1, $2, 'approved', 'Fine', null, null, null)).status`, [L, id]))[0];
    expect(a.status).toBe("approved");
    await expect(svc(`select public.admin_decide_approval($1, $2, 'declined', 'no', null, null, null)`, [F, id])).rejects.toThrow(/not waiting/);
  });
});
