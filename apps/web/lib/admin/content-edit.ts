// The lesson editor's rules (CNT-1, CNT-2), pure so the editor, the server actions and the tests agree.
//
// The panel edits the words of a lesson: every English and Arabic pair in its steps (prompts, options, feedback, hints,
// mock text). Changing the structure of a lesson (adding steps, changing answers or mocks) still goes through the
// content files and a pull request, where the full validator runs.
//
// A text field is addressed by its JSON path, such as "steps.3.options.1.text". An edit only replaces the en and ar
// strings of a pair that already exists, so an edit cannot add keys, change answers or inject anything else.
import type { Lesson } from "@uxgate/content/types";

export type TextField = { path: string; stepId: string | null; label: string; en: string; ar: string };
export type Edits = Record<string, { en: string; ar: string }>;

const isPair = (v: unknown): v is { en: string; ar: string } =>
  !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as { en?: unknown }).en === "string" && typeof (v as { ar?: unknown }).ar === "string";

// Keys that hold machine values, never words for learners.
const SKIP = new Set(["id", "type", "part", "skill", "answer", "speaker", "video", "kind", "icon", "icons", "region", "when", "app", "color", "tone", "weight", "size", "gap", "frame", "dir", "url", "code", "layout", "start"]);

/** Words for content keys, so editors read "Option 2 · example screen · part 1.2 · text", not the file's own path. */
const WORDS: Record<string, string> = {
  options: "option", mock: "example screen", blocks: "part", appbar: "top bar", navbar: "nav bar", tabbar: "tab bar",
  items: "item", links: "link", actions: "action", aria: "screen reader label", sub: "subtitle", misconceptions: "wrong answer",
  hints: "hint", transcript: "transcript line", a: "side A", b: "side B", overlay: "pop-up",
};

/** A short label for a path, such as "Option 2 · text" or "Hint 2". Nested parts read as "part 1.2". */
export function labelOf(parts: string[]): string {
  const out: { word: string; n: string }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (/^\d+$/.test(p)) continue;
    const next = parts[i + 1];
    const n = next && /^\d+$/.test(next) ? String(Number(next) + 1) : "";
    const word = WORDS[p] ?? p.replace(/_/g, " ");
    const last = out[out.length - 1];
    if (last && last.word === word && last.n && n) last.n += `.${n}`;
    else out.push({ word, n });
  }
  const s = out.map((o) => (o.n ? `${o.word} ${o.n}` : o.word)).join(" · ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Every English and Arabic pair in the lesson, in reading order. The transcript of a clip counts as pairs too. */
export function textFields(body: Lesson): TextField[] {
  const out: TextField[] = [];
  const walk = (v: unknown, parts: string[], stepId: string | null) => {
    if (isPair(v)) {
      out.push({ path: parts.join("."), stepId, label: labelOf(stepId ? parts.slice(2) : parts), en: v.en, ar: v.ar });
      return;
    }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, [...parts, String(i)], stepId)); return; }
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) if (!SKIP.has(k)) walk(x, [...parts, k], stepId);
    }
  };
  for (const k of ["title", "summary"] as const) if (body[k]) walk(body[k], [k], null);
  body.steps.forEach((s, i) => walk(s, ["steps", String(i)], s.id));
  return out;
}

function getAt(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

/** The body with these edits applied. Unknown paths and paths that are not text pairs are refused. */
export function applyEdits(body: Lesson, edits: Edits): Lesson {
  const copy = structuredClone(body);
  const known = new Set(textFields(body).map((f) => f.path));
  for (const [path, v] of Object.entries(edits)) {
    if (!known.has(path)) throw new Error(`Not a text field: ${path}`);
    if (typeof v?.en !== "string" || typeof v?.ar !== "string") throw new Error(`Both languages are needed for ${path}`);
    if (v.en.length > 4000 || v.ar.length > 4000) throw new Error(`Too long: ${path}`);
    const pair = getAt(copy, path) as { en: string; ar: string };
    pair.en = v.en.replace(/\r\n/g, "\n");
    pair.ar = v.ar.replace(/\r\n/g, "\n");
  }
  return copy;
}

export type Parity = { path: string; label: string; stepId: string | null; behind: "ar" | "en" };

/** Pairs where one language changed since the base version and the other did not (and nobody marked it checked). */
export function behind(base: Lesson, draft: Lesson, acks: string[] = []): Parity[] {
  const before = new Map(textFields(base).map((f) => [f.path, f]));
  const ack = new Set(acks);
  const out: Parity[] = [];
  for (const f of textFields(draft)) {
    const b = before.get(f.path);
    if (!b || ack.has(f.path)) continue;
    const en = b.en !== f.en;
    const ar = b.ar !== f.ar;
    if (en && !ar) out.push({ path: f.path, label: f.label, stepId: f.stepId, behind: "ar" });
    else if (ar && !en) out.push({ path: f.path, label: f.label, stepId: f.stepId, behind: "en" });
  }
  return out;
}

export type Check = { id: string; label: string; ok: boolean; detail?: string };

/** The automatic checks a release runs (docs/learning-model.md and the parity rule). Banks and skill checks skip the lesson-shape checks. */
export function lessonChecks(base: Lesson, draft: Lesson, acks: string[] = []): { ok: boolean; checks: Check[] } {
  const checks: Check[] = [];
  const lesson = draft.mode === "lesson";
  const n = draft.steps.length;
  const parts = draft.steps.map((s) => s.part);
  if (lesson) {
    checks.push({ id: "steps", label: "8 to 12 steps", ok: n >= 8 && n <= 12, detail: `${n} steps` });
    const firstQ = draft.steps.findIndex((s) => s.type !== "card" && s.type !== "video");
    const tryFirst = parts.indexOf("try");
    const concept = parts.indexOf("concept");
    checks.push({ id: "try", label: "Try-first prediction before the idea", ok: tryFirst >= 0 && (concept < 0 || tryFirst < concept) && firstQ >= 0, detail: tryFirst < 0 ? "No step with part try" : undefined });
    checks.push({ id: "contrast", label: "A contrast step", ok: parts.includes("contrast") });
    checks.push({ id: "independent", label: "An independent step on a new case", ok: parts.includes("independent") });
  }
  const empty = textFields(draft).filter((f) => !f.en.trim() || !f.ar.trim());
  checks.push({ id: "empty", label: "No empty text in either language", ok: empty.length === 0, detail: empty.length ? `${empty.length} empty: ${empty.slice(0, 3).map((f) => `${f.stepId ?? "lesson"} ${f.label}`).join(", ")}` : undefined });
  const lag = behind(base, draft, acks);
  const ar = lag.filter((l) => l.behind === "ar").length;
  const en = lag.filter((l) => l.behind === "en").length;
  checks.push({ id: "parity", label: "English and Arabic both updated", ok: lag.length === 0, detail: lag.length ? [ar ? `Arabic not updated in ${ar}` : "", en ? `English not updated in ${en}` : ""].filter(Boolean).join(", ") : undefined });
  const changed = textFields(draft).some((f, i) => { const b = textFields(base)[i]; return !b || b.en !== f.en || b.ar !== f.ar; });
  checks.push({ id: "changed", label: "Something changed", ok: changed });
  return { ok: checks.every((c) => c.ok), checks };
}

/** Changed pairs between two versions, for the release review (diff per language). */
export function diffText(a: Lesson, b: Lesson): { path: string; label: string; stepId: string | null; en?: [string, string]; ar?: [string, string] }[] {
  const before = new Map(textFields(a).map((f) => [f.path, f]));
  const out: ReturnType<typeof diffText> = [];
  for (const f of textFields(b)) {
    const o = before.get(f.path);
    if (!o) { out.push({ path: f.path, label: f.label, stepId: f.stepId, en: ["", f.en], ar: ["", f.ar] }); continue; }
    if (o.en === f.en && o.ar === f.ar) continue;
    out.push({ path: f.path, label: f.label, stepId: f.stepId, en: o.en !== f.en ? [o.en, f.en] : undefined, ar: o.ar !== f.ar ? [o.ar, f.ar] : undefined });
  }
  return out;
}
