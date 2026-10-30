// Copies the compiled content bundle into Supabase. Safe to run again: unchanged lessons are left alone,
// changed lessons get a new immutable version row, so answers already given still replay on the old one.
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed:content     (add --dry-run to only count)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = JSON.parse(fs.readFileSync(path.resolve(here, "../../packages/content/dist/bundle.json"), "utf8"));

export function buildRows(b) {
  return {
    paths: b.paths.map((p, i) => ({ id: p.id, sort: i, title: p.title, subtitle: p.subtitle, status: "published" })),
    units: b.units.map((u, i) => ({ id: u.id, path_id: u.pathId, sort: i, title: u.title, free: u.free })),
    skills: b.units.flatMap((u) => u.skills.map((s) => ({ id: s.id, unit_id: u.id, title: s.title, criterion: s.can_do }))),
    lessons: b.lessons.map((l) => ({ id: l.lessonId, unit_id: l.unitId, sort: l.order, mode: l.mode, minutes: l.minutes })),
    content_versions: b.lessons.map((l) => ({ lesson_id: l.lessonId, hash: l.hash, body: l.body })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = buildRows(bundle);
  const counts = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length]));
  if (process.argv.includes("--dry-run")) { console.log("dry run", counts); process.exit(0); }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell. Never commit them."); process.exit(1); }
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const run = async (table, data, onConflict, ignoreDuplicates = false) => {
    const { error } = await db.from(table).upsert(data, { onConflict, ignoreDuplicates });
    if (error) { console.error(`${table}: ${error.message}`); process.exit(1); }
  };
  // Parents first, so every foreign key has its row.
  await run("paths", rows.paths, "id");
  await run("units", rows.units, "id");
  await run("skills", rows.skills, "id");
  await run("lessons", rows.lessons, "id");
  await run("content_versions", rows.content_versions, "lesson_id,hash", true);
  console.log("seeded", counts);
}
