/**
 * Satori (next/og) has no bidi, so Arabic text is drawn as a reversed row of pieces. Each piece is one word, or one whole run of
 * Latin words (so "Forms That Flow" stays in order). Punctuation around a Latin run is its own piece, so it lands on the correct
 * side in right-to-left reading ("UXGate." keeps the dot at the end of the sentence, which is the left).
 * A group is a set of pieces that sit together with no gap; groups are separated by a space.
 */
export type Piece = { text: string; ltr: boolean };

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const LATIN = /[A-Za-z0-9]/;
const isLtrWord = (w: string) => LATIN.test(w) && !ARABIC.test(w);

export function bidiGroups(text: string): Piece[][] {
  const words = text.replace(/[«»]/g, "").split(/\s+/).filter(Boolean);
  const groups: Piece[][] = [];
  for (let i = 0; i < words.length; ) {
    if (!isLtrWord(words[i])) { groups.push([{ text: words[i], ltr: false }]); i++; continue; }
    let j = i;
    while (j < words.length && isLtrWord(words[j])) j++;
    const run = words.slice(i, j);
    const lead = /^[^A-Za-z0-9]*/.exec(run[0])![0];
    const trail = /[^A-Za-z0-9]*$/.exec(run[run.length - 1])![0];
    run[0] = run[0].slice(lead.length);
    run[run.length - 1] = run[run.length - 1].slice(0, run[run.length - 1].length - trail.length);
    const g: Piece[] = [];
    if (lead) g.push({ text: lead, ltr: false });
    g.push({ text: run.join(" "), ltr: true });
    if (trail) g.push({ text: trail, ltr: false });
    groups.push(g);
    i = j;
  }
  return groups;
}

/**
 * Satori draws a text node left to right, with no bidi. So an Arabic line is built here in its visual order: the groups of the line
 * reversed (the first word ends up at the right) and joined with ordinary spaces, as ONE node per line. That keeps the font's own,
 * even word spacing, which separate boxes per word could not. A Latin run keeps its own order inside the line, and punctuation around it
 * is placed on the correct side. Lines are broken here too, by an estimated width (Satori can't wrap a reversed line), so a wrapped
 * paragraph still reads from the top line down. Each returned string is one line, to be drawn left to right with no wrapping.
 */
export function bidiLines(text: string, fontSize: number, maxWidth: number): string[] {
  const groups = bidiGroups(text);
  const est = (g: Piece[]) => g.reduce((n, p) => n + p.text.length, 0) * fontSize * 0.56;
  const space = fontSize * 0.3;
  const lines: Piece[][][] = [];
  let cur: Piece[][] = [];
  let w = 0;
  for (const g of groups) {
    const gw = est(g);
    if (cur.length && w + space + gw > maxWidth) { lines.push(cur); cur = []; w = 0; }
    w += (cur.length ? space : 0) + gw;
    cur.push(g);
  }
  if (cur.length) lines.push(cur);
  // Drawn left to right, so punctuation that ends an Arabic word in reading order (، ؛ . ؟ !) goes to the word's left.
  const flip = (p: Piece) => { if (p.ltr) return p.text; const m = /^(.*?)([،؛.؟!:,;?]+)$/.exec(p.text); return m && m[1] ? m[2] + m[1] : p.text; };
  const visual = (g: Piece[]) => [...g].reverse().map(flip).join("");
  return lines.map((l) => [...l].reverse().map(visual).join(" "));
}
