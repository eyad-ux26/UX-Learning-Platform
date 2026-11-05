// Build check (issue #129): no Pro lesson content may reach a file the browser can download without signing in.
// Everything under .next/static and public/ is served to anyone who asks, so this fails the build if any text of a
// lesson or re-test bank in a Pro unit (`free: false`) shows up there: steps, choices, answers, feedback. Pro lessons
// reach the browser only through the lesson page, after the server has checked the plan. public/c/ holds the lesson
// files the server reads through ASSETS; the Worker answers 404 to any outside request for it (cf-worker.ts).
//
// Run after `next build`: node scripts/check-static.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..");
const bundle = JSON.parse(readFileSync(join(web, "../../packages/content/dist/bundle.json"), "utf8"));
const staticDir = join(web, ".next/static");
const publicDir = join(web, "public");

const proUnits = new Set(bundle.units.filter((u) => u.free === false).map((u) => u.id));
const freeUnits = new Set(bundle.units.filter((u) => u.free !== false).map((u) => u.id));

/** Every sentence-like string in a lesson body (ids and short labels are left out: they are not content). */
function strings(v, out = new Set()) {
  if (typeof v === "string") { if (v.length >= 24 && /\s/.test(v)) out.add(v); }
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

const shared = new Set();
const all0 = [...bundle.lessons, ...(bundle.banks ?? [])];
for (const l of all0) if (freeUnits.has(l.unitId)) strings(l.body, shared);
const secret = new Map(); // text -> lesson id
for (const l of all0) if (proUnits.has(l.unitId)) for (const s of strings(l.body)) if (!shared.has(s)) secret.set(s, l.lessonId);

if (!secret.size) {
  console.log("check-static: no Pro lessons in the content bundle, nothing to check");
  process.exit(0);
}

// The forms a string can take inside minified JavaScript or JSON.
const escapeAll = (s) => JSON.stringify(s).slice(1, -1).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
const forms = (s) => [...new Set([s, JSON.stringify(s).slice(1, -1), escapeAll(s), escapeAll(s).replace(/\\u([0-9a-f]{4})/g, (_, h) => `\\u${h.toUpperCase()}`)])];

function files(dir, skip = null) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (p === skip) return [];
    return statSync(p).isDirectory() ? files(p, skip) : /\.(js|mjs|json|txt|html|map|xml)$/.test(name) ? [p] : [];
  });
}

let all;
try { all = files(staticDir); } catch { console.error(`check-static: ${staticDir} not found, run next build first`); process.exit(2); }
try { all.push(...files(publicDir, join(publicDir, "c"))); } catch { /* no public folder */ }
const leaks = [];
for (const f of all) {
  const text = readFileSync(f, "utf8");
  for (const [s, lesson] of secret) {
    if (forms(s).some((x) => text.includes(x))) { leaks.push({ file: f.slice(web.length + 1), lesson, text: s.slice(0, 70) }); break; }
  }
}

if (leaks.length) {
  console.error(`check-static: Pro lesson content found in ${leaks.length} public file(s):`);
  for (const l of leaks) console.error(`  ${l.file}: ${l.lesson} "${l.text}..."`);
  console.error("Client components must not import @uxgate/content (or anything that does). Pass what they need as props from the server.");
  process.exit(1);
}
console.log(`check-static: ok (${secret.size} Pro lesson strings, ${all.length} public files)`);
