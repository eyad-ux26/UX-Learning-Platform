// Checks every path, unit and lesson against the content format in docs/content-format.md.
// Exits with code 1 when anything is wrong, so CI and the preview build stop on bad content.
import path from "node:path";
import { loadContent, resolveRefs, CHOICE_TYPES, STEP_TYPES } from "./lib/content.mjs";

const PARTS = ["hook", "try", "concept", "guided", "contrast", "independent", "recap", "check"];
const RULE_RE = /^(R(0[1-9]|[1-3]\d|40)|U(0[1-9]|[1-5]\d|60))$/;
const MC_RE = /^MC-P\d{2}-\d{3}$/;

export function validate(paths) {
  const errors = [];
  const warnings = [];

  // Every bilingual text needs both languages, non-empty.
  const checkText = (node, where) => {
    if (Array.isArray(node)) return node.forEach((n, i) => checkText(n, `${where}[${i}]`));
    if (!node || typeof node !== "object") return;
    if ("en" in node || "ar" in node) {
      for (const lang of ["en", "ar"]) {
        if (typeof node[lang] !== "string" || !node[lang].trim()) errors.push(`${where}: missing ${lang} text`);
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith("_")) checkText(v, `${where}.${k}`);
  };
  const need = (cond, msg) => cond || errors.push(msg);
  const ids = (list) => (Array.isArray(list) ? list.map((x) => x.id) : []);
  const unique = (list, where) => {
    const seen = new Set();
    for (const id of list) {
      if (seen.has(id)) errors.push(`${where}: duplicate id ${id}`);
      seen.add(id);
    }
  };
  const subset = (picked, allowed, where) => {
    for (const id of [].concat(picked ?? [])) if (!allowed.includes(id)) errors.push(`${where}: unknown id ${id}`);
  };
  const checkMisconceptions = (list, where, checkWhen) => {
    for (const [i, m] of (list || []).entries()) {
      const w = `${where}.misconceptions[${i}]`;
      need(MC_RE.test(m.id || ""), `${w}: id must look like MC-P10-001`);
      need(m.feedback, `${w}: feedback is required`);
      need(m.when !== undefined, `${w}: when is required`);
      if (m.when !== undefined) checkWhen(m.when, w);
    }
  };
  const checkReason = (r, where) => {
    if (!r) return;
    const opts = ids(r.options);
    need(r.prompt, `${where}.reason: prompt is required`);
    need(opts.length >= 2, `${where}.reason: needs at least 2 options`);
    unique(opts, `${where}.reason.options`);
    need(Array.isArray(r.answer) && r.answer.length, `${where}.reason: answer is required`);
    subset(r.answer, opts, `${where}.reason.answer`);
    checkMisconceptions(r.misconceptions, `${where}.reason`, (when, w) => subset(when, opts, `${w}.when`));
  };

  for (const p of paths) {
    const pw = p._file;
    need(/^P\d{2}$/.test(p.id || ""), `${pw}: id must look like P10`);
    need(p.title, `${pw}: title is required`);
    for (const u of p.units) {
      const uw = u._file;
      need(new RegExp(`^${p.id}-U\\d{2}$`).test(u.id || ""), `${uw}: id must look like ${p.id}-U01`);
      need(u.title && u.skill, `${uw}: title and skill are required`);
      need(typeof u.free === "boolean", `${uw}: free must be true or false`);
      checkText(u, uw);
      unique(u.lessons.map((l) => l.id), uw);
      for (const raw of u.lessons) {
        const lw = raw._file;
        const l = resolveRefs(raw, p.fixtures, errors, lw);
        need(new RegExp(`^${u.id}-L\\d{2}$`).test(l.id || ""), `${lw}: id must look like ${u.id}-L01`);
        need(path.basename(lw, ".yaml").startsWith(l.id || "?"), `${lw}: file name must start with the lesson id`);
        need(["lesson", "check"].includes(l.mode), `${lw}: mode must be lesson or check`);
        need(l.title && l.minutes, `${lw}: title and minutes are required`);
        need(Array.isArray(l.steps) && l.steps.length, `${lw}: steps are required`);
        checkText(l, lw);
        const steps = l.steps || [];
        unique(steps.map((s) => s.id), lw);
        const graded = steps.filter((s) => s.type !== "card" && !s.any_ok).length;
        if (l.mode === "lesson" && (steps.length < 8 || steps.length > 12)) warnings.push(`${lw}: ${steps.length} steps (aim for 8 to 12)`);
        if (l.mode === "check" && graded < 4) warnings.push(`${lw}: a skill check should have at least 4 graded steps`);
        const conf = steps.filter((s) => s.confidence).length;
        if (conf > 2) warnings.push(`${lw}: ${conf} confidence taps (aim for about 2)`);

        for (const s of steps) {
          const sw = `${lw} ${s.id}`;
          need(/^S\d{2}$/.test(s.id || ""), `${sw}: step id must look like S01`);
          need(STEP_TYPES.includes(s.type), `${sw}: unknown type ${s.type}`);
          need(PARTS.includes(s.part), `${sw}: part must be one of ${PARTS.join(", ")}`);
          for (const r of s.rules || []) need(RULE_RE.test(r), `${sw}: unknown rule ${r}`);
          need((s.hints || []).length <= 2, `${sw}: at most 2 hints`);
          if (s.type === "card") {
            need(s.body || s.mock, `${sw}: a card needs a body or a mock`);
            continue;
          }
          need(s.prompt, `${sw}: prompt is required`);
          if (!s.any_ok) need(s.explain, `${sw}: explain is required on graded steps`);
          if (l.mode === "check" && (s.hints || []).length) warnings.push(`${sw}: hints are hidden in skill checks`);

          if (CHOICE_TYPES.includes(s.type)) {
            const opts = ids(s.options);
            need(opts.length >= 2, `${sw}: needs at least 2 options`);
            unique(opts, sw);
            if (s.type === "tune") need(s.options?.every((o) => o.mock), `${sw}: every tune option needs a mock`);
            if (s.any_ok) need(s.reveal, `${sw}: an ungraded prediction needs reveal text`);
            else {
              need(Array.isArray(s.answer) && s.answer.length, `${sw}: answer is required`);
              subset(s.answer, opts, `${sw}.answer`);
            }
            for (const a of s.also_ok || []) subset(a.answer, opts, `${sw}.also_ok`);
            checkMisconceptions(s.misconceptions, sw, (when, w) => subset(when, opts, `${w}.when`));
            checkReason(s.reason, sw);
          } else if (s.type === "sort") {
            const items = ids(s.items), buckets = ids(s.buckets);
            unique(items, sw);
            need(buckets.length >= 2, `${sw}: needs at least 2 buckets`);
            for (const ans of [s.answer, ...(s.also_ok || []).map((a) => a.answer)]) {
              const placed = Object.values(ans || {}).flat();
              subset(Object.keys(ans || {}), buckets, `${sw}.answer`);
              need(placed.length === items.length && items.every((i) => placed.includes(i)), `${sw}: every answer must place every item once`);
            }
            checkMisconceptions(s.misconceptions, sw, (when, w) => {
              subset(when.item, items, `${w}.when.item`);
              subset(when.bucket, buckets, `${w}.when.bucket`);
            });
          } else if (s.type === "order") {
            const items = ids(s.items);
            unique(items, sw);
            const orders = [s.answer, ...(s.also_ok || []).map((a) => a.answer)];
            for (const o of orders) need(Array.isArray(o) && o.length === items.length && items.every((i) => o.includes(i)), `${sw}: every order must list every item once`);
            checkMisconceptions(s.misconceptions, sw, (when, w) => subset(when.before, items, `${w}.when.before`));
          } else if (s.type === "match") {
            const left = ids(s.left), right = ids(s.right);
            need(Object.keys(s.answer || {}).length === left.length, `${sw}: answer must pair every left item`);
            subset(Object.keys(s.answer || {}), left, `${sw}.answer`);
            subset(Object.values(s.answer || {}), right, `${sw}.answer`);
            checkMisconceptions(s.misconceptions, sw, (when, w) => {
              subset(when.left, left, `${w}.when.left`);
              subset(when.right, right, `${w}.when.right`);
            });
          } else if (s.type === "spot") {
            const regions = ids(s.regions);
            need(s.mock, `${sw}: spot needs a mock`);
            const flat = (blocks) => (blocks || []).flatMap((b) => [b, ...flat(b.blocks)]);
            const mockRegions = flat(s.mock?.blocks).map((b) => b.region).filter(Boolean);
            subset(regions, mockRegions, `${sw}.regions (each region must be tagged on a mock block)`);
            subset(s.answer, regions, `${sw}.answer`);
            checkMisconceptions(s.misconceptions, sw, (when, w) => subset(when, regions, `${w}.when`));
          } else if (s.type === "compare") {
            need(s.a?.mock && s.b?.mock, `${sw}: compare needs a.mock and b.mock`);
            need(["a", "b"].includes(s.answer), `${sw}: answer must be a or b`);
            checkMisconceptions(s.misconceptions, sw, (when, w) => subset(when, ["a", "b"], `${w}.when`));
            checkReason(s.reason, sw);
          }
        }
      }
    }
  }
  return { errors, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, warnings } = validate(loadContent());
  for (const w of warnings) console.log(`warning  ${w}`);
  for (const e of errors) console.log(`error    ${e}`);
  console.log(`${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}
