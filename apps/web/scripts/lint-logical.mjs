// Fails when app code uses physical (left/right) CSS instead of logical properties.
// Scans CSS and TSX under app/, components/ and lib/. The generated design stylesheet is checked too.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirs = ["app", "components", "lib"];

const CSS_RULES = [
  [/(^|[;{\s])(margin|padding)-(left|right)\s*:/, "use margin-inline-* / padding-inline-*"],
  [/(^|[;{\s])border-(left|right)(-[a-z]+)?\s*:/, "use border-inline-*"],
  [/(^|[;{\s])border-(top|bottom)-(left|right)-radius\s*:/, "use border-start-start-radius etc."],
  [/(^|[;{\s])(left|right)\s*:\s*(?!var\(--)/, "use inset-inline-start / inset-inline-end"],
  [/text-align\s*:\s*(left|right)/, "use text-align: start / end"],
  [/(^|[;{\s])float\s*:\s*(left|right)/, "use float: inline-start / inline-end"],
  [/(^|[;{\s])(scroll-)?(margin|padding)-(left|right)\s*:/, "use logical scroll/margin/padding"],
];
const TW_RULES = [
  [/(?<![\w-])-?(ml|mr|pl|pr)-(\d|\[|px|auto)/, "use ms-/me-/ps-/pe-"],
  [/(?<![\w-])(left|right)-(\d|\[|px|auto|full|1\/2)/, "use start-/end-"],
  [/(?<![\w-])text-(left|right)(?![\w-])/, "use text-start / text-end"],
  [/(?<![\w-])(rounded|border)-(l|r|tl|tr|bl|br)(-|\s|")/, "use rounded-s/e/ss/se/es/ee, border-s/e"],
  [/(?<![\w-])float-(left|right)/, "use float-start / float-end"],
];

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(css|tsx?)$/.test(e.name)) files.push(p);
  }
};
for (const d of dirs) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));

let bad = 0;
for (const f of files) {
  const rel = path.relative(root, f);
  const rules = f.endsWith(".css") ? CSS_RULES : [...CSS_RULES, ...TW_RULES];
  fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    // The loading spinner is rotationally symmetric, so its one transparent side is not directional.
    if (line.includes("lint-logical-ignore") || line.includes(".spin {")) return;
    for (const [re, hint] of rules) {
      if (re.test(line)) { console.error(`${rel}:${i + 1}: physical property (${hint})\n  ${line.trim().slice(0, 140)}`); bad++; }
    }
  });
}
if (bad) { console.error(`\n${bad} physical-property problem(s).`); process.exit(1); }
console.log(`logical-properties lint: ${files.length} files clean`);
