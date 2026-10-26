// Builds preview/dist/index.html: one self-contained page that plays every lesson.
// Usage: npm run preview [-- P10-U01]   (an optional unit id limits the build to that unit)
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ROOT, loadContent, resolveRefs } from "./lib/content.mjs";
import { validate } from "./validate.mjs";

const only = process.argv[2];
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
        .map((u) => ({ ...u, lessons: u.lessons.map((l) => resolveRefs(l, p.fixtures, refErrors, l._file)) }));
      return strip({ ...p, units });
    })
    .filter((p) => p.units.length),
};

let rev = "";
try {
  rev = execSync("git rev-parse --short HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {}
const label = [only, rev].filter(Boolean).join(" @ ");

const template = fs.readFileSync(path.join(ROOT, "preview/player.html"), "utf8");
const json = JSON.stringify(bundle).replace(/</g, "\\u003c");
const html = template.replace("/*__CONTENT__*/null", json).replace('/*__BUILD__*/""', JSON.stringify(label));
const out = path.join(ROOT, "preview/dist/index.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
const lessons = bundle.paths.flatMap((p) => p.units.flatMap((u) => u.lessons)).length;
console.log(`Built ${path.relative(ROOT, out)} with ${lessons} lessons.`);
