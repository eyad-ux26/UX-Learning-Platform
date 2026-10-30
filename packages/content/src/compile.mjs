import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import yaml from "js-yaml";

const STEP_TYPES = ["card", "choose", "tune", "compare"];
const CHOICE = ["choose", "tune"];
const BANK_RE = /^P\d{2}-U\d{2}-B\d{2}-/;
const readYaml = (f) => yaml.load(fs.readFileSync(f, "utf8"));

// Replaces "@ID" strings with the bilingual text from the path's fixtures.
export function resolveRefs(node, fixtures, errors, where) {
  if (typeof node === "string" && node.startsWith("@")) {
    const hit = fixtures[node.slice(1)];
    if (!hit) { errors.push(`${where}: unknown fixture reference ${node}`); return node; }
    return hit;
  }
  if (Array.isArray(node)) return node.map((n) => resolveRefs(n, fixtures, errors, where));
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, resolveRefs(v, fixtures, errors, where)]));
  }
  return node;
}

const isText = (v) => v && typeof v === "object" && typeof v.en === "string" && typeof v.ar === "string" && v.en.trim() && v.ar.trim();

// Stable JSON: keys sorted so the hash does not change with key order.
const canonical = (v) => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x);

function checkMock(m, where, errors) {
  for (const b of m?.blocks ?? []) {
    for (const k of ["text", "label", "hint", "error"]) if (b[k] !== undefined && b[k] !== "" && typeof b[k] !== "string" && !isText(b[k])) errors.push(`${where}: mock ${b.kind} ${k} needs en and ar`);
    if (b.blocks) checkMock(b, where, errors);
  }
}

function checkStep(s, where, errors) {
  if (!STEP_TYPES.includes(s.type)) { errors.push(`${where}: step type "${s.type}" is not supported in this build`); return; }
  if (s.type === "card") {
    if (!isText(s.body)) errors.push(`${where}: card needs body in en and ar`);
    checkMock(s.mock, where, errors);
    return;
  }
  if (!isText(s.prompt)) errors.push(`${where}: prompt needs en and ar`);
  if (!s.skill) errors.push(`${where}: graded step needs a skill`);
  if (!isText(s.explain)) errors.push(`${where}: explain needs en and ar`);
  for (const h of s.hints ?? []) if (!isText(h)) errors.push(`${where}: hint needs en and ar`);
  if ((s.hints ?? []).length > 2) errors.push(`${where}: at most 2 hints`);
  checkMock(s.mock, where, errors);
  if (CHOICE.includes(s.type)) {
    const ids = (s.options ?? []).map((o) => o.id);
    if (new Set(ids).size !== ids.length) errors.push(`${where}: duplicate option ids`);
    for (const o of s.options ?? []) { if (!isText(o.text)) errors.push(`${where}: option ${o.id} needs en and ar`); checkMock(o.mock, `${where}/${o.id}`, errors); }
    if (!(s.answer ?? []).length || s.answer.some((a) => !ids.includes(a))) errors.push(`${where}: answer must list option ids`);
    for (const m of s.misconceptions ?? []) if ([].concat(m.when).some((w) => !ids.includes(w))) errors.push(`${where}: misconception ${m.id} names an unknown option`);
  }
  if (s.type === "compare") {
    if (!["a", "b"].includes(s.answer)) errors.push(`${where}: compare answer must be a or b`);
    checkMock(s.a?.mock, where, errors); checkMock(s.b?.mock, where, errors);
    if (s.reason) {
      const ids = s.reason.options.map((o) => o.id);
      if (s.reason.answer.some((a) => !ids.includes(a))) errors.push(`${where}: reason answer must list option ids`);
    }
  }
}

export function compileTree(dir) {
  const errors = [];
  const bundle = { paths: [], units: [], lessons: [] };
  for (const p of fs.readdirSync(dir).sort()) {
    const pDir = path.join(dir, p);
    if (!fs.statSync(pDir).isDirectory()) continue;
    const pathDoc = readYaml(path.join(pDir, "path.yaml"));
    const fxFile = path.join(pDir, "fixtures.yaml");
    const fixtures = fs.existsSync(fxFile) ? readYaml(fxFile) || {} : {};
    bundle.paths.push({ id: pathDoc.id, title: pathDoc.title, subtitle: pathDoc.subtitle });
    for (const u of fs.readdirSync(pDir).sort()) {
      const uDir = path.join(pDir, u);
      if (!fs.statSync(uDir).isDirectory()) continue;
      const unit = readYaml(path.join(uDir, "unit.yaml"));
      const files = fs.readdirSync(uDir).filter((f) => f.endsWith(".yaml") && f !== "unit.yaml" && !BANK_RE.test(f)).sort();
      const lessonIds = [];
      files.forEach((f, order) => {
        const raw = readYaml(path.join(uDir, f));
        const where = raw.id;
        if (f.split("-").slice(0, 3).join("-") !== raw.id) errors.push(`${where}: id must match file name ${f}`);
        const body = resolveRefs(raw, fixtures, errors, where);
        delete body.sources;
        if (!isText(body.title)) errors.push(`${where}: title needs en and ar`);
        const seen = new Set();
        body.steps.forEach((s) => { if (seen.has(s.id)) errors.push(`${where}: duplicate step id ${s.id}`); seen.add(s.id); checkStep(s, `${where}/${s.id}`, errors); });
        const skills = new Set((unit.skills ?? []).map((k) => k.id));
        body.steps.forEach((s) => { if (s.skill && !skills.has(s.skill)) errors.push(`${where}/${s.id}: unknown skill ${s.skill}`); });
        lessonIds.push(body.id);
        bundle.lessons.push({ lessonId: body.id, unitId: unit.id, pathId: pathDoc.id, order, mode: body.mode, minutes: body.minutes, hash: crypto.createHash("sha256").update(canonical(body)).digest("hex"), body });
      });
      bundle.units.push({ id: unit.id, pathId: pathDoc.id, title: unit.title, skill: unit.skill, free: !!unit.free, skills: unit.skills ?? [], lessons: lessonIds });
    }
  }
  return { bundle, errors };
}
