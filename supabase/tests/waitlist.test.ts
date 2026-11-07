import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The launch list (0038): only the service role reads or writes it, through join_waitlist.

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

async function as<T>(who: "anon" | "authenticated" | "service_role", uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  let rows: T[] = [];
  await db.transaction(async (tx) => {
    await tx.exec(`set local role ${who}`);
    if (uid) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    try { rows = (await tx.query<T>(sql, params)).rows; } finally { await tx.rollback(); }
  });
  return rows;
}

/** Runs as the service role and keeps the change. */
async function svc<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  let rows: T[] = [];
  await db.transaction(async (tx) => {
    await tx.exec(`set local role service_role`);
    rows = (await tx.query<T>(sql, params)).rows;
  });
  return rows;
}

let n = 0;
async function join(email: string, ip: string | null = "ip1", limit = 5, token = `tok${++n}`): Promise<string> {
  return (await svc<{ r: string }>(`select public.join_waitlist($1, 'ar', 'We only email you about the launch.', 'coming-soon', $2, $3, $4) as r`, [email, ip, token, limit]))[0].r;
}
const confirm = (token: string) => svc<{ email: string; locale: string }>(`select * from public.confirm_waitlist($1)`, [token]);
const row = async (key: string) => (await db.query<Record<string, unknown>>(`select * from public.waitlist where email_key = $1`, [key])).rows[0];
const age = (key: string, col: string, interval: string) => db.query(`update public.waitlist set ${col} = ${col} - interval '${interval}' where email_key = $1`, [key]);

const fails = async (p: Promise<unknown>) => expect(p).rejects.toThrow();

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BOOT);
  for (const f of migrations) await db.exec(fs.readFileSync(path.join(here, "../migrations", f), "utf8"));
  A = (await db.query<{ id: string }>(`insert into auth.users (email) values ('a@example.com') returning id`)).rows[0].id;
});

describe("waitlist", () => {
  it("stores a new address unconfirmed with its link, once whatever its case or spaces", async () => {
    expect(await join("Mona@Example.com", "ip1", 5, "m1")).toBe("send");
    const r = await row("mona@example.com");
    expect(r).toMatchObject({ email: "Mona@Example.com", locale: "ar", source: "coming-soon", confirm_token_hash: "m1", confirm_sends: 1, confirmed_at: null, consent_at: null });
    // A second try within 2 minutes sends nothing new.
    expect(await join("  mona@example.COM ", "ip1", 5, "m2")).toBe("pending");
    expect((await row("mona@example.com")).confirm_token_hash).toBe("m1");
  });

  it("sends a new link later, at most 5 in all", async () => {
    for (const t of ["m2", "m3", "m4", "m5"]) {
      await age("mona@example.com", "confirm_sent_at", "3 minutes");
      expect(await join("mona@example.com", "ip1", 5, t)).toBe("send");
    }
    await age("mona@example.com", "confirm_sent_at", "3 minutes");
    expect(await join("mona@example.com", "ip1", 5, "m6")).toBe("pending");
    expect((await row("mona@example.com")).confirm_sends).toBe(5);
  });

  it("joins only from the newest link, within 7 days, and answers again on a second tap", async () => {
    expect(await confirm("m1")).toEqual([]); // replaced by a newer link
    expect(await confirm("nope")).toEqual([]);
    expect(await confirm("m5")).toEqual([{ email: "Mona@Example.com", locale: "ar" }]);
    const at = (await row("mona@example.com")).confirmed_at;
    expect(at).not.toBeNull();
    expect(await confirm("m5")).toHaveLength(1);
    expect((await row("mona@example.com")).confirmed_at).toEqual(at);
    expect(await join("mona@example.com", "ip1", 5, "m7")).toBe("confirmed");

    expect(await join("late@example.com", "ip2", 5, "l1")).toBe("send");
    await age("late@example.com", "confirm_sent_at", "8 days");
    expect(await confirm("l1")).toEqual([]);
  });

  it("an address that left can come back only through a new link", async () => {
    await db.exec(`update public.waitlist set unsubscribed_at = now() where email_key = 'mona@example.com'`);
    await age("mona@example.com", "confirm_sent_at", "3 minutes");
    await db.exec(`update public.waitlist set confirm_sends = 0 where email_key = 'mona@example.com'`);
    expect(await join("mona@example.com", "ip9", 5, "back")).toBe("send");
    expect((await row("mona@example.com")).unsubscribed_at).not.toBeNull();
    expect(await confirm("back")).toHaveLength(1);
    expect((await row("mona@example.com")).unsubscribed_at).toBeNull();
  });

  it("a failed send does not count and may be retried at once", async () => {
    expect(await join("fail@example.com", "ip3", 5, "f1")).toBe("send");
    await svc(`select public.waitlist_send_failed('f1')`);
    expect(await confirm("f1")).toEqual([]);
    expect(await join("fail@example.com", "ip3", 5, "f2")).toBe("send");
    expect((await row("fail@example.com")).confirm_sends).toBe(1);
  });

  it("queues an address whose email failed, until the daily job sends its link", async () => {
    expect(await join("queued@example.com", "ip4", 5, "q1")).toBe("send");
    await svc(`select public.waitlist_send_failed('q1')`);
    const q = await svc<{ id: string; email: string; locale: string }>(`select * from public.waitlist_queued(10)`);
    const mine = q.find((r) => r.email === "queued@example.com")!;
    expect(mine.locale).toBe("ar");
    expect(q.every((r) => r.email !== "mona@example.com")).toBe(true); // confirmed ones are not queued
    expect((await svc<{ ok: boolean }>(`select public.waitlist_mark_sent($1, 'q2') as ok`, [mine.id]))[0].ok).toBe(true);
    expect((await svc<{ ok: boolean }>(`select public.waitlist_mark_sent($1, 'q3') as ok`, [mine.id]))[0].ok).toBe(false); // already sent
    expect(await confirm("q2")).toHaveLength(1);
    expect((await svc<{ id: string }>(`select id from public.waitlist_queued(10)`)).some((r) => r.id === mine.id)).toBe(false);
  });

  it("limits new addresses per network per hour", async () => {
    expect(await join("n1@example.com", "net", 2)).toBe("send");
    expect(await join("n2@example.com", "net", 2)).toBe("send");
    expect(await join("n3@example.com", "net", 2)).toBe("limited");
    expect(await join("n3@example.com", "other", 2)).toBe("send");
  });

  it("deletes an unconfirmed address 30 days after its last confirmation email and keeps confirmed ones", async () => {
    await age("n1@example.com", "created_at", "31 days");
    await age("n1@example.com", "confirm_sent_at", "31 days");
    // Joined 40 days ago, but its newest email went out 10 days ago: its link is still recent enough to keep it.
    await age("n2@example.com", "created_at", "40 days");
    await age("n2@example.com", "confirm_sent_at", "10 days");
    await age("mona@example.com", "created_at", "31 days");
    await age("mona@example.com", "confirm_sent_at", "31 days");
    expect((await svc<{ n: number }>(`select public.prune_waitlist() as n`))[0].n).toBe(1);
    expect(await row("n1@example.com")).toBeUndefined();
    expect(await row("n2@example.com")).toBeDefined();
    expect(await row("mona@example.com")).toBeDefined();
  });

  it("never deletes a queued address whose confirmation email has not gone out", async () => {
    expect(await join("waiting@example.com", "ip-q", 5, "w1")).toBe("send");
    await svc(`select public.waitlist_send_failed('w1')`); // no email service: queued, confirm_sent_at is null
    await age("waiting@example.com", "created_at", "90 days");
    expect((await row("waiting@example.com")).confirm_sent_at).toBeNull();
    expect((await svc<{ n: number }>(`select public.prune_waitlist() as n`))[0].n).toBe(0);
    expect(await row("waiting@example.com")).toBeDefined();
    // Once the daily job sends its link, the 30 days start from that email.
    const id = (await row("waiting@example.com")).id;
    expect((await svc<{ ok: boolean }>(`select public.waitlist_mark_sent($1, 'w2') as ok`, [id]))[0].ok).toBe(true);
    await age("waiting@example.com", "confirm_sent_at", "29 days");
    expect((await svc<{ n: number }>(`select public.prune_waitlist() as n`))[0].n).toBe(0);
    await age("waiting@example.com", "confirm_sent_at", "2 days");
    expect((await svc<{ n: number }>(`select public.prune_waitlist() as n`))[0].n).toBe(1);
    expect(await row("waiting@example.com")).toBeUndefined();
  });

  it("refuses malformed addresses", async () => {
    await fails(join("not-an-email"));
    await fails(join("a@b"));
  });

  it("nobody but the service role reads, writes or calls it", async () => {
    for (const [who, uid] of [["anon", null], ["authenticated", A]] as const) {
      await fails(as(who, uid, `select * from public.waitlist`));
      await fails(as(who, uid, `insert into public.waitlist (email, consent_text) values ('x@example.com', 'x')`));
      await fails(as(who, uid, `select public.join_waitlist('x@example.com', 'en', 'x', null, null, 't')`));
      await fails(as(who, uid, `select * from public.confirm_waitlist('m5')`));
      await fails(as(who, uid, `select public.prune_waitlist()`));
      await fails(as(who, uid, `select public.waitlist_send_failed('m5')`));
      await fails(as(who, uid, `select * from public.waitlist_queued(5)`));
    }
    expect((await as<{ n: number }>("service_role", null, `select count(*)::int as n from public.waitlist`))[0].n).toBeGreaterThan(0);
  });
});

describe("team password tries", () => {
  const hit = async (ip: string) => (await svc<{ ok: boolean }>(`select public.hit_team_gate($1) as ok`, [ip]))[0].ok;
  it("allows 5 tries per network per 15 minutes", async () => {
    for (let i = 0; i < 5; i++) expect(await hit("netA")).toBe(true);
    expect(await hit("netA")).toBe(false);
    expect(await hit("netB")).toBe(true);
    await db.exec(`update public.team_gate_tries set window_start = window_start - interval '16 minutes' where bucket = 'ip:netA'`);
    expect(await hit("netA")).toBe(true);
  });
  it("allows 100 tries an hour from everyone together", async () => {
    await db.exec(`update public.team_gate_tries set hits = 100 where bucket = 'all'`);
    expect(await hit("netC")).toBe(false);
    await db.exec(`update public.team_gate_tries set window_start = window_start - interval '61 minutes' where bucket = 'all'`);
    expect(await hit("netD")).toBe(true);
  });
  it("nobody but the service role counts or reads tries", async () => {
    await fails(as("anon", null, `select public.hit_team_gate('x')`));
    await fails(as("authenticated", A, `select * from public.team_gate_tries`));
  });
});
