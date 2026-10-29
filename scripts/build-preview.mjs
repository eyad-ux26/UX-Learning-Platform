// Builds preview/dist/index.html: one self-contained page that plays every lesson.
// Usage: npm run preview [-- P10-U01]   (an optional unit id limits the build to that unit)
//        npm run board                  (every path, opening on the control board: preview/dist/board.html)
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ROOT, loadContent, resolveRefs } from "./lib/content.mjs";
import { validate } from "./validate.mjs";

const board = process.argv.includes("--board");
const only = board ? undefined : process.argv[2];
const paths = loadContent();
const { errors, warnings } = validate(paths);
for (const w of warnings) console.log(`warning  ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`error    ${e}`);
  console.log("Fix the errors above before building the preview.");
  process.exit(1);
}

const strip = (node) => JSON.parse(JSON.stringify(node, (k, v) => (k.startsWith("_") || k === "fixtures" ? undefined : v)));
const bundle = {
  paths: paths
    .map((p) => {
      const refErrors = [];
      const units = p.units
        .filter((u) => !only || u.id === only || p.id === only)
        .map((u) => ({ ...u, lessons: u.lessons.map((l) => resolveRefs(l, p.fixtures, refErrors, l._file)), bank: u.bank.map((l) => resolveRefs(l, p.fixtures, refErrors, l._file)) }));
      return strip({ ...p, units });
    })
    .filter((p) => p.units.length),
};

let rev = "";
try {
  rev = execSync("git rev-parse --short HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {}
const label = [board ? "All paths" : only, rev].filter(Boolean).join(" @ ");

const template = fs.readFileSync(path.join(ROOT, "preview/player.html"), "utf8");
const json = JSON.stringify(bundle).replace(/</g, "\\u003c");
const html = template.replace("/*__CONTENT__*/null", json).replace('/*__BUILD__*/""', JSON.stringify(label)).replace('/*__START__*/""', JSON.stringify(board ? "board" : ""));
const out = path.join(ROOT, board ? "preview/dist/board.html" : "preview/dist/index.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
// Instructor clips: captions live in content/paths/<path>/captions/, the .mp4 files outside git in media/clips/
// (or CLIPS_DIR). Both are copied next to the page as clips/; publish them with the page as supporting files.
const used = new Set();
let copied = 0;
JSON.stringify(bundle, (k, v) => { if (k === "video" && v && v.src) { used.add(v.src); Object.values(v.captions || {}).forEach((c) => used.add(c)); } return v; });
const clipsDir = process.env.CLIPS_DIR || path.join(ROOT, "media/clips");
for (const rel of used) {
  const name = path.basename(rel);
  const from = rel.endsWith(".vtt")
    ? paths.map((p) => path.join(ROOT, "content/paths", p.id, "captions", name)).find((f) => fs.existsSync(f))
    : path.join(clipsDir, name);
  if (!from || !fs.existsSync(from)) { console.log(`warning  missing ${rel}`); continue; }
  fs.mkdirSync(path.join(path.dirname(out), "clips"), { recursive: true });
  fs.copyFileSync(from, path.join(path.dirname(out), "clips", name));
  copied++;
}
if (copied) console.log(`Copied ${copied} clip files to ${path.relative(ROOT, path.join(path.dirname(out), "clips"))}/.`);
const lessons = bundle.paths.flatMap((p) => p.units.flatMap((u) => u.lessons)).length;
console.log(`Built ${path.relative(ROOT, out)} with ${lessons} lessons.`);
