import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Runs the real migrations on an in-process Postgres with Supabase-shaped roles and auth.uid(),
// then proves one learner cannot see or change another learner's rows.

const here = path.dirname(fileURLToPath(import.meta.url));
const migrations = fs.readdirSync(path.join(here, "../migrations")).filter((f) => f.endsWith(".sql")).sort();

const BOOT = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
`;

let db: PGlite;
let A: string;
let B: string;
let versionId: string;

/** Runs sql as a signed-in learner (or anon) inside a transaction that is always rolled back. */
async function as<T>(who: "anon" | "authenticated" | "service_role", uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  let rows: T[] = [];
  await db.transaction(async (tx) => {
    await tx.exec(`set local role ${who}`);
    if (uid) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    try { rows = (await tx.query<T>(sql, params)).rows; } finally { await tx.rollback(); }
  });
  return rows;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BOOT);
  for (const f of migrations) await db.exec(fs.readFileSync(path.join(here, "../migrations", f), "utf8"));
  A = (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ('a@example.com', '{"locale":"ar"}') returning id`)).rows[0].id;
  B = (await db.query<{ id: string }>(`insert into auth.users (email) values ('b@example.com') returning id`)).rows[0].id;
  await db.exec(`
    insert into paths (id, title, status) values ('P01', '{"en":"Forms","ar":"نماذج"}', 'published'), ('P99', '{"en":"Hidden","ar":"x"}', 'draft');
    insert into units (id, path_id, title) values ('P01-U01', 'P01', '{"en":"U","ar":"و"}'), ('P99-U01', 'P99', '{"en":"U","ar":"و"}');
    insert into lessons (id, unit_id) values ('P01-U01-L01', 'P01-U01'), ('P99-U01-L01', 'P99-U01');
    insert into content_versions (lesson_id, hash, body) values ('P01-U01-L01', 'h1', '{}'), ('P99-U01-L01', 'h2', '{}');
  `);
  versionId = (await db.query<{ id: string }>(`select id from content_versions where lesson_id = 'P01-U01-L01'`)).rows[0].id;
  for (const [uid, key] of [[A, "a"], [B, "b"]]) {
    const att = (await db.query<{ id: string }>(`insert into attempts (client_attempt_id, user_id, lesson_id, content_version_id) values ($1, $2, 'P01-U01-L01', $3) returning id`, [key, uid, versionId])).rows[0].id;
    await db.query(`insert into step_results (attempt_id, user_id, step_id, try_no, kind, answer, correct, idempotency_key) values ($1, $2, 'S02', 1, 'check', '{"sel":["nid"]}', true, $3)`, [att, uid, `${key}:S02:1`]);
    await db.query(`insert into xp_events (user_id, attempt_id, step_id, outcome, amount) values ($1, $2, 'S02', 'independent', 10)`, [uid, att]);
  }
});

describe("account creation", () => {
  it("creates a profile, onboarding and streak row with the chosen language", async () => {
    const p = await db.query<{ locale: string; display_name: string }>(`select locale, display_name from profiles where user_id = $1`, [A]);
    expect(p.rows[0]).toEqual({ locale: "ar", display_name: "a" });
    expect((await db.query(`select 1 from onboarding where user_id = $1`, [A])).rows).toHaveLength(1);
    expect((await db.query(`select 1 from streaks where user_id = $1`, [A])).rows).toHaveLength(1);
  });
});

describe("one learner cannot read another learner's rows", () => {
  for (const table of ["profiles", "onboarding", "attempts", "step_results", "xp_events", "streaks"]) {
    it(`${table}: A sees only their own`, async () => {
      const rows = await as<{ user_id: string }>("authenticated", A, `select user_id from ${table}`);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.user_id === A)).toBe(true);
    });
    it(`${table}: A asking for B's rows by id gets nothing`, async () => {
      expect(await as("authenticated", A, `select * from ${table} where user_id = $1`, [B])).toHaveLength(0);
    });
  }
  it("a signed-out visitor cannot read any learner table", async () => {
    for (const table of ["profiles", "attempts", "step_results", "xp_events"])
      await expect(as("anon", null, `select * from ${table}`)).rejects.toThrow(/permission denied/);
  });
  it("a request with no user id sees nothing", async () => {
    expect(await as("authenticated", null, `select * from attempts`)).toHaveLength(0);
  });
});

describe("one learner cannot change another learner's rows", () => {
  it("cannot update B's profile", async () => {
    const r = await as<{ user_id: string }>("authenticated", A, `update profiles set display_name = 'hacked' where user_id = $1 returning user_id`, [B]);
    expect(r).toHaveLength(0);
  });
  it("cannot hand their own profile to B", async () => {
    await expect(as("authenticated", A, `update profiles set user_id = $1 where user_id = $2`, [B, A])).rejects.toThrow();
  });
  it("cannot create onboarding or enrollments for B", async () => {
    await expect(as("authenticated", A, `insert into enrollments (user_id, path_id) values ($1, 'P01')`, [B])).rejects.toThrow(/row-level security/);
    await expect(as("authenticated", A, `insert into onboarding (user_id) values ($1) on conflict do nothing`, [B])).rejects.toThrow();
  });
  it("can change their own profile and enrol themselves", async () => {
    const r = await as("authenticated", A, `update profiles set daily_goal = 2 where user_id = $1 returning daily_goal`, [A]);
    expect(r).toHaveLength(1);
    expect(await as("authenticated", A, `insert into enrollments (user_id, path_id) values ($1, 'P01') returning path_id`, [A])).toHaveLength(1);
  });
  it("can only make a path they joined their current path", async () => {
    // not joined yet: refused
    await expect(as("authenticated", A, `update profiles set current_path_id = 'P01' where user_id = $1`, [A])).rejects.toThrow();
    // join, then set it, then record activity
    const rows = await as("authenticated", A, `with e as (insert into enrollments (user_id, path_id) values ($1, 'P01') returning 1), p as (update profiles set current_path_id = 'P01' where user_id = $1 returning current_path_id) select * from p`, [A]);
    expect(rows).toHaveLength(1);
  });
  it("cannot point B at a path or touch B's enrollment activity", async () => {
    expect(await as("authenticated", A, `update profiles set current_path_id = null where user_id = $1 returning user_id`, [B])).toHaveLength(0);
    expect(await as("authenticated", A, `update enrollments set last_active_at = now() where user_id = $1 returning user_id`, [B])).toHaveLength(0);
  });
});

describe("answers and XP can only be written by the server", () => {
  it("a learner cannot insert attempts, step results or XP, even for themselves", async () => {
    await expect(as("authenticated", A, `insert into attempts (client_attempt_id, user_id, lesson_id, content_version_id) values ('x', $1, 'P01-U01-L01', $2)`, [A, versionId])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `insert into xp_events (user_id, attempt_id, step_id, outcome, amount) select $1, id, 'S99', 'independent', 999 from attempts where user_id = $1 limit 1`, [A])).rejects.toThrow(/permission denied/);
  });
  it("a learner cannot edit or delete their own XP or results", async () => {
    await expect(as("authenticated", A, `update xp_events set amount = 999 where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `delete from step_results where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
  });
  it("the service role can write for any learner", async () => {
    const r = await as("service_role", null, `insert into daily_activity (user_id, day, lessons_done) values ($1, current_date, 1) returning user_id`, [B]);
    expect(r).toHaveLength(1);
  });
});

describe("content", () => {
  it("visitors read published content only", async () => {
    expect((await as<{ id: string }>("anon", null, `select id from paths`)).map((r) => r.id)).toEqual(["P01"]);
    expect((await as<{ lesson_id: string }>("anon", null, `select lesson_id from content_versions`)).map((r) => r.lesson_id)).toEqual(["P01-U01-L01"]);
  });
  it("nobody but the service role writes content", async () => {
    await expect(as("authenticated", A, `insert into paths (id, title) values ('PX', '{}')`)).rejects.toThrow(/permission denied/);
  });
  it("a published version cannot be changed", async () => {
    await expect(db.exec(`update content_versions set body = '{"x":1}'`)).rejects.toThrow(/immutable/);
  });
});

describe("deleting an account", () => {
  it("removes the learner's rows", async () => {
    const id = (await db.query<{ id: string }>(`insert into auth.users (email) values ('gone@example.com') returning id`)).rows[0].id;
    await db.query(`delete from auth.users where id = $1`, [id]);
    expect((await db.query(`select 1 from profiles where user_id = $1`, [id])).rows).toHaveLength(0);
  });
});

describe("server guards (migration 0003)", () => {
  it("the rate limiter allows `limit` hits per window and then says no, per user and key", async () => {
    const hit = async (u: string, key = "k") => (await db.query<{ ok: boolean }>(`select public.hit_rate_limit($1, $2, 2, 60) as ok`, [u, key])).rows[0].ok;
    expect([await hit(A), await hit(A), await hit(A)]).toEqual([true, true, false]);
    expect(await hit(B)).toBe(true);
    expect(await hit(A, "other")).toBe(true);
  });
  it("a new window starts the count again", async () => {
    await db.query(`update rate_limits set window_start = now() - interval '2 minutes' where user_id = $1 and key = 'k'`, [A]);
    expect((await db.query<{ ok: boolean }>(`select public.hit_rate_limit($1, 'k', 2, 60) as ok`, [A])).rows[0].ok).toBe(true);
  });
  it("two lessons finished together are both counted", async () => {
    const day = "2031-01-01";
    const [a, b] = await Promise.all([1, 2].map(() => db.query<{ n: number }>(`select public.bump_lessons_done($1, $2, 2) as n`, [A, day])));
    expect([a.rows[0].n, b.rows[0].n].sort()).toEqual([1, 2]);
    expect((await db.query<{ lessons_done: number; goal_met: boolean }>(`select lessons_done, goal_met from daily_activity where user_id = $1 and day = $2`, [A, day])).rows[0]).toEqual({ lessons_done: 2, goal_met: true });
  });
  it("learners and visitors cannot call the guards or read the counters", async () => {
    await expect(as("authenticated", A, `select public.hit_rate_limit($1, 'x', 1, 60)`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `select public.bump_lessons_done($1, current_date, 1)`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, `select public.hit_rate_limit($1, 'x', 1, 60)`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `select * from rate_limits`)).rejects.toThrow(/permission denied/);
  });
  it("the service role can call them", async () => {
    expect(await as("service_role", null, `select public.hit_rate_limit($1, 'svc', 5, 60) as ok`, [A])).toHaveLength(1);
  });
});

describe("replays (migration 0004)", () => {
  it("an attempt can be marked as a paid or unpaid replay, nothing else", async () => {
    const ins = (kind: string | null) => as("service_role", null, `insert into attempts (client_attempt_id, user_id, lesson_id, content_version_id, replay_kind) values ('r-' || gen_random_uuid(), $1, 'P01-U01-L01', $2, $3) returning replay_kind`, [A, versionId, kind]);
    expect(await ins("paid")).toHaveLength(1);
    expect(await ins("unpaid")).toHaveLength(1);
    expect(await ins(null)).toHaveLength(1);
    await expect(ins("free")).rejects.toThrow(/check/);
  });
  it("learners cannot mark their own attempts", async () => {
    await expect(as("authenticated", A, `update attempts set replay_kind = 'paid'`)).rejects.toThrow(/permission denied/);
  });
});

describe("email language (migration 0005)", () => {
  it("saves the page's language on the account and profile, for that email only", async () => {
    await db.query(`update auth.users set email = 'A@Example.com' where id = $1`, [A]);
    await as("service_role", null, `select public.set_locale_by_email('a@example.com', 'ar')`);
    expect((await db.query<{ l: string }>(`select raw_user_meta_data->>'locale' as l from auth.users where id = $1`, [A])).rows[0].l).toBe("ar");
    expect((await db.query<{ l: string }>(`select locale as l from profiles where user_id = $1`, [A])).rows[0].l).toBe("ar");
    expect((await db.query<{ l: string | null }>(`select raw_user_meta_data->>'locale' as l from auth.users where id = $1`, [B])).rows[0].l).not.toBe("ar");
    await as("service_role", null, `select public.set_locale_by_email('nobody@example.com', 'en')`); // no account: no error
    await as("service_role", null, `select public.set_locale_by_email('a@example.com', 'xx')`); // unknown language: ignored
    expect((await db.query<{ l: string }>(`select locale as l from profiles where user_id = $1`, [A])).rows[0].l).toBe("ar");
  });
  it("is not callable by learners or visitors", async () => {
    await expect(as("authenticated", A, `select public.set_locale_by_email('a@example.com', 'en')`)).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, `select public.set_locale_by_email('a@example.com', 'en')`)).rejects.toThrow(/permission denied/);
  });
});
