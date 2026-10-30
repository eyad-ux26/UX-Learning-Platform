// Generates dist/tokens.css and dist/tokens.ts from the approved design tokens
// (docs/design/system/tokens.json). Run: npm run tokens
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../../docs/design/system/tokens.json");
const out = path.join(here, "dist");
const t = JSON.parse(fs.readFileSync(src, "utf8"));

const vars = (obj, prefix) =>
  Object.entries(obj).map(([k, v]) => `  --ug-${prefix}-${k}: ${v};`);

const light = vars(t.color.light, "color");
const dark = vars(t.color.dark, "color");

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "tokens.css"),
  `/* Generated from docs/design/system/tokens.json. Do not edit. */\n:root,\n[data-theme="light"] {\n${light.join("\n")}\n}\n[data-theme="dark"] {\n${dark.join("\n")}\n}\n`,
);
fs.writeFileSync(
  path.join(out, "tokens.ts"),
  `// Generated from docs/design/system/tokens.json. Do not edit.\nexport const color = ${JSON.stringify(t.color, null, 2)} as const;\nexport type ColorToken = keyof typeof color.light;\n`,
);
console.log("tokens built:", Object.keys(t.color.light).length, "colours");
