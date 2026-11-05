import { createContext, Fragment, useContext, type ReactNode } from "react";
import type { Locale, Mock, MockBlock, MockFab, MockOverlay, MockText } from "@uxgate/content/types";

/** Spot steps make blocks with a `region` tappable. */
export type RegionCtx = { selected: string[]; state: (id: string) => "" | "is-right" | "is-wrong" | "is-dim"; labels: Record<string, string>; onPick: (id: string) => void; locked: boolean; rightWord: string; wrongWord: string };
const Regions = createContext<RegionCtx | null>(null);

// In Arabic, codes like WS-204 or A14 and numbers like 010 1234 5678 are wrapped in invisible left-to-right
// isolates so they keep their order, as the preview does. Only those tokens are isolated, never the whole line.
const LRI = (m: string) => "\u2066" + m + "\u2069";
const iso = (s: string, locale: Locale) => (locale !== "ar" ? s : s
  .replace(/\+?\d+(?: \d+)+/g, LRI)
  .replace(/[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]/g, (m) => (/[A-Za-z]/.test(m) && /\d/.test(m) ? LRI(m) : m)));

export const mt = (v: MockText | undefined, locale: Locale): string =>
  v === undefined || v === null ? "" : iso(typeof v === "string" ? v : (v[locale] ?? v.en ?? ""), locale);

/** Mock text with `**bold**` spans, as the preview draws it. */
const inline = (s: string): ReactNode => {
  if (!s.includes("**")) return s;
  return s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>));
};

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined);

function Block({ b, locale }: { b: MockBlock; locale: Locale }) {
  const ctx = useContext(Regions);
  const region = typeof b.region === "string" ? b.region : null;
  if (ctx && region && !ctx.labels[region]) return <Plain b={b} locale={locale} />;
  if (ctx && region) {
    const state = ctx.state(region);
    const picked = ctx.selected.includes(region);
    return (
      <button type="button" className={`lp-region ${picked && !state ? "is-selected" : state}`} aria-pressed={picked} aria-label={ctx.labels[region]} disabled={ctx.locked} onClick={() => ctx.onPick(region)}>
        {state === "is-right" || state === "is-wrong" ? <span className={`lp-spot-tag ${state}`}>{state === "is-right" ? ctx.rightWord : ctx.wrongWord}</span> : null}
        <span aria-hidden="true"><Plain b={b} locale={locale} /></span>
      </button>
    );
  }
  return <Plain b={b} locale={locale} />;
}

const Label = ({ b, locale }: { b: MockBlock; locale: Locale }) => (b.label ? <div className="fl">{mt(b.label, locale)}</div> : null);

function Slider({ b, locale }: { b: MockBlock; locale: Locale }) {
  const lo = num(b.min) ?? 0, hi = num(b.max) ?? 100;
  const f = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const a = num(b.from) ?? lo + (hi - lo) * 0.2, z = num(b.to) ?? lo + (hi - lo) * 0.65;
  const fmt = (x: number, y: number) => mt((b.format as MockText) || b.text || "", locale).replace("{a}", String(x)).replace("{b}", String(y));
  const value = num(b.value);
  const one = value !== undefined;
  const thumbs = one ? [value] : [a, z];
  const bubble = b.bubble as string | undefined;
  const below = bubble ? (b.format ? "" : mt(b.text, locale)) : b.format ? (one ? fmt(value, value) : fmt(a, z)) : mt(b.text, locale);
  const ticks = Array.isArray(b.ticks) ? (b.ticks as MockText[]) : null;
  return (
    <>
      <Label b={b} locale={locale} />
      <div className={`sl${one ? " one" : ""}${bubble ? ` bb-${bubble}` : ""}`} aria-hidden="true">
        {one ? <s style={{ width: `${f(value)}%` }} /> : null}
        {thumbs.map((v, k) => (
          <i key={k} style={{ insetInlineStart: `${f(v)}%` }}>
            {bubble === "above" ? <em className="bub">{fmt(v, v)}</em> : bubble === "thumb" ? <em className="onth">{fmt(v, v)}</em> : null}
            {b.finger === true || b.finger === k ? <u className="finger" /> : null}
          </i>
        ))}
      </div>
      {ticks ? <div className="ticks">{ticks.map((t, k) => <span key={k}>{mt(t, locale)}</span>)}</div> : null}
      {below ? <div className="fh">{below}</div> : null}
    </>
  );
}

type CalMonth = { title?: MockText; start?: number; days?: number };
function Calendar({ b, locale }: { b: MockBlock; locale: Locale }) {
  const months = (Array.isArray(b.months) ? b.months : []) as CalMonth[];
  const key = (m: number, d: number) => m * 100 + d;
  const pair = (v: unknown) => (Array.isArray(v) && v.length === 2 ? key(Number(v[0]), Number(v[1])) : undefined);
  const lo = pair(b.from) ?? pair(b.pick) ?? -1;
  const hi = pair(b.to) ?? lo;
  const today = Array.isArray(b.today) ? (b.today as number[]) : null;
  const wd = mt((b.weekdays as MockText) ?? { en: "S M T W T F S", ar: "ح ن ث ر خ ج س" }, locale).split(" ");
  return (
    <>
      <Label b={b} locale={locale} />
      <div className={`cal${months.length > 1 ? " two" : ""}`}>
        {months.map((m, mi) => (
          <div className="cm" key={mi}>
            <div className="ct">{mt(m.title, locale)}</div>
            <div className="cg">
              {wd.map((w, k) => <i key={`w${k}`} className="cw">{w}</i>)}
              {Array.from({ length: m.start ?? 0 }, (_, k) => <i key={`e${k}`} />)}
              {Array.from({ length: m.days ?? 30 }, (_, k) => {
                const d = k + 1, v = key(mi, d), on = lo >= 0 && v >= lo && v <= hi, end = v === lo || v === hi;
                const td = today && today[0] === mi && today[1] === d;
                return <i key={d} className={`cd${on ? (end ? " cde" : " cdr") : ""}${td ? " cdt" : ""}`}>{d}</i>;
              })}
            </div>
          </div>
        ))}
      </div>
      {b.text ? <div className="fh">{mt(b.text, locale)}</div> : null}
    </>
  );
}

type ChipItem = { text?: MockText; on?: boolean; x?: boolean; icon?: string };

function Plain({ b, locale }: { b: MockBlock; locale: Locale }) {
  const cls = ["b", `k-${b.kind}`, b.size && `size-${b.size}`, b.emphasis && `em-${b.emphasis}`, b.tone && `tone-${b.tone}`, b.gap && `gap-${b.gap}`, b.color && `c-${b.color}`, b.weight && `w-${b.weight}`, b.style && `style-${String(b.style)}`, b.nowrap && "nowrap", b.ring && `ring-${String(b.ring)}`].filter(Boolean).join(" ");
  const style: React.CSSProperties & Record<string, string | number> = {};
  if (b.px) { style.fontSize = b.px; style.lineHeight = 1.3; }
  if (b.height) { style.height = Number(b.height); style.overflow = "hidden"; }
  if (b.overlap) style.marginBlockStart = -30;
  const text = mt(b.text, locale);

  switch (b.kind) {
    case "group": {
      const scroll = b.scroll ? " scroll" + (b.sticky ? " sticky" : "") : "";
      if (b.scroll && b.colw) style["--colw"] = `${Number(b.colw)}px`;
      return <div className={cls + scroll} style={style}>{b.blocks?.map((c, i) => <Block key={i} b={c} locale={locale} />)}</div>;
    }
    case "row":
      return <div className={`row2 ${b.gap ? `gap-${b.gap}` : ""}`}>{b.blocks?.map((c, i) => <Block key={i} b={c} locale={locale} />)}</div>;
    case "field":
    case "select": {
      const hint = b.hint ? <div className="fh">{mt(b.hint, locale)}</div> : null;
      const looksLtr = /\d/.test(text) && /^[\s\d+\-()⁦⁩]+$/.test(text);
      return (
        <div className={cls} style={style}>
          <Label b={b} locale={locale} />
          {b.hintFirst ? hint : null}
          <div className={`fi${b.filled ? " filled" : ""}${b.focus ? " focus" : ""}`} dir={looksLtr ? "ltr" : undefined}>
            {text}{b.kind === "select" ? <span className="chev" aria-hidden="true">▾</span> : null}
          </div>
          {!b.hintFirst ? hint : null}
          {b.error ? <div className="fe">{mt(b.error, locale)}</div> : null}
        </div>
      );
    }
    case "radio":
    case "check":
      return <div className={cls} style={style}><span className={`mk${b.selected ? " on" : ""}${b.marker ? ` mk-${String(b.marker)}` : ""}`} aria-hidden="true" /><span>{inline(text)}</span></div>;
    case "toggle":
      return <div className={cls} style={style}><span>{inline(text)}</span><span className={`sw${b.selected ? " on" : ""}`} aria-hidden="true" /></div>;
    case "stepper": {
      // min/max grey out − or + at the limit.
      const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
      const off = (v: unknown) => (num(v) !== undefined && n === num(v) ? " off" : "");
      return (
        <div className={cls} style={style}>
          <Label b={b} locale={locale} />
          <div className={`stp${b.size ? ` stp-${b.size}` : ""}`}><span className={`sb${off(b.min)}`} aria-hidden="true">−</span><b className={b.editable ? "ed" : undefined}>{text}</b><span className={`sb${off(b.max)}`} aria-hidden="true">+</span></div>
          {b.hint ? <div className="fh">{mt(b.hint, locale)}</div> : null}
        </div>
      );
    }
    case "segmented":
      return <div className={cls} style={style}>{(b.options ?? []).map((o, k) => <span key={k} className={`sg${k === (b.value ?? 0) ? " on" : ""}`}>{mt(o, locale)}</span>)}</div>;
    case "slider":
      return <div className={cls} style={style}><Slider b={b} locale={locale} /></div>;
    case "calendar":
      return <div className={cls} style={style}><Calendar b={b} locale={locale} /></div>;
    case "wheel": {
      // columns: lists of 5 values; the middle row is the chosen one.
      const cols = (Array.isArray(b.columns) ? b.columns : []) as MockText[][];
      return (
        <div className={cls} style={style}>
          <Label b={b} locale={locale} />
          <div className="whl">{cols.map((c, ci) => <div className="wc" key={ci}>{c.map((v, k) => <span key={k} className={k === 2 ? "wm" : Math.abs(k - 2) === 1 ? "w1" : "w2"}>{mt(v, locale)}</span>)}</div>)}</div>
        </div>
      );
    }
    case "chips": {
      // A wrapping row of UI chips: `on` is selected (✓), `x` is removable (✕); `boxed` draws a field around them.
      const items = (Array.isArray(b.items) ? b.items : []) as ChipItem[];
      return (
        <div className={cls} style={style}>
          <Label b={b} locale={locale} />
          <div className={`cps${b.boxed ? " boxed" : ""}`}>
            {b.lead ? <span className="cpl">{mt(b.lead as MockText, locale)}</span> : null}
            {items.map((c, k) => (
              <span key={k} className={`cp${c.on ? " on" : ""}${c.x ? " rm" : ""}`}>
                {c.on ? <i aria-hidden="true">✓</i> : c.icon ? <i aria-hidden="true">{c.icon}</i> : null}
                {mt(c.text, locale)}
                {c.x ? <i className="cx" aria-hidden="true">✕</i> : null}
              </span>
            ))}
            {b.after ? <span className="cpa">{mt(b.after as MockText, locale)}</span> : null}
          </div>
        </div>
      );
    }
    case "divider":
      return <div className={cls} style={style} />;
    default:
      return <div className={cls} style={style}>{inline(text)}{b.code ? <> <bdi dir="ltr">{b.code}</bdi></> : null}</div>;
  }
}

/** A dialog, bottom sheet, full-screen layer, toast or top banner drawn over the screen. Dialogs and sheets dim the screen unless `scrim: false`. */
function Overlay({ o, locale }: { o: MockOverlay; locale: Locale }) {
  const scrim = o.scrim ?? (o.type === "dialog" || o.type === "sheet");
  return (
    <>
      {scrim ? <div className="scrim" aria-hidden="true" /> : null}
      <div className={`ov ov-${o.type}${o.tall ? " tall" : ""}`}>
        {o.type === "sheet" && o.handle !== false ? <div className="grab" aria-hidden="true" /> : null}
        {o.close ? <span className="ovx" aria-hidden="true">✕</span> : null}
        {o.blocks.map((c, i) => <Block key={i} b={c} locale={locale} />)}
      </div>
    </>
  );
}

/** Floating action buttons, stacked from the bottom corner; `text` makes an extended FAB. */
const Fabs = ({ fab, locale }: { fab: MockFab | MockFab[]; locale: Locale }) => (
  <>
    {([] as MockFab[]).concat(fab).map((x, i) => (
      <div key={i} className={`k-fab${x.text ? " ext" : ""}${i ? ` n${i + 1}` : ""}`} aria-hidden="true"><span>{x.icon || "+"}</span>{x.text ? <b>{mt(x.text, locale)}</b> : null}</div>
    ))}
  </>
);

/** An example screen, drawn from the content's mock blocks, inside the design system's frame with an EXAMPLE tag so it is never mistaken for UXGate. */
export function MockView({ mock, locale, label, tag, chip, regions }: { mock: Mock; locale: Locale; label: string; tag: string; chip: string; regions?: RegionCtx }) {
  const blocks = mock.blocks.map((b, i) => <Block key={i} b={b} locale={locale} />);
  const screen: React.CSSProperties = {};
  if (mock.width) { screen.maxWidth = mock.width; screen.marginInline = "auto"; }
  if (mock.height) screen.minHeight = Number(mock.height);
  const cls = ["exmock", mock.frame === "wide" && "wide", mock.gray && "gray", mock.overlay && "has-ov", mock.fab && "has-fab"].filter(Boolean).join(" ");
  const body = (
    <div className="mock" role="group" aria-label={label}>
      <div className="mock-bar" aria-hidden="true"><span className="lbl">{chip}</span><span className="cap">{tag}{mock.caption ? ` · ${mt(mock.caption, locale)}` : ""}</span><span className="dots"><i /><i /></span></div>
      <div className={cls} dir={mock.dir ?? (locale === "ar" ? "rtl" : "ltr")} style={screen}>
        {mock.blur ? <div style={{ filter: `blur(${mock.blur}px)` }} aria-hidden="true">{blocks}</div> : blocks}
        {mock.fab ? <Fabs fab={mock.fab} locale={locale} /> : null}
        {mock.overlay ? <Overlay o={mock.overlay} locale={locale} /> : null}
      </div>
    </div>
  );
  return regions ? <Regions.Provider value={regions}>{body}</Regions.Provider> : body;
}
