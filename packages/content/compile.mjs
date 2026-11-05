// Compiles content YAML into validated JSON lesson bundles.
//   node compile.mjs [contentDir] [outFile]
// Default input is seed/paths (slice 1 seed from content/p01-u01); the same code runs on content/paths.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { compileTree } from "./src/compile.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(process.argv[2] ?? path.join(here, "seed/paths"));
const out = path.resolve(process.argv[3] ?? path.join(here, "dist/bundle.json"));

const { bundle, errors } = compileTree(dir);
if (errors.length) {
  console.error(errors.map((e) => `  ${e}`).join("\n"));
  console.error(`${errors.length} content error(s).`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(bundle, null, 1) + "\n");
console.log(`compiled ${bundle.lessons.length} lessons from ${path.relative(process.cwd(), dir)} -> ${path.relative(process.cwd(), out)}`);
for (const l of bundle.lessons) console.log(`  ${l.lessonId}  ${l.hash.slice(0, 10)}  ${l.body.steps.length} steps`);
void crypto;
