// Copies the compiled lesson files (packages/content/dist/lessons) to public/c/, where the server reads them
// (on Cloudflare through the ASSETS binding). Runs before every build and dev server. public/c/ is not committed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.resolve(here, "../../../packages/content/dist/lessons");
const to = path.resolve(here, "../public/c");
fs.rmSync(to, { recursive: true, force: true });
fs.mkdirSync(to, { recursive: true });
const files = fs.readdirSync(from).filter((f) => f.endsWith(".json"));
for (const f of files) fs.copyFileSync(path.join(from, f), path.join(to, f));
console.log(`copied ${files.length} lesson files to public/c/`);
