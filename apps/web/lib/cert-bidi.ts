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
    if (!isLtrWord(words[i])) {
      groups.push([{ text: words[i], ltr: false }]);
      i++;
      continue;
    }
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
