// Loads every path under content/paths and resolves fixture references.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const PATHS_DIR = path.join(ROOT, "content/paths");

const readYaml = (file) => yaml.load(fs.readFileSync(file, "utf8"));

export const CHOICE_TYPES = ["choose", "predict", "words", "fix", "tune"];
export const STEP_TYPES = ["card", ...CHOICE_TYPES, "sort", "order", "match", "spot", "compare"];

// Each path folder holds path.yaml, an optional fixtures.yaml, and one folder per unit
// with unit.yaml plus one YAML file per lesson.
export function loadContent() {
  const paths = [];
  for (const dir of fs.readdirSync(PATHS_DIR).sort()) {
    const pDir = path.join(PATHS_DIR, dir);
    if (!fs.statSync(pDir).isDirectory()) continue;
    const p = readYaml(path.join(pDir, "path.yaml"));
    p._file = path.relative(ROOT, path.join(pDir, "path.yaml"));
    const fxFile = path.join(pDir, "fixtures.yaml");
    p.fixtures = fs.existsSync(fxFile) ? readYaml(fxFile) || {} : {};
    p.units = [];
    for (const uName of fs.readdirSync(pDir).sort()) {
      const uDir = path.join(pDir, uName);
      if (!fs.statSync(uDir).isDirectory()) continue;
      const u = readYaml(path.join(uDir, "unit.yaml"));
      u._file = path.relative(ROOT, path.join(uDir, "unit.yaml"));
      u.lessons = fs
        .readdirSync(uDir)
        .filter((f) => f.endsWith(".yaml") && f !== "unit.yaml")
        .sort()
        .map((f) => ({ ...readYaml(path.join(uDir, f)), _file: path.relative(ROOT, path.join(uDir, f)) }));
      p.units.push(u);
    }
    paths.push(p);
  }
  return paths;
}

// Replaces "@ID" strings with the bilingual text from the path's fixtures.
export function resolveRefs(node, fixtures, errors, where) {
  if (typeof node === "string" && node.startsWith("@")) {
    const hit = fixtures[node.slice(1)];
    if (!hit) {
      errors.push(`${where}: unknown fixture reference ${node}`);
      return node;
    }
    return hit;
  }
  if (Array.isArray(node)) return node.map((n) => resolveRefs(n, fixtures, errors, where));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = resolveRefs(v, fixtures, errors, where);
    return out;
  }
  return node;
}
