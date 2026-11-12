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
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now(), email_confirmed_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz);
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id) on delete cascade, provider text not null);
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
    await expect(svc(`insert into admin_roles (id, name, permissions) values ('night_support', 'Night support', array['support.view'])`)).rejects.toThrow(/admin_save_role/);
    const r = await svc<{ id: string }>(`select public.admin_save_role($1, 'night_support', 'Night support', '', array['support.view'], 'r', null, null, null) as id`, [F]);
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

describe("learners and comp access (0045)", () => {
  it("finds learners by email, name, receipt and certificate id", async () => {
    await db.exec(`insert into paths (id, title, status) values ('P01', '{"en":"Forms","ar":"x"}', 'published') on conflict do nothing`);
    await db.query(`update profiles set display_name = 'Mona Learner' where user_id = $1`, [X]);
    await db.query(`insert into auth.identities (user_id, provider) values ($1, 'google')`, [X]);
    await db.query(`insert into payments (user_id, provider, provider_payment_id, kind, period, amount_minor, currency, status, receipt_no, paid_at)
      values ($1, 'paddle', 'txn_abc123', 'first', 'year', 7200, 'USD', 'paid', 'UXG-2026-000777', now())`, [X]);
    await db.query(`insert into certificates (user_id, path_id, code) values ($1, 'P01', 'abcdef123456')`, [X]);
    const find = async (q: string) => (await svc<{ user_id: string; method: string; total: string }>(`select * from public.admin_learners(p_q => $1)`, [q]));
    for (const q of ["learner@example", "mona", "uxg-2026-000777", "txn_abc123", "UXG-P01-ABCDEF12", X]) {
      const r = await find(q);
      expect(r.map((x) => x.user_id), q).toContain(X);
    }
    expect((await find("learner@example"))[0].method).toBe("google");
    expect(await find("abc")).toHaveLength(0);
    await expect(asUser("authenticated", X, `select * from public.admin_learners()`)).rejects.toThrow(/permission denied/);
  });

  it("support gives free Pro for up to 30 days, never to itself; billing has no limit", async () => {
    await expect(svc(`select public.admin_grant_comp($1, $2, now() + interval '40 days', 'Goodwill', null, null, null)`, [S, X])).rejects.toThrow(/30 days/);
    await expect(svc(`select public.admin_grant_comp($1, $1, now() + interval '5 days', 'Mine', null, null, null)`, [S])).rejects.toThrow(/own account/);
    await expect(svc(`select public.admin_grant_comp($1, $2, now() + interval '5 days', 'Nope', null, null, null)`, [N, X])).rejects.toThrow(/comp.grant/);
    await svc(`select public.admin_grant_comp($1, $2, now() + interval '7 days', 'Bug cost them a week', null, null, null)`, [S, X]);
    const e = await one<{ plan: string; source: string }>(`select plan, source from entitlements where user_id = $1`, [X]);
    expect(e).toMatchObject({ plan: "pro", source: "manual" });
    expect((await svc<{ plan: string }>(`select plan from public.admin_learners(p_q => 'mona')`))[0].plan).toBe("comp");
    await svc(`select public.admin_grant_comp($1, $2, now() + interval '200 days', 'Partner', null, null, null)`, [F, X]);
    await svc(`select public.admin_end_comp($1, $2, 'Partner ended', null, null, null)`, [L, X]);
    expect((await one<{ on: boolean }>(`select valid_until <= now() as on from entitlements where user_id = $1`, [X])).on).toBe(true);
    const log = (await db.query<{ action: string }>(`select action from admin_audit where target_id = $1 order by id`, [X])).rows.map((r) => r.action);
    expect(log).toEqual(expect.arrayContaining(["learners.comp_granted", "learners.comp_ended"]));
  });

  it("ending free Pro hands back to a paid plan that is still running", async () => {
    await db.query(`insert into subscriptions (user_id, provider, region, country, period, currency, renew_amount_minor, status, current_period_start, current_period_end)
      values ($1, 'paddle', 'world', 'DE', 'year', 'USD', 7200, 'active', now(), now() + interval '300 days')`, [X]);
    await svc(`select public.admin_grant_comp($1, $2, now() + interval '400 days', 'Extra', null, null, null)`, [F, X]);
    await svc(`select public.admin_end_comp($1, $2, 'Undo', null, null, null)`, [F, X]);
    const e = await one<{ source: string; left: number }>(`select source, extract(day from valid_until - now())::int as left from entitlements where user_id = $1`, [X]);
    expect(e.source).toBe("live");
    expect(e.left).toBeGreaterThan(290);
  });
});

describe("certificates (0045)", () => {
  it("revoke needs certs.manage, is final, and is logged", async () => {
    await expect(svc(`select public.admin_revoke_certificate($1, 'abcdef123456', '{"en":"x","ar":"x"}', 'Shared account', null, null, null)`, [S])).rejects.toThrow(/certs.manage/);
    await expect(svc(`select public.admin_reissue_certificate($1, 'abcdef123456', 'Mona A.', 'Name fix', null, null, null)`, [N])).rejects.toThrow(/certs.manage/);
    await svc(`select public.admin_reissue_certificate($1, 'abcdef123456', 'Mona Ahmed', 'Name fix', null, null, null)`, [F]);
    expect((await one<{ display_name: string }>(`select display_name from profiles where user_id = $1`, [X])).display_name).toBe("Mona Ahmed");
    await svc(`select public.admin_revoke_certificate($1, 'abcdef123456', '{"en":"Earned by someone else","ar":"x"}', 'Shared account', null, null, null)`, [F]);
    const c = await one<{ revoked_at: string | null; reason: string }>(`select revoked_at, revoked_reason ->> 'en' reason from certificates where code = 'abcdef123456'`);
    expect(c.revoked_at).not.toBeNull();
    expect(c.reason).toBe("Earned by someone else");
    await expect(svc(`select public.admin_revoke_certificate($1, 'abcdef123456', '{}', 'again', null, null, null)`, [F])).rejects.toThrow(/already revoked/);
    await expect(svc(`select public.admin_reissue_certificate($1, 'abcdef123456', null, 'again', null, null, null)`, [F])).rejects.toThrow(/revoked/);
  });
});

describe("support (0046)", () => {
  it("counts first-reply time in business hours of the ticket's language", async () => {
    // Thursday 16:00 Cairo (UTC+2 in November): English hours are Mon to Fri 9 to 18, Arabic Sat to Thu 9 to 18.
    const due = async (lang: string, hours: number) =>
      (await one<{ d: string }>(`select to_char(public.support_due('2026-11-12 14:00+00', $1, $2) at time zone 'Africa/Cairo', 'Dy HH24:MI') d`, [hours, lang])).d;
    expect(await due("en", 2)).toBe("Thu 18:00");
    expect(await due("en", 3)).toBe("Fri 10:00");
    expect(await due("en", 12)).toBe("Mon 10:00");
    expect(await due("ar", 3)).toBe("Sat 10:00");
    // A day off is skipped like a weekend.
    await db.exec(`update support_settings set days_off = '{2026-11-13}' where id = 1`);
    expect(await due("en", 3)).toBe("Mon 10:00");
    await db.exec(`update support_settings set days_off = '{}' where id = 1`);
  });

  it("turns refund requests and broken-question reports into tickets, not appeals", async () => {
    const pay = (await one<{ id: string }>(`select id from payments where provider_payment_id = 'txn_abc123'`)).id;
    await db.query(`insert into refund_requests (user_id, payment_id, amount_minor, currency, reason) values ($1, $2, 7200, 'USD', 'Bought by mistake')`, [X, pay]);
    const t = await one<{ channel: string; status: string; user_id: string; first_reply_due: string | null }>(`select * from support_tickets where link_type = 'refund_request'`);
    expect(t).toMatchObject({ channel: "refund", status: "waiting_team", user_id: X });
    expect(t.first_reply_due).not.toBeNull();
    await db.exec(`insert into units (id, path_id, title) values ('U1', 'P01', '{}') on conflict do nothing; insert into lessons (id, unit_id) values ('L1', 'U1') on conflict do nothing`);
    await db.query(`insert into review_requests (user_id, lesson_id, step_id, answer, reason) values ($1, 'L1', 's1', '{}', 'answer_works')`, [X]);
    await db.query(`insert into review_requests (user_id, lesson_id, step_id, answer, reason, note) values ($1, 'L1', 's2', '{}', 'broken', 'Image missing')`, [X]);
    const reports = (await db.query<{ subject: string }>(`select subject from support_tickets where channel = 'lesson_report'`)).rows;
    expect(reports).toHaveLength(1);
    expect(reports[0].subject).toContain("s2");
  });

  it("assigns round robin among members who can reply", async () => {
    await db.exec(`update support_settings set assignment = 'round_robin'`);
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await one<{ a: string }>(`insert into support_tickets (email, subject, channel) values ('q@x.com', 'Hi', 'email') returning assignee_id a`)).a);
    const repliers = new Set([F, S, L]);
    for (const a of ids) expect(repliers.has(a)).toBe(true);
    expect(new Set(ids.slice(0, 3)).size).toBe(3);
    await db.exec(`update support_settings set assignment = 'manual'`);
  });

  it("keeps tickets away from learners", async () => {
    await expect(asUser("authenticated", X, `select * from support_tickets`)).rejects.toThrow(/permission denied/);
    await expect(asUser("anon", null, `select * from support_messages`)).rejects.toThrow(/permission denied/);
  });
});

describe("dashboard (0047)", () => {
  it("counts the window's key numbers and money by Cairo day", async () => {
    const rows = (await db.query<{ metric: string; n: number }>(`select metric, n::int from public.admin_dash_counts(now() - interval '1 day', now() + interval '1 minute')`)).rows;
    const m = Object.fromEntries(rows.map((r) => [r.metric, r.n]));
    expect(Object.keys(m).sort()).toEqual(["active", "cancellations", "certificates", "signups", "subscribers"]);
    expect(m.signups).toBeGreaterThan(0);
    const money = (await db.query<{ provider: string; paid_minor: number }>(`select provider, paid_minor::int from public.admin_dash_money(now() - interval '400 days')`)).rows;
    expect(money.length).toBeGreaterThan(0);
    const funnel = (await db.query<{ step: string }>(`select step from public.admin_funnel(now() - interval '30 days')`)).rows.map((r) => r.step);
    expect(funnel).toEqual(["signup", "lesson", "unit", "subscribe", "path", "share"]);
    await expect(asUser("authenticated", X, `select * from public.admin_funnel(now())`)).rejects.toThrow(/permission denied/);
  });
});

describe("test money stays off the money screens (0065)", () => {
  it("marks test-provider rows as test and leaves them out of the dashboard", async () => {
    const before = (await db.query<{ provider: string; paid_minor: number }>(`select provider, paid_minor::int from public.admin_dash_money(now() - interval '400 days')`)).rows;
    const mockBefore = before.filter((r) => r.provider === "mock").reduce((t, r) => t + r.paid_minor, 0);
    await db.query(`insert into payments (user_id, provider, provider_payment_id, kind, period, amount_minor, currency, status, paid_at)
      values ($1, 'mock', 'mock_t1', 'first', 'month', 800, 'USD', 'paid', now()), ($1, 'paymob', 'pm_real_1', 'first', 'month', 9900, 'EGP', 'paid', now())`, [X]);
    const rows = (await db.query<{ provider_payment_id: string; test: boolean }>(`select provider_payment_id, test from payments where provider_payment_id in ('mock_t1', 'pm_real_1') order by 1`)).rows;
    expect(rows).toEqual([{ provider_payment_id: "mock_t1", test: true }, { provider_payment_id: "pm_real_1", test: false }]);
    const after = (await db.query<{ provider: string; paid_minor: number }>(`select provider, paid_minor::int from public.admin_dash_money(now() - interval '400 days')`)).rows;
    expect(after.filter((r) => r.provider === "mock").reduce((t, r) => t + r.paid_minor, 0)).toBe(mockBefore);
    expect(after.some((r) => r.provider === "paymob" && r.paid_minor >= 9900)).toBe(true);
    // A row the app marks as test (Paddle sandbox) is left out too.
    await db.query(`insert into payments (user_id, provider, provider_payment_id, kind, period, amount_minor, currency, status, paid_at, test)
      values ($1, 'paddle', 'txn_sandbox_1', 'first', 'month', 1700, 'USD', 'paid', now(), true)`, [X]);
    const shown = (await db.query<{ n: number }>(`select coalesce(sum(paid_minor), 0)::int n from public.admin_dash_money(now() - interval '400 days') where provider = 'paddle'`)).rows[0].n;
    const real = (await db.query<{ n: number }>(`select coalesce(sum(amount_minor), 0)::int n from payments where provider = 'paddle' and not test`)).rows[0].n;
    expect(shown).toBe(real);
  });
  it("leaves sandbox money out of the reports too (growth paid count, money by plan)", async () => {
    const paid = async () => (await db.query<{ n: number }>(`select coalesce(sum(paid), 0)::int n from public.admin_report_growth(now() - interval '2 days', now() + interval '1 day')`)).rows[0].n;
    const plans = async () => (await db.query<{ n: number }>(`select coalesce(sum(plans), 0)::int n from public.admin_report_money() where provider = 'paddle'`)).rows[0].n;
    const [paid0, plans0] = [await paid(), await plans()];
    const S = (await one<{ id: string }>(`insert into auth.users (email) values ('sandbox@example.com') returning id`)).id;
    await db.query(`insert into payments (user_id, provider, provider_payment_id, kind, period, amount_minor, currency, status, paid_at, test)
      values ($1, 'paddle', 'txn_sandbox_2', 'first', 'month', 1700, 'USD', 'paid', now(), true)`, [S]);
    await db.query(`insert into subscriptions (user_id, provider, provider_sub_id, region, country, period, currency, renew_amount_minor, status, current_period_start, current_period_end, test)
      values ($1, 'paddle', 'sub_sandbox_2', 'world', 'DE', 'month', 'USD', 1700, 'active', now(), now() + interval '30 days', true)`, [S]);
    expect(await paid()).toBe(paid0);
    expect(await plans()).toBe(plans0);
  });
});

describe("emails that never arrived (0066)", () => {
  it("keeps one row per webhook event and address, and only the service role can read them", async () => {
    const ins = `insert into email_bounces (email, kind, detail, resend_id, event_id) values ('new@example.com', 'bounced', 'Mailbox does not exist', 're_1', 'msg_1') on conflict (event_id, email) do nothing`;
    await db.query(ins);
    await db.query(ins);
    expect((await one<{ n: number }>(`select count(*)::int n from email_bounces where event_id = 'msg_1'`)).n).toBe(1);
    await expect(db.query(`insert into email_bounces (email, kind, event_id) values ('Upper@Example.com', 'bounced', 'msg_2')`)).rejects.toThrow(/check/);
    await expect(db.query(`insert into email_bounces (email, kind, event_id) values ('a@b.co', 'delivered', 'msg_3')`)).rejects.toThrow(/check/);
    await expect(asUser("authenticated", X, `select * from public.email_bounces`)).rejects.toThrow(/permission denied/);
    await expect(asUser("anon", null, `select * from public.email_bounces`)).rejects.toThrow(/permission denied/);
  });
});

describe("custom roles stay within the editor's own permissions (0048)", () => {
  it("refuses roles with permissions the editor lacks, edits to a role the editor holds, and giving such roles", async () => {
    const A = (await one<{ id: string }>(`insert into auth.users (email) values ('ops@uxgate.org') returning id`)).id;
    await svc(`select public.admin_invite($1, 'ops@uxgate.org', array['admin'], 'tok-ops', null, null, null)`, [F]);
    await svc(`select public.admin_accept_invite($1, 'ops@uxgate.org', 'tok-ops', 'Ops', null, null)`, [A]);
    // The Admin role has team.roles but not audit.export.
    await expect(svc(`select public.admin_save_role($1, 'custom_exp', 'Exporter', '', array['audit.export'], 'r', null, null, null)`, [A])).rejects.toThrow(/permissions you have yourself/);
    // A role made by the founder with audit.export cannot be handed out by the Admin, to an invite or a member.
    await svc(`select public.admin_save_role($1, 'custom_exp', 'Exporter', '', array['audit.export'], 'r', null, null, null)`, [F]);
    await expect(svc(`select public.admin_invite($1, 'second@example.com', array['custom_exp'], 'tok-2', null, null, null)`, [A])).rejects.toThrow(/permissions you have yourself/);
    await expect(svc(`select public.admin_set_roles($1, $2, array['support_agent', 'custom_exp'], 'r', null, null, null)`, [A, S])).rejects.toThrow(/permissions you have yourself/);
    // Nobody edits a role they hold.
    await svc(`select public.admin_save_role($1, 'custom_ops', 'Ops', '', array['support.view'], 'r', null, null, null)`, [F]);
    await svc(`select public.admin_set_roles($1, $2, array['admin', 'custom_ops'], 'r', null, null, null)`, [F, A]);
    await expect(svc(`select public.admin_save_role($1, 'custom_ops', 'Ops', '', array['support.view', 'learners.view'], 'r', null, null, null)`, [A])).rejects.toThrow(/role they hold/);
    // Deleting goes through the function too, and only for roles nobody holds.
    await expect(svc(`delete from admin_roles where id = 'custom_exp'`)).rejects.toThrow(/admin_save_role/);
    await expect(svc(`select public.admin_delete_role($1, 'custom_ops', 'r', null, null, null)`, [F])).rejects.toThrow(/still have this role/);
    await svc(`select public.admin_delete_role($1, 'custom_exp', 'r', null, null, null)`, [F]);
    expect(await one(`select id from admin_roles where id = 'custom_exp'`)).toBeUndefined();
  });

  it("opens a session once when two first requests arrive together", async () => {
    const sid = "00000000-0000-4000-8000-0000000000aa";
    const [a, b] = await Promise.all([
      svc<{ r: string }>(`select public.admin_touch_session($1, $2, '1.1.1.1', 'ua') r`, [sid, F]),
      svc<{ r: string }>(`select public.admin_touch_session($1, $2, '1.1.1.1', 'ua') r`, [sid, F]),
    ]);
    expect([a[0].r, b[0].r]).toEqual(["ok", "ok"]);
  });
});
