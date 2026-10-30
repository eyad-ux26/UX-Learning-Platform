// Loads every path under content/paths and resolves fixture references.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const PATHS_DIR = path.join(ROOT, "content/paths");

const readYaml = (file) => yaml.load(fs.readFileSync(file, "utf8"));

export const CHOICE_TYPES = ["choose", "predict", "words", "fix", "tune"];
const BANK_RE = /^P\d{2}-U\d{2}-B\d{2}-/;
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
      if (!/^U\d{2}$/.test(uName) || !fs.statSync(uDir).isDirectory()) continue; // e.g. captions/ is not a unit
      const u = readYaml(path.join(uDir, "unit.yaml"));
      u._file = path.relative(ROOT, path.join(uDir, "unit.yaml"));
      const files = fs.readdirSync(uDir).filter((f) => f.endsWith(".yaml") && f !== "unit.yaml").sort();
      const load = (f) => ({ ...readYaml(path.join(uDir, f)), _file: path.relative(ROOT, path.join(uDir, f)) });
      // Bank files (P10-U01-B01-...) hold re-test versions: learners never see them as lessons,
      // only in the end-of-unit mastery round.
      u.lessons = files.filter((f) => !BANK_RE.test(f)).map(load);
      u.bank = files.filter((f) => BANK_RE.test(f)).map(load);
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

// A step's scenario: its own `scenario`, or else its lesson's hook. Two versions of a skill
// count as different scenarios only when these differ.
export function scenarioOf(lesson, step) {
  const t = (v) => (v && typeof v === "object" ? v.en : v) || "";
  if (step.scenario) return t(step.scenario).trim();
  const hook = (lesson.steps || []).find((x) => x.type === "card" && x.part === "hook");
  return hook ? `${t(hook.title)}: ${t(hook.body)}`.trim() : lesson.id;
}
