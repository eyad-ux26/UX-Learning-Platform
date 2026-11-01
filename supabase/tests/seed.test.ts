import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error plain .mjs script without types
import { buildSql } from "../scripts/seed-content.mjs";

// The generated content.sql is what Eyad pastes into the SQL editor, so prove it runs on the real schema, twice.
const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = JSON.parse(fs.readFileSync(path.join(here, "../../packages/content/dist/bundle.json"), "utf8"));

describe("content seed SQL", () => {
  it("is up to date with the compiled bundle", () => {
    expect(fs.readFileSync(path.join(here, "../seed/content.sql"), "utf8")).toBe(buildSql(bundle));
  });

  it("loads on the migrated schema and can be run again", async () => {
    const db = new PGlite();
    await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth;
      create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
    for (const f of fs.readdirSync(path.join(here, "../migrations")).sort()) await db.exec(fs.readFileSync(path.join(here, "../migrations", f), "utf8"));
    const sql = buildSql(bundle);
    await db.exec(sql);
    await db.exec(sql);
    const count = async (t: string) => Number((await db.query<{ n: string }>(`select count(*)::int as n from ${t}`)).rows[0].n);
    expect(await count("paths")).toBe(bundle.paths.length);
    expect(await count("lessons")).toBe(bundle.lessons.length);
    expect(await count("content_versions")).toBe(bundle.lessons.length);
    const body = (await db.query<{ body: { id: string } }>(`select body from content_versions where lesson_id = 'P01-U01-L01'`)).rows[0].body;
    expect(body.id).toBe("P01-U01-L01");
  });
});
