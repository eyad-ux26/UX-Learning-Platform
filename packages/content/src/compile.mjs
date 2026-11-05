import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import yaml from "js-yaml";

const CHOICE = ["choose", "words", "predict", "fix", "tune"];
const STEP_TYPES = ["card", "video", ...CHOICE, "compare", "sort", "order", "match", "spot"];
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
  if (s.type === "video") {
    if (typeof s.video !== "string" || !s.video) errors.push(`${where}: video needs a video id`);
    if (!(s.duration > 0)) errors.push(`${where}: video needs a duration in seconds`);
    const tr = s.transcript ?? [];
    if (!tr.length) errors.push(`${where}: video needs a transcript`);
    tr.forEach((l, k) => {
      if (typeof l.t !== "number" || (k > 0 && l.t <= tr[k - 1].t)) errors.push(`${where}: transcript times must increase`);
      if (!isText(l)) errors.push(`${where}: transcript line ${k + 1} needs en and ar`);
    });
    return;
  }
  if (s.type === "card") {
    if (s.points !== undefined) {
      const p = s.points;
      if (!Array.isArray(p) || p.length < 1 || p.length > 4) errors.push(`${where}: points holds 1 to 4 items`);
      else p.forEach((x, k) => {
        if (!x || typeof x.icon !== "string" || !/^[a-z0-9-]+$/.test(x.icon)) errors.push(`${where}: point ${k + 1} needs a Phosphor icon name`);
        if (!isText(x)) errors.push(`${where}: point ${k + 1} needs en and ar`);
      });
    } else if (!isText(s.body)) errors.push(`${where}: card needs body in en and ar`);
    checkMock(s.mock, where, errors);
    return;
  }
  if (!isText(s.prompt)) errors.push(`${where}: prompt needs en and ar`);
  if (!s.skill) errors.push(`${where}: graded step needs a skill`);
  if (!isText(s.explain)) errors.push(`${where}: explain needs en and ar`);
  for (const h of s.hints ?? []) if (!isText(h)) errors.push(`${where}: hint needs en and ar`);
  if ((s.hints ?? []).length > 2) errors.push(`${where}: at most 2 hints`);
  checkMock(s.mock, where, errors);
  if (s.any_ok) errors.push(`${where}: ungraded predictions are not supported (predict is always graded)`);
  const idsOf = (a) => (a ?? []).map((x) => x.id);
  const subset = (xs, all, label) => { for (const x of [].concat(xs ?? [])) if (!all.includes(x)) errors.push(`${where}: ${label} names unknown id ${x}`); };
  for (const o of [...(s.items ?? []), ...(s.left ?? []), ...(s.right ?? []), ...(s.buckets ?? [])]) {
    if (!isText(o.text ?? o.title)) errors.push(`${where}: ${o.id} needs en and ar`);
  }
  if (s.type === "sort") {
    const items = idsOf(s.items), buckets = idsOf(s.buckets);
    const placed = Object.values(s.answer ?? {}).flat();
    subset(Object.keys(s.answer ?? {}), buckets, "answer");
    if (placed.length !== items.length || !items.every((i) => placed.includes(i))) errors.push(`${where}: sort answer must place every item once`);
  }
  if (s.type === "order") {
    const items = idsOf(s.items);
    for (const o of [s.answer, ...(s.also_ok ?? []).map((a) => a.answer)]) if (!Array.isArray(o) || o.length !== items.length || !items.every((i) => o.includes(i))) errors.push(`${where}: every order must list every item once`);
  }
  if (s.type === "match") {
    const left = idsOf(s.left), right = idsOf(s.right);
    if (s.headers !== undefined && !(isText(s.headers?.left) && isText(s.headers?.right))) errors.push(`${where}: match headers need left and right in en and ar`);
    if (Object.keys(s.answer ?? {}).length !== left.length) errors.push(`${where}: match answer must pair every left item`);
    subset(Object.keys(s.answer ?? {}), left, "answer"); subset(Object.values(s.answer ?? {}), right, "answer");
  }
  if (s.type === "spot") {
    const regions = idsOf(s.regions);
    if (!s.mock) errors.push(`${where}: spot needs a mock`);
    subset(s.answer, regions, "answer");
    for (const r of s.regions ?? []) if (!isText(r.label)) errors.push(`${where}: region ${r.id} needs a label in en and ar`);
  }
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

// The scenario characters, from cast.yaml next to the paths. Each tells the scenarios of a lesson in first person.
function loadCast(dir, errors) {
  const file = [path.join(dir, "cast.yaml"), path.join(dir, "..", "cast.yaml")].find((f) => fs.existsSync(f));
  if (!file) return [];
  return (readYaml(file) ?? []).map((c) => {
    if (!c?.id || !isText(c.name) || !isText(c.role)) errors.push(`cast.yaml: ${c?.id ?? "an entry"} needs id, name and role in en and ar`);
    return { id: c.id, en: c.name?.en, ar: c.name?.ar, role_en: c.role?.en, role_ar: c.role?.ar };
  });
}

export function compileTree(dir) {
  const errors = [];
  const cast = loadCast(dir, errors);
  const castIds = cast.map((c) => c.id);
  const bundle = { cast, paths: [], units: [], lessons: [], banks: [] };
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
      const all = fs.readdirSync(uDir).filter((f) => f.endsWith(".yaml") && f !== "unit.yaml").sort();
      const files = all.filter((f) => !BANK_RE.test(f));
      const bankFiles = all.filter((f) => BANK_RE.test(f));
      const lessonIds = [];
      files.forEach((f, order) => {
        const raw = readYaml(path.join(uDir, f));
        const where = raw.id;
        if (f.split("-").slice(0, 3).join("-") !== raw.id) errors.push(`${where}: id must match file name ${f}`);
        const body = resolveRefs(raw, fixtures, errors, where);
        delete body.sources;
        // The lesson's speaker tells every scenario unless a step names its own. The player reads the resolved speaker on the step.
        if (body.speaker !== undefined && !castIds.includes(body.speaker)) errors.push(`${where}: unknown speaker ${body.speaker}`);
        for (const s of body.steps) {
          if (s.speaker !== undefined && !castIds.includes(s.speaker)) errors.push(`${where}/${s.id}: unknown speaker ${s.speaker}`);
          if (s.scenario && (s.speaker ?? body.speaker)) s.speaker = s.speaker ?? body.speaker;
        }
        if (!isText(body.title)) errors.push(`${where}: title needs en and ar`);
        if (body.summary !== undefined && !isText(body.summary)) errors.push(`${where}: summary needs en and ar`);
        const seen = new Set();
        body.steps.forEach((s) => { if (seen.has(s.id)) errors.push(`${where}: duplicate step id ${s.id}`); seen.add(s.id); checkStep(s, `${where}/${s.id}`, errors); });
        const skills = new Set((unit.skills ?? []).map((k) => k.id));
        body.steps.forEach((s) => { if (s.skill && !skills.has(s.skill)) errors.push(`${where}/${s.id}: unknown skill ${s.skill}`); });
        lessonIds.push(body.id);
        bundle.lessons.push({ lessonId: body.id, unitId: unit.id, pathId: pathDoc.id, order, mode: body.mode, minutes: body.minutes, hash: crypto.createHash("sha256").update(canonical(body)).digest("hex"), body });
      });
      // Re-test banks: held-back steps for the mastery round. Same step checks; the player picks the steps it needs.
      bankFiles.forEach((f, order) => {
        const raw = readYaml(path.join(uDir, f));
        const where = raw.id;
        if (f.split("-").slice(0, 3).join("-") !== raw.id) errors.push(`${where}: id must match file name ${f}`);
        if (raw.mode !== "bank") errors.push(`${where}: a bank needs mode: bank`);
        const body = resolveRefs(raw, fixtures, errors, where);
        delete body.sources;
        for (const s of body.steps) {
          if (s.speaker !== undefined && !castIds.includes(s.speaker)) errors.push(`${where}/${s.id}: unknown speaker ${s.speaker}`);
          if (s.scenario && (s.speaker ?? body.speaker)) s.speaker = s.speaker ?? body.speaker;
          checkStep(s, `${where}/${s.id}`, errors);
          if (s.type === "card") errors.push(`${where}/${s.id}: a bank holds graded steps only`);
          if (s.skill && !(unit.skills ?? []).some((k) => k.id === s.skill)) errors.push(`${where}/${s.id}: unknown skill ${s.skill}`);
        }
        bundle.banks.push({ lessonId: body.id, unitId: unit.id, pathId: pathDoc.id, order: 100 + order, mode: "bank", minutes: 0, hash: crypto.createHash("sha256").update(canonical(body)).digest("hex"), body });
      });
      bundle.units.push({ id: unit.id, pathId: pathDoc.id, title: unit.title, skill: unit.skill, free: !!unit.free, skills: unit.skills ?? [], lessons: lessonIds });
    }
  }
  return { bundle, errors };
}
