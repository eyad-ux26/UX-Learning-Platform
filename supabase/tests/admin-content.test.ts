import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Admin panel Phase 2 (0060+): versioned content, drafts, releases, publish and roll back. Runs every migration on an
// in-process Postgres with Supabase-shaped roles, then proves the rules hold whatever the app does.

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
let E: string; // content editor
let P: string; // content publisher
let P2: string; // second content publisher
let X: string; // a learner

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

const body = (id: string, word: string, ar = "نص") => ({ id, mode: "lesson", minutes: 4, title: { en: "T", ar: "ع" }, steps: [{ id: "S01", type: "card", part: "hook", body: { en: word, ar } }] });
const live = async (lesson: string) => (await one<{ hash: string; version_no: number }>(`select hash, version_no from public.content_live_hashes() where lesson_id = $1`, [lesson]));
const save = (who: string, lesson: string, b: unknown) =>
  svc(`select public.admin_content_save_draft($1, $2, (select version_id from lesson_live where lesson_id = $2), $3::jsonb, '{}', null, null, null)`, [who, lesson, JSON.stringify(b)]);
const OK = JSON.stringify({ ok: true, failed: [] });
const submit = async (who: string, lessons: string[], checks = OK) =>
  (await svc<{ id: string }>(`select public.admin_content_submit($1, 'Fix wording', null, $2, $3::jsonb, null, null, null) id`, [who, lessons, checks]))[0].id;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BOOT);
  F = (await one<{ id: string }>(`insert into auth.users (email) values ('UXGate8@gmail.com') returning id`)).id;
  for (const f of migrations) await db.exec(fs.readFileSync(path.join(here, "../migrations", f), "utf8"));
  const mk = async (email: string) => (await one<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [email])).id;
  E = await mk("editor@uxgate.org");
  P = await mk("publisher@uxgate.org");
  P2 = await mk("publisher2@uxgate.org");
  X = await mk("learner@example.com");
  for (const [u, email, role] of [[E, "editor@uxgate.org", "content_editor"], [P, "publisher@uxgate.org", "content_publisher"], [P2, "publisher2@uxgate.org", "content_publisher"]]) {
    await svc(`select public.admin_invite($1, $2, array[$3], $4, null, null, null)`, [F, email, role, `tok-${email}`]);
    await svc(`select public.admin_accept_invite($1, $2, $3, 'Name', null, null)`, [u, email, `tok-${email}`]);
  }
  await db.exec(`
    insert into paths (id, title, status) values ('P15', '{"en":"UX writing","ar":"x"}', 'published');
    insert into units (id, path_id, title) values ('P15-U01', 'P15', '{"en":"U","ar":"و"}');
    insert into lessons (id, unit_id) values ('P15-U01-L01', 'P15-U01'), ('P15-U01-L02', 'P15-U01');
  `);
  await db.query(`insert into content_versions (lesson_id, hash, body) values ('P15-U01-L01', 'h-old', $1), ('P15-U01-L01', 'h1', $2), ('P15-U01-L02', 'h2', $3)`,
    [JSON.stringify(body("P15-U01-L01", "older")), JSON.stringify(body("P15-U01-L01", "first")), JSON.stringify(body("P15-U01-L02", "second"))]);
});

describe("permissions (0060)", () => {
  it("adds the Phase 2 keys to the built-in roles", async () => {
    const perms = async (u: string) => (await one<{ p: string[] }>(`select public.admin_perms($1) p`, [u])).p;
    expect(await perms(E)).toEqual(expect.arrayContaining(["content.edit", "media.manage"]));
    expect(await perms(E)).not.toContain("content.publish");
    expect(await perms(P)).toEqual(expect.arrayContaining(["content.publish", "quality.manage"]));
    expect(await perms(F)).toEqual(expect.arrayContaining(["health.jobs", "settings.flags", "prices.change"]));
    const admin = (await one<{ permissions: string[] }>(`select permissions from admin_roles where id = 'admin'`)).permissions;
    expect(admin).not.toContain("health.jobs");
  });
});

describe("the v1 import and the YAML route", () => {
  it("makes the compiled versions live as v1, once", async () => {
    const items = JSON.stringify([{ lesson_id: "P15-U01-L01", hash: "h1" }, { lesson_id: "P15-U01-L02", hash: "h2" }, { lesson_id: "P15-U01-L09", hash: "x" }]);
    const r = await svc<{ lesson_id: string; result: string }>(`select * from public.content_sync_bundle($1::jsonb) order by 1`, [items]);
    expect(r.map((x) => x.result)).toEqual(["import", "import", "missing"]);
    expect(await live("P15-U01-L01")).toEqual({ hash: "h1", version_no: 1 });
    expect(await svc(`select * from public.content_sync_bundle($1::jsonb)`, [items])).toEqual([{ lesson_id: "P15-U01-L09", result: "missing" }]);
    // the older version stays for replays, without a number
    expect((await one<{ n: number }>(`select count(*)::int n from content_version_info where lesson_id = 'P15-U01-L01'`)).n).toBe(1);
  });

  it("a newer compiled version becomes v2", async () => {
    await db.query(`insert into content_versions (lesson_id, hash, body) values ('P15-U01-L02', 'h2b', $1)`, [JSON.stringify(body("P15-U01-L02", "second, fixed"))]);
    const r = await svc<{ result: string }>(`select * from public.content_sync_bundle('[{"lesson_id":"P15-U01-L02","hash":"h2b"}]')`);
    expect(r[0].result).toBe("yaml");
    expect(await live("P15-U01-L02")).toEqual({ hash: "h2b", version_no: 2 });
  });
});

describe("drafts, review and publish", () => {
  it("only content editors save drafts, and the lesson id must match", async () => {
    await expect(save(X, "P15-U01-L01", body("P15-U01-L01", "x"))).rejects.toThrow(/content.edit/);
    await expect(save(E, "P15-U01-L01", body("P15-U01-L02", "x"))).rejects.toThrow(/does not match/);
    await save(E, "P15-U01-L01", body("P15-U01-L01", "Put the words that matter first"));
    const d = await one<{ editors: string[]; status: string }>(`select editors, status from lesson_drafts where lesson_id = 'P15-U01-L01'`);
    expect(d).toEqual({ editors: [E], status: "draft" });
  });

  it("refuses to send a release whose checks failed", async () => {
    await expect(submit(E, ["P15-U01-L01"], JSON.stringify({ ok: false }))).rejects.toThrow(/failed checks/);
    await expect(submit(E, ["P15-U01-L02"])).rejects.toThrow(/needs a draft/);
  });

  it("freezes drafts in review, and authors never publish their own change", async () => {
    const id = await submit(E, ["P15-U01-L01"]);
    await expect(save(E, "P15-U01-L01", body("P15-U01-L01", "again"))).rejects.toThrow(/in review/);
    await expect(svc(`select public.admin_content_publish($1, $2, null, null, null, null)`, [E, id])).rejects.toThrow(/content.publish/);
    // a publisher who also edited the draft is an author
    await svc(`select public.admin_content_withdraw($1, $2, null, null, null)`, [E, id]);
    await save(P, "P15-U01-L01", body("P15-U01-L01", "Put the words that matter first."));
    const id2 = await submit(E, ["P15-U01-L01"]);
    await expect(svc(`select public.admin_content_publish($1, $2, null, null, null, null)`, [P, id2])).rejects.toThrow(/own change/);
    const n = (await svc<{ n: number }>(`select public.admin_content_publish($1, $2, 'Looks good', null, null, null) n`, [P2, id2]))[0].n;
    expect(n).toBe(1);
    expect((await live("P15-U01-L01")).version_no).toBe(2);
    expect((await one<{ n: number }>(`select count(*)::int n from lesson_drafts`)).n).toBe(0);
    const log = await one<{ action: string; actor_id: string }>(`select action, actor_id from admin_audit where action = 'content.release_published'`);
    expect(log.actor_id).toBe(P2);
  });

  it("the YAML seed no longer overrides a lesson published from the panel", async () => {
    const r = await svc<{ result: string }>(`select * from public.content_sync_bundle('[{"lesson_id":"P15-U01-L01","hash":"h1"}]')`);
    expect(r[0].result).toBe("kept_editor");
    expect((await live("P15-U01-L01")).version_no).toBe(2);
  });

  it("rolls back with a reason, keeps the change as a draft, and only by someone who did not write it", async () => {
    const rel = (await one<{ id: string }>(`select id from content_releases where status = 'published'`)).id;
    await expect(svc(`select public.admin_content_rollback($1, $2, '', null, null, null)`, [P2, rel])).rejects.toThrow(/reason/);
    await expect(svc(`select public.admin_content_rollback($1, $2, 'Typo in Arabic', null, null, null)`, [P, rel])).rejects.toThrow(/own change/);
    await svc(`select public.admin_content_rollback($1, $2, 'Typo in Arabic', null, null, null)`, [P2, rel]);
    expect(await live("P15-U01-L01")).toEqual({ hash: "h1", version_no: 1 });
    const d = await one<{ status: string; body: { steps: { body: { en: string } }[] } }>(`select status, body from lesson_drafts where lesson_id = 'P15-U01-L01'`);
    expect(d.status).toBe("draft");
    expect(d.body.steps[0].body.en).toBe("Put the words that matter first.");
    expect((await one<{ status: string }>(`select status from content_releases where id = $1`, [rel])).status).toBe("rolled_back");
  });

  it("a declined release needs a note and gives the drafts back", async () => {
    const id = await submit(E, ["P15-U01-L01"]);
    await expect(svc(`select public.admin_content_decline($1, $2, '', null, null, null)`, [P2, id])).rejects.toThrow(/what needs to change/);
    await svc(`select public.admin_content_decline($1, $2, 'Arabic step 1 reads oddly', null, null, null)`, [P2, id]);
    expect((await one<{ status: string }>(`select status from lesson_drafts where lesson_id = 'P15-U01-L01'`)).status).toBe("draft");
  });
});

describe("row-level security", () => {
  it("learners and visitors cannot read or call any of it", async () => {
    for (const t of ["content_version_info", "lesson_live", "lesson_drafts", "content_releases", "content_release_items"]) {
      await expect(asUser("authenticated", X, `select * from ${t}`)).rejects.toThrow(/permission denied/);
      await expect(asUser("anon", null, `select * from ${t}`)).rejects.toThrow(/permission denied/);
    }
    await expect(asUser("authenticated", X, `select * from public.content_live_hashes()`)).rejects.toThrow(/permission denied/);
    await expect(asUser("authenticated", X, `select * from public.content_sync_bundle('[]')`)).rejects.toThrow(/permission denied/);
  });
});

describe("settings and flags (0061)", () => {
  it("seeds the new flags off and the learning rules with the code defaults", async () => {
    const cfg = (await svc<{ c: { flags: Record<string, boolean>; settings: Record<string, unknown>; team_password_set: boolean } }>(`select public.app_config() c`))[0].c;
    expect(cfg.flags).toMatchObject({ leaderboard: false, trials: false, announcements: false, content_db: false });
    expect(cfg.settings).toMatchObject({ "learning.freeze_goal_days": 5, "learning.freeze_max": 2, "learning.review_after_days": 3, "trial.days": 7, "access.maintenance": false });
    expect(cfg.team_password_set).toBe(false);
    // visitors may read it (the middleware does): it holds no secret
    expect(await asUser("anon", null, `select public.app_config()`)).toHaveLength(1);
  });

  it("changes need the permission and a reason, are checked and logged", async () => {
    await expect(svc(`select public.admin_set_flag($1, 'trials', true, 'Launch', null, null, null)`, [E])).rejects.toThrow(/settings.flags/);
    await expect(svc(`select public.admin_set_flag($1, 'trials', true, '', null, null, null)`, [F])).rejects.toThrow(/reason/);
    await expect(svc(`select public.admin_set_flag($1, 'nope', true, 'Why', null, null, null)`, [F])).rejects.toThrow(/unknown flag/);
    await svc(`select public.admin_set_flag($1, 'trials', true, 'Testing trials', null, null, null)`, [F]);
    expect((await one<{ after: { enabled: boolean } }>(`select after from admin_audit where action = 'settings.flag_changed' order by id desc limit 1`)).after.enabled).toBe(true);
    await expect(svc(`select public.admin_set_setting($1, 'trial.days', '10', 'Longer', null, null, null)`, [F])).rejects.toThrow(/3, 7 or 14/);
    await expect(svc(`select public.admin_set_setting($1, 'learning.freeze_max', '2.5', 'More', null, null, null)`, [F])).rejects.toThrow(/whole number/);
    await expect(svc(`select public.admin_set_setting($1, 'learning.bogus', '1', 'More', null, null, null)`, [F])).rejects.toThrow(/unknown setting/);
    await svc(`select public.admin_set_setting($1, 'learning.freeze_max', '3', 'Freezes 2 to 3', null, null, null)`, [F]);
    await expect(svc(`select public.admin_set_setting($1, 'access.maintenance_message', '{"en":"Back soon"}', 'Msg', null, null, null)`, [F])).rejects.toThrow(/English and Arabic/);
  });

  it("stores the team password only as a hash, which nobody but the server reads", async () => {
    await expect(svc(`select public.admin_set_team_password($1, 'plain-password', 'New', null, null, null)`, [F])).rejects.toThrow(/not a password hash/);
    const h = `pbkdf2$210000$${"a".repeat(32)}$${"b".repeat(64)}`;
    await svc(`select public.admin_set_team_password($1, $2, 'Rotated after a leak', null, null, null)`, [F, h]);
    expect((await svc<{ h: string }>(`select public.app_team_password() h`))[0].h).toBe(h);
    await expect(asUser("anon", null, `select public.app_team_password()`)).rejects.toThrow(/permission denied/);
    await expect(asUser("authenticated", X, `select * from app_secrets`)).rejects.toThrow(/permission denied/);
    expect(JSON.stringify((await svc(`select public.app_config() c`))[0])).not.toContain("pbkdf2");
  });

  it("learners still read flags, but not who changed them", async () => {
    expect(await asUser("authenticated", X, `select key, enabled from app_flags where key = 'leaderboard'`)).toHaveLength(1);
    await expect(asUser("authenticated", X, `select updated_by from app_flags`)).rejects.toThrow(/permission denied/);
  });
});

describe("trials (0062)", () => {
  it("one trial per learner who never had Pro, as long as the flag is on", async () => {
    const T = (await one<{ id: string }>(`insert into auth.users (email) values ('trial@example.com') returning id`)).id;
    await svc(`select public.admin_set_setting($1, 'trial.days', '14', 'Two weeks', null, null, null)`, [F]);
    const end = (await svc<{ e: string }>(`select public.start_trial($1) e`, [T]))[0].e;
    expect(new Date(end).getTime() - Date.now()).toBeGreaterThan(13.9 * 86_400_000);
    expect((await svc<{ p: boolean }>(`select public.has_pro($1) p`, [T]))[0].p).toBe(true);
    await expect(svc(`select public.start_trial($1)`, [T])).rejects.toThrow(/used/);
    expect(await asUser("authenticated", T, `select days from trials`)).toEqual([{ days: 14 }]);
    expect(await asUser("authenticated", X, `select * from trials`)).toHaveLength(0);
    // paying converts it
    await db.query(`update entitlements set source = 'live', valid_until = now() + interval '30 days' where user_id = $1`, [T]);
    expect((await one<{ status: string }>(`select status from trials where user_id = $1`, [T])).status).toBe("converted");
    await expect(svc(`select public.admin_extend_trial($1, $2, 3, 'Asked nicely', null, null, null)`, [F, T])).rejects.toThrow(/already pays/);
  });

  it("support extends a running trial with a reason; the daily job ends it; the flag off stops new ones", async () => {
    const T2 = (await one<{ id: string }>(`insert into auth.users (email) values ('trial2@example.com') returning id`)).id;
    await svc(`select public.start_trial($1)`, [T2]);
    await expect(svc(`select public.admin_extend_trial($1, $2, 3, 'x', null, null, null)`, [F, T2])).rejects.toThrow(/reason/);
    await expect(svc(`select public.admin_extend_trial($1, $2, 3, 'Was ill', null, null, null)`, [E, T2])).rejects.toThrow(/trials.extend/);
    await svc(`select public.admin_extend_trial($1, $2, 3, 'Was ill', null, null, null)`, [F, T2]);
    expect((await one<{ extended_days: number }>(`select extended_days from trials where user_id = $1`, [T2])).extended_days).toBe(3);
    await db.query(`update trials set ends_at = now() - interval '1 minute' where user_id = $1`, [T2]);
    const due = await svc<{ user_id: string; kind: string }>(`select * from public.trials_due()`);
    expect(due).toEqual([expect.objectContaining({ user_id: T2, kind: "ended" })]);
    await svc(`select public.trial_mark($1, 'ended')`, [T2]);
    expect(await svc(`select * from public.trials_due()`)).toHaveLength(0);
    await svc(`select public.admin_set_flag($1, 'trials', false, 'Pause trials', null, null, null)`, [F]);
    const T3 = (await one<{ id: string }>(`insert into auth.users (email) values ('trial3@example.com') returning id`)).id;
    await expect(svc(`select public.start_trial($1)`, [T3])).rejects.toThrow(/off/);
  });
});
