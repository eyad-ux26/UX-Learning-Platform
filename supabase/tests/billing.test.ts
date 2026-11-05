import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Slice 5 (migration 0036): a learner reads only their own billing rows, never writes any of them,
// and cannot see webhooks, saved-card tokens, codes, student checks or the email log at all.

const here = path.dirname(fileURLToPath(import.meta.url));
const migrations = fs.readdirSync(path.join(here, "../migrations")).filter((f) => f.endsWith(".sql")).sort();

const BOOT = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
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

const OWN = ["entitlements", "billing_accounts", "subscriptions", "payments", "checkout_sessions", "refund_requests"];
const HIDDEN = ["billing_events", "payment_tokens", "discount_codes", "student_checks", "billing_emails"];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(BOOT);
  for (const f of migrations) await db.exec(fs.readFileSync(path.join(here, "../migrations", f), "utf8"));
  A = (await db.query<{ id: string }>(`insert into auth.users (email) values ('a@example.com') returning id`)).rows[0].id;
  B = (await db.query<{ id: string }>(`insert into auth.users (email) values ('b@example.com') returning id`)).rows[0].id;
  for (const u of [A, B]) {
    await db.query(`insert into entitlements (user_id, plan, valid_until) values ($1, 'pro', now() + interval '30 days')`, [u]);
    await db.query(`insert into billing_accounts (user_id, country) values ($1, 'EG')`, [u]);
    const sub = (await db.query<{ id: string }>(`insert into subscriptions (user_id, provider, region, country, period, currency, renew_amount_minor, status, current_period_start, current_period_end)
      values ($1, 'paymob', 'eg', 'EG', 'month', 'EGP', 24900, 'active', now(), now() + interval '1 month') returning id`, [u])).rows[0].id;
    const pay = (await db.query<{ id: string }>(`insert into payments (user_id, subscription_id, provider, provider_payment_id, kind, period, amount_minor, currency, status, paid_at)
      values ($1, $2, 'paymob', $3, 'first', 'month', 24900, 'EGP', 'paid', now()) returning id`, [u, sub, `tx-${u}`])).rows[0].id;
    await db.query(`insert into checkout_sessions (user_id, provider, region, country, period, amount_minor, renew_amount_minor, currency) values ($1, 'paymob', 'eg', 'EG', 'month', 24900, 24900, 'EGP')`, [u]);
    await db.query(`insert into refund_requests (user_id, payment_id, amount_minor, currency, reason) values ($1, $2, 24900, 'EGP', 'wrong plan')`, [u, pay]);
    await db.query(`insert into payment_tokens (user_id, provider, token) values ($1, 'paymob', 'enc:xyz')`, [u]);
    await db.query(`insert into billing_emails (user_id, kind, ref, locale, to_email) values ($1, 'receipt', 'p1', 'en', 'x@example.com')`, [u]);
  }
  await db.query(`insert into billing_events (provider, event_id, event_type, payload) values ('paymob', 'e1', 'TRANSACTION', '{}')`);
  await db.query(`insert into student_checks (user_id, email, token_hash) values ($1, 'a@cu.edu.eg', 'h')`, [A]);
});

describe("billing rows: each learner reads only their own", () => {
  for (const table of OWN) {
    it(`${table}: A sees only A's rows`, async () => {
      const rows = await as<{ user_id: string }>("authenticated", A, `select user_id from ${table}`);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.user_id === A)).toBe(true);
    });
    it(`${table}: visitors cannot read it`, async () => {
      await expect(as("anon", null, `select * from ${table}`)).rejects.toThrow(/permission denied/);
    });
  }
});

describe("learners never write billing rows", () => {
  it("cannot give themselves Pro", async () => {
    await expect(as("authenticated", A, `update entitlements set valid_until = now() + interval '10 years' where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `insert into entitlements (user_id, plan, valid_until) values ($1, 'pro', now() + interval '1 year')`, [A])).rejects.toThrow(/permission denied/);
  });
  it("cannot change subscriptions, payments or refund requests", async () => {
    await expect(as("authenticated", A, `update subscriptions set status = 'active' where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `delete from payments where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `update refund_requests set status = 'approved' where user_id = $1`, [A])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, `insert into checkout_sessions (user_id, provider, region, country, period, amount_minor, renew_amount_minor, currency) values ($1, 'mock', 'eg', 'EG', 'year', 0, 0, 'EGP')`, [A])).rejects.toThrow(/permission denied/);
  });
});

describe("server-only billing tables", () => {
  for (const table of HIDDEN) {
    it(`${table}: no learner can read it`, async () => {
      await expect(as("authenticated", A, `select * from ${table}`)).rejects.toThrow(/permission denied/);
    });
  }
  it("the service role reads and writes all of them", async () => {
    for (const table of [...OWN, ...HIDDEN]) expect(await as("service_role", null, `select * from ${table} limit 1`)).toHaveLength(1);
  });
  it("has_pro is server only", async () => {
    await expect(as("authenticated", A, `select public.has_pro($1)`, [A])).rejects.toThrow(/permission denied/);
    expect((await as<{ p: boolean }>("service_role", null, `select public.has_pro($1) as p`, [A]))[0].p).toBe(true);
  });
  it("has_pro never counts Pro from the test payment page", async () => {
    const id = (await db.query<{ id: string }>(`insert into auth.users (email) values ('mock@example.com') returning id`)).rows[0].id;
    await db.query(`insert into entitlements (user_id, plan, valid_until, source) values ($1, 'pro', now() + interval '30 days', 'mock')`, [id]);
    expect((await as<{ p: boolean }>("service_role", null, `select public.has_pro($1) as p`, [id]))[0].p).toBe(false);
    await expect(db.query(`update entitlements set source = 'other' where user_id = $1`, [id])).rejects.toThrow(/check/);
  });
});

describe("integrity", () => {
  it("a webhook event is stored once", async () => {
    await expect(db.query(`insert into billing_events (provider, event_id, event_type, payload) values ('paymob', 'e1', 'TRANSACTION', '{}')`)).rejects.toThrow(/duplicate/);
  });
  it("a payment is recorded once per provider id, with its own receipt number", async () => {
    await expect(db.query(`insert into payments (user_id, provider, provider_payment_id, kind, period, amount_minor, currency, status, paid_at) values ($1, 'paymob', $2, 'first', 'month', 1, 'EGP', 'paid', now())`, [A, `tx-${A}`])).rejects.toThrow(/duplicate/);
    const nos = (await db.query<{ receipt_no: string }>(`select receipt_no from payments`)).rows.map((r) => r.receipt_no);
    expect(new Set(nos).size).toBe(nos.length);
    expect(nos[0]).toMatch(/^UXG-\d{4}-\d{6}$/);
  });
  it("a learner has at most one live plan", async () => {
    await expect(db.query(`insert into subscriptions (user_id, provider, region, country, period, currency, renew_amount_minor, status, current_period_start, current_period_end)
      values ($1, 'paddle', 'gulf', 'SA', 'year', 'USD', 7200, 'active', now(), now() + interval '1 year')`, [A])).rejects.toThrow(/duplicate/);
  });
  it("only one refund request per charge", async () => {
    const pay = (await db.query<{ id: string }>(`select id from payments where user_id = $1`, [A])).rows[0].id;
    await expect(db.query(`insert into refund_requests (user_id, payment_id, amount_minor, currency, reason) values ($1, $2, 1, 'EGP', 'again')`, [A, pay])).rejects.toThrow(/duplicate/);
  });
  it("no full card number fits the card columns", async () => {
    await expect(db.query(`update subscriptions set card_last4 = '4242424242424242' where user_id = $1`, [A])).rejects.toThrow(/check/);
  });
  it("deleting an account removes its billing rows", async () => {
    const id = (await db.query<{ id: string }>(`insert into auth.users (email) values ('gone@example.com') returning id`)).rows[0].id;
    await db.query(`insert into entitlements (user_id) values ($1)`, [id]);
    await db.query(`delete from auth.users where id = $1`, [id]);
    expect((await db.query(`select 1 from entitlements where user_id = $1`, [id])).rows).toHaveLength(0);
  });
});
