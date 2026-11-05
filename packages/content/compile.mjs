// Compiles content YAML into validated JSON lesson bundles.
//   node compile.mjs [contentDir] [outFile]
// Default input is the repo's content/paths (cast is content/cast.yaml).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { compileTree } from "./src/compile.mjs";
import { collectIcons, mockIconsCss } from "./src/icons.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(process.argv[2] ?? path.join(here, "../../content/paths"));
const out = path.resolve(process.argv[3] ?? path.join(here, "dist/bundle.json"));

const { bundle, errors } = compileTree(dir);
if (errors.length) {
  console.error(errors.map((e) => `  ${e}`).join("\n"));
  console.error(`${errors.length} content error(s).`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(bundle, null, 1) + "\n");

// The app never loads bundle.json, and no lesson is part of the Worker's code: a Worker on the free plan has 10 ms of
// CPU per request, and every isolate would parse its whole script. The app keeps a small index (paths, units, lesson
// titles) and the cast in code; each lesson is a static file the server reads on demand (apps/web copies them to
// public/c/). The file name is a hash of the lesson's content, so it cannot be guessed from a lesson id.
const outDir = path.dirname(out);
const all = [...bundle.lessons, ...bundle.banks];
const lessonDir = path.join(outDir, "lessons");
fs.rmSync(lessonDir, { recursive: true, force: true });
fs.rmSync(path.join(outDir, "loaders.ts"), { force: true });
fs.mkdirSync(lessonDir, { recursive: true });
const files = new Map();
for (const l of all) {
  const json = JSON.stringify(l) + "\n";
  const file = `${crypto.createHash("sha256").update(json).digest("hex").slice(0, 40)}.json`;
  fs.writeFileSync(path.join(lessonDir, file), json);
  files.set(l.lessonId, file);
}
const meta = (l) => { const { steps, review_labels, ...body } = l.body; void steps; void review_labels; return { ...l, file: files.get(l.lessonId), body }; };
// Each video id with the units whose lessons use it, so the video API can check the unit's plan (issue #137).
const videos = {};
for (const l of all) for (const s of l.body.steps) if (s.type === "video") videos[s.video] = [...new Set([...(videos[s.video] ?? []), l.unitId])].sort();
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify({ paths: bundle.paths, units: bundle.units, lessons: bundle.lessons.map(meta), banks: bundle.banks.map(meta), videos }) + "\n");
fs.writeFileSync(path.join(outDir, "cast.json"), JSON.stringify(bundle.cast) + "\n");
// Icons the example screens use (Phosphor masks), imported by the app as @uxgate/content/mock-icons.css.
fs.writeFileSync(path.join(outDir, "mock-icons.css"), mockIconsCss(collectIcons(all.map((l) => l.body))));
console.log(`compiled ${bundle.lessons.length} lessons from ${path.relative(process.cwd(), dir)} -> ${path.relative(process.cwd(), out)}`);
for (const l of [...bundle.lessons, ...bundle.banks]) console.log(`  ${l.lessonId}  ${l.hash.slice(0, 10)}  ${l.body.steps.length} steps`);
