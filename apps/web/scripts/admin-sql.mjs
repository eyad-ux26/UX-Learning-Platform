// Writes the permission keys and built-in roles from lib/admin/permissions.ts into the seed block of
// supabase/migrations/0044_admin_access.sql (between the @@PERMISSIONS@@ markers). Run: npm run admin:sql -w @uxgate/web
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedSql } from "../lib/admin/permissions.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, "../../../supabase/migrations/0044_admin_access.sql");
const src = fs.readFileSync(file, "utf8");
const start = "-- @@PERMISSIONS@@";
const end = "-- @@END PERMISSIONS@@";
const block = `${start}\n${seedSql()}\n${end}`;
const out = src.includes(end) ? src.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block) : src.replace(start, block);
if (process.argv.includes("--check")) {
  if (out !== src) { console.error("0044_admin_access.sql is out of date: run npm run admin:sql -w @uxgate/web"); process.exit(1); }
} else fs.writeFileSync(file, out);
