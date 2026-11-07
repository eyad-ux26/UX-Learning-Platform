import type { CardStep, Locale } from "@uxgate/content/types";
import { NOT, POINT, SUMMARY_ICONS } from "./VideoSummary";

/** An idea card read from a card body (design S2-15, docs/design/slice-2/idea-cards.md). No content has to change: the body text is the source. */
export type IdeaPoint = { title: string; text: string; not: boolean; icon: string | null };
export type IdeaTopic = { title: string; term: string | null; text: string; items: string[] };
export type IdeaScale = { a: string; b: string; note: string };
export type IdeaSide = { title: string; icon: string | null; items: string[] };
export type Idea = {
  lead: string[];
  points: IdeaPoint[];
  topics: IdeaTopic[];
  scales: IdeaScale[];
  plain: string[];
  sides: IdeaSide[] | null;
  rules: IdeaPoint[];
  notes: string[];
  next: string | null;
  recap: boolean;
};

const NEXT = /^(?:next lesson|next|الدرس التالي|التالي)\s*[:：]\s*/i;
const BOLD_LEAD = /^\*\*/;

/** Splits at commas that are not inside brackets. */
export function splitItems(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if ("([{«".includes(ch)) depth++;
    else if (")]}»".includes(ch)) depth = Math.max(0, depth - 1);
    if ((ch === "," || ch === "،") && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

const cap = (s: string) => (/^[a-z]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s);
const clean = (title: string) => title.replace(/[:：.]\s*$/, "").trim();

function parsePoint(line: string): { title: string; text: string } {
  const m = POINT.exec(line.trim());
  if (!m) return { title: "", text: cap(line.trim()) };
  return { title: clean(m[1]), text: cap(m[2].replace(/^[:،,.]\s*/, "").trim()) };
}

type Block = { kind: "p"; text: string } | { kind: "list"; lines: string[] } | { kind: "topic"; head: string; lines: string[] };

function blocksOf(body: string): Block[] {
  const out: Block[] = [];
  for (const raw of body.split(/\n\s*\n/)) {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const firstList = lines.findIndex((l) => l.startsWith("- "));
    if (firstList === -1) { out.push({ kind: "p", text: lines.join(" ") }); continue; }
    const head = lines.slice(0, firstList), list = lines.slice(firstList).filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
    if (!head.length) { out.push({ kind: "list", lines: list }); continue; }
    // "**Title.** text" followed by "- " lines is a topic; a plain paragraph followed by a list is two blocks.
    if (BOLD_LEAD.test(head[0]) && !list.every((l) => BOLD_LEAD.test(l))) out.push({ kind: "topic", head: head.join(" "), lines: list });
    else { out.push({ kind: "p", text: head.join(" ") }); out.push({ kind: "list", lines: list }); }
  }
  return out;
}

function topicOf(head: string, lines: string[]): IdeaTopic {
  const m = POINT.exec(head);
  const raw = m ? m[1] : head;
  const text = m ? m[2].replace(/^[:،,]\s*/, "").trim() : "";
  const t = clean(raw);
  const term = /\(([^)]+)\)\s*$/.exec(t);
  return { title: term ? t.slice(0, term.index).trim() : t, term: term ? term[1].trim() : null, text, items: lines };
}

export function readIdea(step: CardStep, locale: Locale): Idea | null {
  if (!step.body || step.mock) return null;
  const body = step.body[locale] ?? step.body.en;
  const en = locale === "en" ? null : step.body.en;
  const blocks = blocksOf(body);
  if (!blocks.length) return null;
  const idea: Idea = { lead: [], points: [], topics: [], scales: [], plain: [], sides: null, rules: [], notes: [], next: null, recap: step.part === "recap" };
  const firstMain = blocks.findIndex((b) => b.kind !== "p");
  const lastMain = blocks.reduce((n, b, i) => (b.kind !== "p" ? i : n), -1);
  const enPoints = en ? blocksOf(en).flatMap((b) => (b.kind === "list" ? b.lines : [])) : null;
  let k = 0;
  blocks.forEach((b, i) => {
    if (b.kind === "p") {
      if (firstMain === -1 || i < firstMain) idea.lead.push(b.text);
      else if (i > lastMain) {
        if (NEXT.test(b.text) && i === blocks.length - 1) idea.next = b.text.replace(NEXT, "").trim();
        else idea.notes.push(b.text);
      } else idea.notes.push(b.text);
      return;
    }
    if (b.kind === "topic") { idea.topics.push(topicOf(b.head, b.lines)); return; }
    if (!b.lines.every((l) => BOLD_LEAD.test(l))) { idea.plain.push(...b.lines); return; }
    for (const l of b.lines) {
      const p = parsePoint(l);
      if (p.title.includes("↔")) {
        const [a, z] = p.title.split("↔").map((x) => x.trim());
        idea.scales.push({ a, b: z, note: p.text.replace(/^\((.*)\)\.?$/, "$1") });
        continue;
      }
      // "Not" points are decided on the English text so both languages group alike (as in the video summary).
      const enTitle = enPoints && enPoints.length ? parsePoint(enPoints[k] ?? "").title : p.title;
      const given = step.icons?.[k];
      idea.points.push({ ...p, not: NOT(enTitle || p.text), icon: given ? SUMMARY_ICONS[given] ?? given : null });
      k++;
    }
  });
  // Icons only when there is one for every point, otherwise every point shows its number (no wrong icon).
  if (!(step.icons && step.icons.length >= idea.points.length)) for (const p of idea.points) p.icon = null;
  if (step.layout === "compare" && idea.points.length >= 2) {
    idea.sides = idea.points.slice(0, 2).map((p) => {
      let items = splitItems(p.text).map((x) => x.replace(/\.$/, ""));
      // A leading "and" on the last item reads oddly once the list is bulleted.
      if (items.length > 1) items[items.length - 1] = items[items.length - 1].replace(locale === "en" ? /^and\s+/i : /^و(?=[؀-ۿ])/, "");
      return { title: p.title, icon: p.icon, items: items.map(cap) };
    });
    idea.rules = idea.points.slice(2);
    idea.points = [];
  }
  const any = idea.points.length + idea.topics.length + idea.scales.length + idea.plain.length + (idea.sides?.length ?? 0);
  if (!any && !idea.lead.length) return null;
  return idea;
}
