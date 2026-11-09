import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Slice 4 tables on the real migrations: notification choices, the inbox, the email log (one reminder a day),
// push subscriptions, review request answers, account deletion and the reminder job's learner query.

const here = path.dirname(fileURLToPath(import.meta.url));
const migrations = fs.readdirSync(path.join(here, "../migrations")).filter((f) => f.endsWith(".sql")).sort();

const BOOT = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}', email_confirmed_at timestamptz, banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to service_role;
`;

let db: PGlite;
let A: string;
let B: string;

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
  // Supabase grants the service role everything; mirror that for the tables the server writes.
  await db.exec(`grant all on all tables in schema public to service_role; grant select on auth.users to service_role;`);
  A = (await db.query<{ id: string }>(`insert into auth.users (email) values ('a@example.com') returning id`)).rows[0].id;
  B = (await db.query<{ id: string }>(`insert into auth.users (email) values ('b@example.com') returning id`)).rows[0].id;
  await db.exec(`
    insert into paths (id, title, status) values ('P01', '{"en":"Forms","ar":"نماذج"}', 'published');
    insert into units (id, path_id, title) values ('P01-U01', 'P01', '{"en":"U","ar":"و"}');
    insert into lessons (id, unit_id) values ('P01-U01-L01', 'P01-U01');
  `);
  for (const uid of [A, B]) {
    await db.query(`insert into notification_prefs (user_id, prefs) values ($1, '{"review":{"email":true}}')`, [uid]);
    await db.query(`insert into notifications (user_id, kind, data, href) values ($1, 'reminder', '{}', '/app'), ($1, 'badge', '{}', '/app/profile')`, [uid]);
    await db.query(`insert into email_log (user_id, kind, day) values ($1, 'welcome', current_date)`, [uid]);
    await db.query(`insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, 'k', 'a')`, [uid, `https://push.example/${uid}`]);
    await db.query(`insert into review_requests (user_id, lesson_id, step_id, answer, reason, status, reply, replied_at, xp_added) values ($1, 'P01-U01-L01', 'S02', '{"sel":["a"]}', 'answer_works', 'accepted', '{"en":"Yes"}', now(), 10)`, [uid]);
  }
});

describe("one learner cannot read another learner's slice 4 rows", () => {
  for (const table of ["notification_prefs", "notifications", "email_log", "push_subscriptions", "review_requests"]) {
    it(`${table}: A sees only their own`, async () => {
      const rows = await as<{ user_id: string }>("authenticated", A, `select user_id from ${table}`);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.user_id === A)).toBe(true);
    });
    it(`${table}: a signed-out visitor reads nothing`, async () => {
      await expect(as("anon", null, `select * from ${table}`)).rejects.toThrow(/permission denied/);
    });
  }
});

describe("only the server writes what is sent and scheduled", () => {
  it("a learner cannot write inbox items, email log rows, push subscriptions or choices directly", async () => {
    await expect(as("authenticated", A, `insert into notifications (user_id, kind) values ($1, 'billing')`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `insert into email_log (user_id, kind, day) values ($1, 'reminder', current_date)`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://x', 'k', 'a')`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `update notification_prefs set prefs = '{}' where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `update review_requests set status = 'accepted', xp_added = 999 where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
  });
  it("a learner cannot set or change the delete and welcome columns on their own profile", async () => {
    // Slice 3 (0016) limits which profile columns a learner may update at all, so either guard can be the one that refuses.
    for (const set of [`delete_after = now() - interval '1 day'`, `delete_requested_at = now()`, `welcome_sent_at = now()`]) {
      await expect(as("authenticated", A, `update profiles set ${set} where user_id = $1`, [A])).rejects.toThrow(/server only|permission denied/);
    }
    // Their other settings still save.
    const ok = await as<{ user_id: string }>("authenticated", A, `update profiles set daily_goal = 3 where user_id = $1 returning user_id`, [A]);
    expect(ok.length).toBe(1);
    // The server (service role) can.
    const srv = await as<{ user_id: string }>("service_role", null, `update profiles set delete_after = now() + interval '30 days' where user_id = $1 returning user_id`, [A]);
    expect(srv.length).toBe(1);
  });
  it("mark as read changes only the caller's own unread items", async () => {
    let n: { n: number }[] = [];
    let bUnread: { c: number }[] = [];
    await db.transaction(async (tx) => {
      await tx.exec(`set local role authenticated`);
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [A]);
      n = (await tx.query<{ n: number }>(`select public.mark_notifications_read(null) as n`)).rows;
      await tx.exec(`reset role`);
      bUnread = (await tx.query<{ c: number }>(`select count(*)::int as c from notifications where user_id = $1 and read_at is null`, [B])).rows;
      await tx.rollback();
    });
    expect(n[0].n).toBe(2);
    expect(bUnread[0].c).toBe(2);
  });
  it("mark as read by id ignores another learner's ids", async () => {
    const bIds = (await db.query<{ id: string }>(`select id from notifications where user_id = $1`, [B])).rows.map((r) => r.id);
    const r = await as<{ n: number }>("authenticated", A, `select public.mark_notifications_read($1::uuid[]) as n`, [bIds]);
    expect(r[0].n).toBe(0);
  });
  it("an inbox link must stay inside the app", async () => {
    await expect(db.query(`insert into notifications (user_id, kind, href) values ($1, 'reminder', 'https://evil.example')`, [A])).rejects.toThrow(/check/);
  });
});

describe("answers to review requests", () => {
  it("an answer puts one inbox item in the learner's inbox, linking to it, unless In app is off for answers", async () => {
    await db.transaction(async (tx) => {
      const id = (await tx.query<{ id: string }>(`insert into review_requests (user_id, lesson_id, step_id, answer, reason, status) values ($1, 'P01-U01-L01', 'S03', '{"sel":["b"]}', 'answer_works', 'open') returning id`, [A])).rows[0].id;
      await tx.query(`update review_requests set status = 'accepted', xp_added = 10, reply = '{"en":"Yes"}', replied_at = now() where id = $1`, [id]);
      const n = (await tx.query<{ href: string; data: { status: string; xp: number } }>(`select href, data from notifications where user_id = $1 and kind = 'answer'`, [A])).rows;
      expect(n).toHaveLength(1);
      expect(n[0].href).toBe(`/app/requests/${id}`);
      expect(n[0].data).toMatchObject({ status: "accepted", xp: 10 });
      await tx.query(`update notification_prefs set prefs = '{"answer":{"in_app":false}}' where user_id = $1`, [B]);
      const idB = (await tx.query<{ id: string }>(`insert into review_requests (user_id, lesson_id, step_id, answer, reason, status) values ($1, 'P01-U01-L01', 'S03', '{"sel":["b"]}', 'answer_works', 'open') returning id`, [B])).rows[0].id;
      await tx.query(`update review_requests set status = 'declined' where id = $1`, [idB]);
      const nb = (await tx.query<{ c: number }>(`select count(*)::int as c from notifications where user_id = $1 and kind = 'answer'`, [B])).rows[0].c;
      expect(nb).toBe(0);
      await tx.rollback();
    });
  });
});

describe("at most one reminder email a day", () => {
  it("a second reminder or goal email on the same day is refused by the database", async () => {
    await db.transaction(async (tx) => {
      await tx.query(`insert into email_log (user_id, kind, day) values ($1, 'reminder', '2026-11-05')`, [A]);
      await expect(tx.query(`insert into email_log (user_id, kind, day) values ($1, 'goal', '2026-11-05')`, [A])).rejects.toThrow(/unique|duplicate/);
      await tx.rollback();
    });
  });
  it("other emails the same day are fine", async () => {
    await db.transaction(async (tx) => {
      await tx.query(`insert into email_log (user_id, kind, day) values ($1, 'reminder', '2026-11-06'), ($1, 'badge', '2026-11-06'), ($1, 'deleted', '2026-11-06')`, [A]);
      await tx.rollback();
    });
  });
});

describe("the reminder job's learner query", () => {
  it("is closed to learners and visitors", async () => {
    await expect(as("authenticated", A, `select * from public.reminder_candidates(10)`)).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, `select * from public.reminder_candidates(10)`)).rejects.toThrow(/permission denied/);
  });
  it("finds learners whose reminder quarter hour is now in their zone, skips those already sent today and accounts being deleted", async () => {
    let first: { user_id: string; lessons_today: number }[] = [];
    let afterSend: { user_id: string }[] = [];
    let deleting: { user_id: string }[] = [];
    await db.transaction(async (tx) => {
      await tx.query(`update profiles set reminder_time = make_time(extract(hour from now() at time zone 'UTC')::int, (floor(extract(minute from now() at time zone 'UTC') / 15) * 15)::int, 0), time_zone = 'UTC' where user_id in ($1, $2)`, [A, B]);
      await tx.query(`insert into daily_activity (user_id, day, lessons_done) values ($1, (now() at time zone 'UTC')::date, 1)`, [A]);
      await tx.exec(`set local role service_role`);
      first = (await tx.query<{ user_id: string; lessons_today: number }>(`select user_id, lessons_today from public.reminder_candidates(10) order by user_id`)).rows;
      await tx.query(`insert into email_log (user_id, kind, day) values ($1, 'reminder', (now() at time zone 'UTC')::date)`, [B]);
      afterSend = (await tx.query<{ user_id: string }>(`select user_id from public.reminder_candidates(10)`)).rows;
      await tx.query(`update profiles set delete_after = now() + interval '30 days' where user_id = $1`, [A]);
      deleting = (await tx.query<{ user_id: string }>(`select user_id from public.reminder_candidates(10)`)).rows;
      await tx.rollback();
    });
    expect(first.map((r) => r.user_id).sort()).toEqual([A, B].sort());
    expect(first.find((r) => r.user_id === A)?.lessons_today).toBe(1);
    expect(afterSend.map((r) => r.user_id)).toEqual([A]);
    expect(deleting).toEqual([]);
  });
  it("is never early: a reminder later in the hour waits for its own quarter hour", async () => {
    let rows: { user_id: string }[] = [];
    await db.transaction(async (tx) => {
      // The next quarter hour (wrapping at midnight): not due yet.
      await tx.query(`update profiles set time_zone = 'UTC', reminder_time = (date_trunc('hour', now() at time zone 'UTC') + (floor(extract(minute from now() at time zone 'UTC') / 15) + 1) * interval '15 minutes')::time where user_id = $1`, [A]);
      await tx.exec(`set local role service_role`);
      rows = (await tx.query<{ user_id: string }>(`select user_id from public.reminder_candidates(10)`)).rows;
      await tx.rollback();
    });
    expect(rows.map((r) => r.user_id)).not.toContain(A);
  });
  it("an unknown time zone counts as UTC instead of failing the whole run", async () => {
    let rows: { user_id: string }[] = [];
    await db.transaction(async (tx) => {
      await tx.query(`update profiles set reminder_time = make_time(extract(hour from now() at time zone 'UTC')::int, (floor(extract(minute from now() at time zone 'UTC') / 15) * 15)::int, 0), time_zone = 'Not/AZone' where user_id = $1`, [A]);
      await tx.exec(`set local role service_role`);
      rows = (await tx.query<{ user_id: string }>(`select user_id from public.reminder_candidates(10)`)).rows;
      await tx.rollback();
    });
    expect(rows.map((r) => r.user_id)).toContain(A);
  });
});

describe("deleting an account", () => {
  it("removing the auth user removes every slice 4 row with it", async () => {
    await db.transaction(async (tx) => {
      await tx.query(`delete from auth.users where id = $1`, [B]);
      for (const t of ["notification_prefs", "notifications", "email_log", "push_subscriptions", "review_requests", "profiles"]) {
        const r = await tx.query<{ c: number }>(`select count(*)::int as c from ${t} where user_id = $1`, [B]);
        expect(r.rows[0].c, t).toBe(0);
      }
      await tx.rollback();
    });
  });
});
