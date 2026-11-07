"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type T = (key: string, values?: Record<string, string | number>) => string;
type Tip = { n: 1 | 2 | 3 | 4; targets: string[] };
// What each tip points at. A tip whose target is not on this step (a card step has no choices) is left out.
const TIPS: Tip[] = [
  { n: 1, targets: [".player-say"] },
  { n: 2, targets: [".player-visual .gd-prev, .player-visual .lp-ctx"] },
  { n: 3, targets: [".player-ask .choices", ".player-foot .btn-primary, .player-foot .split"] },
  { n: 4, targets: [".player-head .progress"] },
];
type Rect = { x: number; y: number; w: number; h: number };
const PAD = 8;
/** A screen x (from the left) as an inline-start offset, so the box lands in the same place in right-to-left pages. */
const inl = (x: number, w: number) => (document.documentElement.dir === "rtl" ? window.innerWidth - x - w : x);

function find(sel: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(sel);
  return el && el.getBoundingClientRect().width > 0 ? el : null;
}

const rectsOf = (targets: string[]) => targets.map(find).filter((e): e is HTMLElement => !!e).map((e) => e.getBoundingClientRect());

/** The spotlight, kept inside the window. Tips 1 and 2 also stay between the header and the Check bar, so those are never inside the cut-out. */
function rectOf(tip: Tip): Rect | null {
  const rs = rectsOf(tip.targets);
  if (!rs.length) return null;
  let x1 = Math.min(...rs.map((r) => r.left)), y1 = Math.min(...rs.map((r) => r.top));
  let x2 = Math.max(...rs.map((r) => r.right)), y2 = Math.max(...rs.map((r) => r.bottom));
  let top = 4, bottom = window.innerHeight - 4;
  if (tip.n === 1 || tip.n === 2) {
    const head = document.querySelector<HTMLElement>(".player-head")?.getBoundingClientRect();
    const foot = document.querySelector<HTMLElement>(".player-foot")?.getBoundingClientRect();
    if (head && head.bottom < bottom) top = Math.max(top, head.bottom + 4);
    if (foot && foot.top > top) bottom = Math.min(bottom, foot.top - 4);
  }
  x1 = Math.max(x1, 4); x2 = Math.min(x2, window.innerWidth - 4);
  y1 = Math.max(y1, top); y2 = Math.min(y2, bottom);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

const hits = (a: Rect, b: { x0: number; x1: number; y0: number; y1: number }) => a.x < b.x1 + 8 && a.x + a.w > b.x0 - 8 && a.y < b.y1 + 8 && a.y + a.h > b.y0 - 8;

/**
 * The first-lesson tour: a welcome card, then up to four spotlights (the problem, the screen, the answers and Check, the progress bar).
 * A modal dialog: focus moves into it, Tab stays inside, Esc skips. `onDone` runs when it ends, skipped or finished.
 */
export function LessonTour({ kind, t, onDone }: { kind: "guest" | "first"; t: T; onDone: () => void }) {
  // The step is drawn before the tour looks for its targets.
  const [tips, setTips] = useState<Tip[]>([]);
  useEffect(() => { const r = requestAnimationFrame(() => setTips(TIPS.filter((x) => x.targets.some((s) => find(s))))); return () => cancelAnimationFrame(r); }, []);
  const [at, setAt] = useState(0); // 0 = welcome, 1.. = tips[at - 1]
  const [rect, setRect] = useState<Rect | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const tip = at > 0 ? tips[at - 1] ?? null : null;

  const measure = useCallback(() => setRect(tip ? rectOf(tip) : null), [tip]);
  useLayoutEffect(() => {
    if (!tip) { setRect(null); return; }
    const first = tip.targets.map(find).find(Boolean);
    const sticky = tip.n === 4 || (first && getComputedStyle(first).position === "sticky");
    if (first && !sticky) first.scrollIntoView({ block: "center", behavior: "auto" });
    measure();
    const again = requestAnimationFrame(measure);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { cancelAnimationFrame(again); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [tip, measure]);

  // Focus the main button of each tip, so keyboard and screen reader players land on it.
  // The player focuses its heading as it mounts, so focus is set again a moment later.
  useEffect(() => {
    const focus = () => box.current?.querySelector<HTMLElement>("[data-main]")?.focus();
    focus();
    const id = setTimeout(focus, 120);
    return () => clearTimeout(id);
  }, [at]);

  const last = at === tips.length;
  const next = () => (last ? onDone() : setAt(at + 1));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onDone(); return; }
    if (e.key !== "Tab") return;
    const items = Array.from(box.current?.querySelectorAll<HTMLElement>("button") ?? []);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const to = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
    e.preventDefault(); items[to].focus();
  };

  // On the document, so Esc and Tab work wherever focus is, not only inside the box.
  const keyRef = useRef(onKey);
  keyRef.current = onKey;
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    // Modal: if the player moves focus out (it focuses its heading as it mounts), bring it back to the card.
    const back = (e: FocusEvent) => {
      if (box.current && e.target instanceof Node && !box.current.contains(e.target)) box.current.querySelector<HTMLElement>("[data-main]")?.focus();
    };
    document.addEventListener("keydown", h);
    document.addEventListener("focusin", back);
    return () => { document.removeEventListener("keydown", h); document.removeEventListener("focusin", back); };
  }, []);

  if (!tips.length) return null;
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  const desk = vw >= 1024;
  let pos: React.CSSProperties = {};
  if (tip && rect) {
    // Every candidate place for the card; the first one that stays clear of the lit area wins.
    const lit = { x0: rect.x - PAD, x1: rect.x + rect.w + PAD, y0: rect.y - PAD, y1: rect.y + rect.h + PAD };
    const free = (c: Rect) => !hits(c, lit);
    if (!desk) {
      const h = 220;
      const bottom: Rect = { x: 12, y: vh - 16 - h, w: vw - 24, h }, topc: Rect = { x: 12, y: 72, w: vw - 24, h };
      const useBottom = free(bottom) || !free(topc) ? rect.y + rect.h / 2 < vh / 2 : false;
      pos = useBottom ? { insetInline: 12, insetBlockEnd: 16 } : { insetInline: 12, insetBlockStart: 72 };
    } else {
      const cands: Rect[] = [];
      for (const [wdt, h] of [[400, 240], [270, 330]] as const) {
        const y = Math.max(8, Math.min(vh - h - 8, rect.y));
        cands.push(
          { x: rect.x + rect.w + PAD + 16, y, w: wdt, h }, { x: rect.x - PAD - 16 - wdt, y, w: wdt, h },
          { x: 8, y: 72, w: wdt, h }, { x: vw - wdt - 8, y: 72, w: wdt, h },
          { x: 8, y: 4, w: wdt, h }, { x: vw - wdt - 8, y: 4, w: wdt, h },
          { x: 8, y: vh - h - 8, w: wdt, h }, { x: vw - wdt - 8, y: vh - h - 8, w: wdt, h },
        );
      }
      const ok = cands.filter((c) => c.x >= 8 && c.x + c.w <= vw - 8 && c.y >= 0 && c.y + c.h <= vh);
      const pick = ok.find(free) ?? ok[0] ?? { x: 8, y: 72, w: 400, h: 240 };
      pos = { insetInlineStart: inl(pick.x, pick.w), insetBlockStart: pick.y, inlineSize: pick.w };
    }
  }
  const total = tips.length;
  const title = tip ? t(`tourT${tip.n}`) : t(kind === "guest" ? "tourGuestT" : "tourFirstT");
  const body = tip ? t(`tourB${tip.n}`) : t("tourWelcomeB");
  const tid = "lp-tour-t", bid = "lp-tour-b";
  return (
    <div className="lp-tour">
      {tip && rect ? <div className="gd-spot" style={{ insetInlineStart: inl(rect.x - PAD, rect.w + PAD * 2), insetBlockStart: rect.y - PAD, inlineSize: rect.w + PAD * 2, blockSize: rect.h + PAD * 2 }} aria-hidden="true" /> : <div className="gd-scrim is-full" aria-hidden="true" />}
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={tid} aria-describedby={bid} className={`gd-tour${tip ? "" : " is-welcome"}`} style={pos}>
        {tip ? <p className="gd-tour-n">{t("tourOf", { n: at, total })}</p> : <span className="gd-tour-ic" aria-hidden="true"><span className="ph ph-sparkle" /></span>}
        <h2 className="gd-tour-t" id={tid}>{title}</h2>
        <p className="gd-tour-b" id={bid}>{body}</p>
        {tip ? <div className="gd-tour-dots" aria-hidden="true">{tips.map((_, i) => <i key={i} className={i + 1 === at ? "is-on" : i + 1 < at ? "is-done" : ""} />)}</div> : null}
        <div className="gd-tour-acts">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>{t("tourSkip")}</button>
          <span style={{ flex: 1 }} />
          {at > 1 ? <button type="button" className="btn btn-secondary btn-sm press" onClick={() => setAt(at - 1)}>{t("tourBack")}</button> : null}
          <button type="button" data-main className="btn btn-primary btn-sm press" onClick={next}>{at === 0 ? t("tourShow") : last ? t("tourStart") : t("tourNext")}</button>
        </div>
      </div>
    </div>
  );
}
