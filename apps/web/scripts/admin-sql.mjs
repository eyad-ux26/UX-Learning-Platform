// Writes the permission keys and built-in roles from lib/admin/permissions.ts into the seed block between the
// @@PERMISSIONS@@ markers of 0060 (every key, seedSql(2)). 0044 already ran in production, so it stays as it was; 0060
// updates its keys, labels and built-in roles.
// Run: npm run admin:sql -w @uxgate/web   (add --check to only compare)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedSql } from "../lib/admin/permissions.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const start = "-- @@PERMISSIONS@@";
const end = "-- @@END PERMISSIONS@@";
let stale = false;
for (const [name, phase] of [["0060_admin_content.sql", 2]]) {
  const file = path.resolve(here, "../../../supabase/migrations", name);
  const src = fs.readFileSync(file, "utf8");
  const block = `${start}\n${seedSql(phase)}\n${end}`;
  const out = src.includes(end) ? src.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block) : src.replace(start, block);
  if (process.argv.includes("--check")) {
    if (out !== src) { console.error(`${name} is out of date: run npm run admin:sql -w @uxgate/web`); stale = true; }
  } else fs.writeFileSync(file, out);
}
if (stale) process.exit(1);
