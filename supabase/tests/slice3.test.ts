import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Slice 3 row-level security: enrollments, path events, freezes, certificates, the achievement page and the leaderboard.
// Runs the real migrations on an in-process Postgres, then proves one learner cannot read or change another's rows.

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
let C: string;

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
  const mk = async (email: string, name: string) => {
    const id = (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify({ display_name: name })])).rows[0].id;
    return id;
  };
  A = await mk("a@example.com", "Yasmin");
  B = await mk("b@example.com", "Karim");
  C = await mk("c@example.com", "Omar");
  await db.exec(`
    insert into paths (id, title, status) values ('P01', '{"en":"Forms","ar":"x"}', 'published'), ('P10', '{"en":"Hier","ar":"x"}', 'published'), ('P02', '{"en":"Soon","ar":"x"}', 'draft');
    insert into units (id, path_id, title) values ('P01-U01', 'P01', '{"en":"U","ar":"و"}');
    insert into skills (id, unit_id, title) values ('SK-P01-U01-01', 'P01-U01', '{"en":"s","ar":"م"}');
    insert into lessons (id, unit_id) values ('P01-U01-L01', 'P01-U01');
    insert into content_versions (lesson_id, hash, body) values ('P01-U01-L01', 'h1', '{}');
  `);
  const ver = (await db.query<{ id: string }>(`select id from content_versions limit 1`)).rows[0].id;
  for (const [uid, key, amount] of [[A, "a", 40], [B, "b", 25], [C, "c", 90]] as const) {
    const att = (await db.query<{ id: string }>(`insert into attempts (client_attempt_id, user_id, lesson_id, content_version_id) values ($1, $2, 'P01-U01-L01', $3) returning id`, [key, uid, ver])).rows[0].id;
    await db.query(`insert into xp_events (user_id, attempt_id, step_id, outcome, amount) values ($1, $2, 'S02', 'independent', $3)`, [uid, att, amount]);
  }
  await db.query(`insert into enrollments (user_id, path_id) values ($1, 'P01'), ($2, 'P01')`, [A, B]);
  await db.query(`insert into freeze_events (user_id, kind, day) values ($1, 'earned', '2026-11-01'), ($2, 'used', '2026-11-02')`, [A, B]);
  await db.query(`insert into certificates (user_id, path_id) values ($1, 'P01'), ($2, 'P01')`, [A, B]);
  await db.query(`insert into skill_states (user_id, skill_id, state) values ($1, 'SK-P01-U01-01', 'shown'), ($2, 'SK-P01-U01-01', 'practiced')`, [A, B]);
});

describe("the week start", () => {
  it("is set at sign-up from the language, and the browser cannot change it", async () => {
    const mkLoc = async (email: string, locale: string) =>
      (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify({ locale })])).rows[0].id;
    const ar = await mkLoc("ar@example.com", "ar");
    const en = await mkLoc("en@example.com", "en");
    const get = async (id: string) => (await db.query<{ week_start: number }>(`select week_start from profiles where user_id = $1`, [id])).rows[0].week_start;
    expect([await get(ar), await get(en)]).toEqual([6, 1]);
    // switching the language later does not move the week
    await db.query(`update profiles set locale = 'en' where user_id = $1`, [ar]);
    expect(await get(ar)).toBe(6);
    await expect(as("authenticated", ar, `update profiles set week_start = 1 where user_id = $1 returning user_id`, [ar])).rejects.toThrow(/permission denied/);
    await expect(db.query(`update profiles set week_start = 9 where user_id = $1`, [ar])).rejects.toThrow(/check/);
  });
  it("a Google sign-up on the Arabic page ends up Arabic, with a Saturday week (the sign-in callback's writes)", async () => {
    // Google's own claims, no language of ours: the trigger makes it English.
    const g = (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ('g@example.com', '{"full_name":"G","locale":"en-GB"}') returning id`)).rows[0].id;
    const row = async () => (await db.query<{ locale: string; week_start: number }>(`select locale, week_start from profiles where user_id = $1`, [g])).rows[0];
    expect(await row()).toEqual({ locale: "en", week_start: 1 });
    // The callback saves the page's language as the learner (RLS lets them), then the week start with the service role.
    expect(await as("authenticated", g, `update profiles set locale = 'ar' where user_id = $1 returning locale`, [g])).toEqual([{ locale: "ar" }]);
    expect(await as("service_role", null, `update profiles set week_start = 6 where user_id = $1 returning week_start`, [g])).toEqual([{ week_start: 6 }]);
  });
});

describe("the name check flag (migration 0043)", () => {
  it("starts empty, and the browser cannot set it (the server does)", async () => {
    expect((await db.query<{ n: string | null }>(`select name_confirmed_at as n from profiles where user_id = $1`, [A])).rows[0].n).toBeNull();
    await expect(as("authenticated", A, `update profiles set name_confirmed_at = now() where user_id = $1 returning user_id`, [A])).rejects.toThrow(/permission denied/);
    expect(await as("service_role", null, `update profiles set name_confirmed_at = now() where user_id = $1 returning user_id`, [A])).toHaveLength(1);
  });
});

describe("the display name at sign-up (migration 0042)", () => {
  it("uses display_name, then Google's full_name, then name, then the email prefix; blanks are skipped", async () => {
    const name = async (email: string, meta: object) => {
      const id = (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify(meta)])).rows[0].id;
      return (await db.query<{ display_name: string }>(`select display_name from profiles where user_id = $1`, [id])).rows[0].display_name;
    };
    expect(await name("n1@example.com", { display_name: "Chosen", full_name: "Full", name: "N" })).toBe("Chosen");
    expect(await name("n2@example.com", { full_name: "Eyad Ahmed", name: "Eyad" })).toBe("Eyad Ahmed");
    expect(await name("n3@example.com", { name: "Eyad" })).toBe("Eyad");
    expect(await name("eyad.0588@example.com", {})).toBe("eyad.0588");
    expect(await name("n5@example.com", { display_name: "  ", full_name: "" })).toBe("n5");
  });
});

describe("several paths", () => {
  it("a learner joins a published path but not one that is still coming soon", async () => {
    expect(await as("authenticated", C, `insert into enrollments (user_id, path_id) values ($1, 'P10') returning path_id`, [C])).toHaveLength(1);
    await expect(as("authenticated", C, `insert into enrollments (user_id, path_id) values ($1, 'P02')`, [C])).rejects.toThrow(/row-level security/);
  });
  it("an enrollment cannot be moved onto a Coming soon path or back-dated, so it can never become the current path (#138)", async () => {
    await db.query(`insert into enrollments (user_id, path_id) values ($1, 'P10') on conflict do nothing`, [C]);
    await expect(as("authenticated", C, `update enrollments set path_id = 'P02' where user_id = $1 and path_id = 'P10'`, [C])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", C, `update enrollments set started_at = now() - interval '1 year' where user_id = $1`, [C])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", C, `insert into enrollments (user_id, path_id, started_at) values ($1, 'P01', now() - interval '1 year')`, [C])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", C, `update profiles set current_path_id = 'P02' where user_id = $1`, [C])).rejects.toThrow(/foreign key|violates/);
    // What the app does still works: last active and the current lesson.
    expect(await as("authenticated", C, `update enrollments set last_active_at = now() where user_id = $1 and path_id = 'P10' returning path_id`, [C])).toHaveLength(1);
    // Onboarding cannot suggest a Coming soon path either.
    await expect(as("authenticated", C, `insert into onboarding (user_id, recommended_path_id) values ($1, 'P02')`, [C])).rejects.toThrow(/row-level security/);
  });
  it("switching logs an event that only the server writes, and a second learner cannot read it", async () => {
    await expect(as("authenticated", A, `insert into path_events (user_id, kind, path_id) values ($1, 'started', 'P01')`, [A])).rejects.toThrow(/permission denied/);
    await db.query(`insert into path_events (user_id, kind, path_id) values ($1, 'started', 'P01')`, [B]);
    expect(await as("authenticated", A, `select * from path_events where user_id = $1`, [B])).toHaveLength(0);
  });
  it("enrollments of B are invisible to A", async () => {
    const rows = await as<{ user_id: string }>("authenticated", A, `select user_id from enrollments`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.user_id === A)).toBe(true);
  });
});

describe("streak, freezes, badges and certificates are private and written by the server", () => {
  for (const table of ["freeze_events", "certificates", "skill_states", "streaks"]) {
    it(`${table}: A sees only their own rows`, async () => {
      const rows = await as<{ user_id: string }>("authenticated", A, `select user_id from ${table}`);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.user_id === A)).toBe(true);
      expect(await as("authenticated", A, `select * from ${table} where user_id = $1`, [B])).toHaveLength(0);
    });
  }
  it("a learner cannot give themselves a freeze, a certificate or a skill state", async () => {
    await expect(as("authenticated", A, `insert into freeze_events (user_id, kind, day) values ($1, 'earned', '2026-11-03')`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `update streaks set freezes_available = 2 where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `insert into certificates (user_id, path_id) values ($1, 'P10')`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `update skill_states set state = 'kept' where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
  });
  it("only the server writes them", async () => {
    expect(await as("service_role", null, `insert into freeze_events (user_id, kind, day) values ($1, 'earned', '2026-11-09') returning id`, [A])).toHaveLength(1);
  });
  it("a freeze is recorded once per day and kind", async () => {
    await expect(db.query(`insert into freeze_events (user_id, kind, day) values ($1, 'earned', '2026-11-01')`, [A])).rejects.toThrow(/unique|duplicate/);
  });
  it("one certificate per learner and path, with a code", async () => {
    await expect(db.query(`insert into certificates (user_id, path_id) values ($1, 'P01')`, [A])).rejects.toThrow(/unique|duplicate/);
    const code = (await db.query<{ code: string }>(`select code from certificates where user_id = $1`, [A])).rows[0].code;
    expect(code).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("nightly job candidates (#139)", () => {
  it("a learner already settled to their own yesterday is not picked again, east or west of UTC", async () => {
    await db.query(`update profiles set time_zone = 'America/Sao_Paulo' where user_id = $1`, [A]);
    await db.query(`update profiles set time_zone = 'Africa/Cairo' where user_id = $1`, [B]);
    await db.query(`update profiles set time_zone = 'Not/AZone' where user_id = $1`, [C]);
    await db.query(`update streaks set settled_through = public.local_yesterday('America/Sao_Paulo') where user_id = $1`, [A]);
    await db.query(`update streaks set settled_through = public.local_yesterday('Africa/Cairo') - 1 where user_id = $1`, [B]);
    await db.query(`update streaks set settled_through = null where user_id = $1`, [C]);
    const ids = (await as<{ user_id: string }>("service_role", null, `select user_id from public.settle_candidates(100)`)).map((r) => r.user_id);
    expect(ids).not.toContain(A);
    expect(ids).toContain(B);
    expect(ids).toContain(C); // never settled, and an unknown zone does not break the query
    await expect(as("authenticated", A, `select * from public.settle_candidates(100)`)).rejects.toThrow(/permission denied/);
  });
});

describe("achievement page switch and handle", () => {
  it("is off by default", async () => {
    expect((await db.query<{ share_enabled: boolean; handle: string | null }>(`select share_enabled, handle from profiles where user_id = $1`, [A])).rows[0]).toEqual({ share_enabled: false, handle: null });
  });
  it("a learner cannot switch it on or choose a handle from the browser; the server does", async () => {
    await expect(as("authenticated", A, `update profiles set share_enabled = true where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `update profiles set handle = 'yasmin' where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    expect(await as("service_role", null, `update profiles set handle = 'yasmin', share_enabled = true where user_id = $1 returning handle`, [A])).toHaveLength(1);
  });
  it("handles are unique ignoring case, and have a safe shape", async () => {
    await db.query(`update profiles set handle = 'yasmin' where user_id = $1`, [A]);
    await expect(db.query(`update profiles set handle = 'Yasmin' where user_id = $1`, [B])).rejects.toThrow(/unique|duplicate|check/);
    await expect(db.query(`update profiles set handle = 'a b' where user_id = $1`, [B])).rejects.toThrow(/check/);
    await expect(db.query(`update profiles set handle = '../x' where user_id = $1`, [B])).rejects.toThrow(/check/);
  });
  it("the learner still edits their own name, goal and path from the browser", async () => {
    expect(await as("authenticated", A, `update profiles set display_name = 'Yas', daily_goal = 2 where user_id = $1 returning user_id`, [A])).toHaveLength(1);
  });
});

describe("leaderboard", () => {
  const since = () => new Date(Date.now() - 3 * 86_400_000).toISOString();
  const board = (uid: string) => as<{ rank: number; name: string; xp: number; is_me: boolean }>("authenticated", uid, `select * from weekly_leaderboard($1)`, [since()]);

  it("is hidden while the flag is off, even for someone who has joined", async () => {
    await db.query(`update profiles set leaderboard_joined_at = now(), leaderboard_name = 'Yasmin' where user_id = $1`, [A]);
    expect(await board(A)).toHaveLength(0);
  });
  it("stays hidden until the learner joins, then shows only learners who joined", async () => {
    await db.query(`update app_flags set enabled = true where key = 'leaderboard'`);
    await db.query(`update profiles set leaderboard_joined_at = now(), leaderboard_name = 'Omar' where user_id = $1`, [C]);
    expect(await board(B)).toHaveLength(0); // B has not joined
    const rows = await board(A);
    expect(rows.map((r) => [r.rank, r.name, Number(r.xp), r.is_me])).toEqual([[1, "Omar", 90, false], [2, "Yasmin", 40, true]]);
  });
  it("never lists a learner who has not joined, and a visitor sees nothing", async () => {
    expect((await board(A)).some((r) => r.name === "Karim" || r.name === "b")).toBe(false);
    await expect(as("anon", null, `select * from weekly_leaderboard($1)`, [since()])).rejects.toThrow(/permission denied/);
  });
  it("counts only XP since the week started, and refuses a window older than 8 days", async () => {
    const rows = await as<{ xp: number }>("authenticated", A, `select * from weekly_leaderboard($1)`, [new Date(Date.now() + 60_000).toISOString()]);
    expect(rows).toHaveLength(0); // a start in the future is refused
    expect(await as("authenticated", A, `select * from weekly_leaderboard($1)`, [new Date(Date.now() - 20 * 86_400_000).toISOString()])).toHaveLength(0);
  });
  it("leaving takes the learner off the board and keeps everything else", async () => {
    await db.query(`update profiles set leaderboard_joined_at = null where user_id = $1`, [C]);
    expect((await board(A)).map((r) => r.name)).toEqual(["Yasmin"]);
    expect((await db.query(`select 1 from xp_events where user_id = $1`, [C])).rows).toHaveLength(1);
  });
  it("a learner cannot join from the browser (the server checks the flag)", async () => {
    await expect(as("authenticated", B, `update profiles set leaderboard_joined_at = now() where user_id = $1`, [B])).rejects.toThrow(/permission denied/);
  });
  it("the flag is readable by learners but changed only by the server", async () => {
    expect(await as("authenticated", A, `select key, enabled from app_flags where key = 'leaderboard'`)).toHaveLength(1); // 0061: only these two columns
    await expect(as("authenticated", A, `update app_flags set enabled = false`)).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, `select * from app_flags`)).rejects.toThrow(/permission denied/);
  });
});
