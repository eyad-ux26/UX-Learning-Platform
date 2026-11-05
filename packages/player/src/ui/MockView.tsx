import { createContext, Fragment, useContext, type ReactNode } from "react";
import type { Locale, Mock, MockAction, MockApp, MockAppbar, MockBlock, MockFab, MockNavbar, MockOverlay, MockText } from "@uxgate/content/types";
import { artSvg } from "./art";

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
      <button type="button" data-region={region} className={`lp-region region ${picked && !state ? "is-selected" : state}`} aria-pressed={picked} aria-label={ctx.labels[region]} disabled={ctx.locked} onClick={() => ctx.onPick(region)}>
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

function Core({ b, locale }: { b: MockBlock; locale: Locale }) {
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
            {b.icon ? <Icon name={String(b.icon)} /> : null}
            {b.icon || b.trail ? <span className="fi-t">{text}</span> : text}
            {b.trail ? (/^[a-z0-9-]+$/.test(String(b.trail)) ? <Icon name={String(b.trail)} /> : <span>{mt(b.trail as MockText, locale)}</span>) : null}
            {b.kind === "select" ? <span className="chev" aria-hidden="true">▾</span> : null}
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
    case "image":
      if (b.art) return <div className={cls + " has-art"} style={style}><Art name={String(b.art)} label={mt(b.alt as MockText, locale)} />{text ? <span className="art-cap">{inline(text)}</span> : null}</div>;
      return <div className={cls} style={style}>{inline(text)}</div>;
    case "button":
    case "link":
    case "chip":
    case "iconbtn":
    case "banner":
    case "small":
    case "meta":
    case "text":
    case "heading":
      if (b.icon || b.aria || b.active) {
        const ac = b.active ? " is-on" : "";
        const only = !text || b.kind === "iconbtn";
        return <div className={cls + ac + (b.icon ? " has-icon" : "")} style={style} aria-label={b.aria ? mt(b.aria as MockText, locale) : undefined}>{b.icon ? <Icon name={String(b.icon)} /> : null}{b.kind === "iconbtn" && b.icon ? null : only && b.icon ? null : <span>{inline(text)}</span>}</div>;
      }
      return <div className={cls} style={style}>{inline(text)}{b.code ? <> <bdi dir="ltr">{b.code}</bdi></> : null}</div>;
    default: {
      const extra = NEW_KINDS[b.kind];
      if (extra) return extra({ b, locale, cls, style, text });
      return <div className={cls} style={style}>{inline(text)}{b.code ? <> <bdi dir="ltr">{b.code}</bdi></> : null}</div>;
    }
  }
}

/** Any block, with an optional numbered `mark` and a pinned `note`. */
function Plain({ b, locale }: { b: MockBlock; locale: Locale }) {
  const core = <Core b={b} locale={locale} />;
  if (b.mark === undefined && !b.note) return core;
  return (
    <div className={`xm-pin${b.gap ? ` gap-${b.gap}` : ""}`}>
      {core}
      {b.mark !== undefined ? <span className="xm-mark" aria-hidden="true">{String(b.mark)}</span> : null}
      {b.note ? <span className="xm-note">{mt(b.note as MockText, locale)}</span> : null}
    </div>
  );
}

/** A Phosphor icon (drawn from mock-icons.css), or a literal character such as an emoji. */
/** True inside a right-to-left screen, where carets and arrows point the other way. */
const Rtl = createContext(false);
/** caret-left ⇄ caret-right, arrow-up-left ⇄ arrow-up-right; two-way icons (arrows-left-right) stay. */
export const mirrorIcon = (name: string) =>
  /^(caret|arrow)/.test(name) && !(/left/.test(name) && /right/.test(name)) ? name.replace(/\b(left|right)\b/, (d) => (d === "left" ? "right" : "left")) : name;

export const Icon = ({ name, cls }: { name: string; cls?: string }) => {
  const rtl = useContext(Rtl);
  const n = rtl ? mirrorIcon(name) : name;
  return /^[a-z0-9-]+$/.test(n) ? <span className={`xi xi-${n}${cls ? ` ${cls}` : ""}`} aria-hidden="true" /> : <span className={`xi-ch${cls ? ` ${cls}` : ""}`} aria-hidden="true">{name}</span>;
};

const Art = ({ name, label }: { name: string; label?: string }) => {
  const svg = artSvg(name, label || undefined);
  return svg ? <span className="xm-art" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="xm-art is-missing">{name}</span>;
};

type Kid = { b: MockBlock; locale: Locale; cls: string; style: React.CSSProperties; text: string };
type Av = { text?: MockText; art?: string; icon?: string };
const initials = (s: string) => s.replace(/[\u2066\u2069]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const Avatar = ({ a, locale, size }: { a: Av; locale: Locale; size?: string }) => (
  <span className={`xm-av${size ? ` av-${size}` : ""}`}>
    {a.art ? <Art name={a.art} /> : a.icon ? <Icon name={a.icon} /> : <span>{initials(mt(a.text, locale))}</span>}
  </span>
);
const Kids = ({ blocks, locale }: { blocks?: MockBlock[]; locale: Locale }) => <>{(blocks ?? []).map((c, i) => <Block key={i} b={c} locale={locale} />)}</>;
const T = (v: unknown, locale: Locale) => mt(v as MockText, locale);
type Badge = { text?: MockText; tone?: string; icon?: string };
const BadgeEl = ({ x, locale }: { x: Badge; locale: Locale }) => <span className={`xm-badge t-${x.tone ?? "brand"}`}>{x.icon ? <Icon name={x.icon} /> : null}{T(x.text, locale)}</span>;

const NEW_KINDS: Record<string, (k: Kid) => ReactNode> = {
  icon: ({ b, cls, style }) => <div className={cls} style={style}><Icon name={String(b.icon ?? "circle")} /></div>,
  avatar: ({ b, locale, cls, style }) => <div className={cls} style={style}><Avatar a={{ text: b.text, art: b.art as string, icon: b.icon as string }} locale={locale} size={b.size} /></div>,
  listitem: ({ b, locale, cls, style, text }) => {
    const sw = b.swipe as { text?: MockText; tone?: string } | undefined;
    const lead = b.avatar ? <Avatar a={b.avatar as Av} locale={locale} /> : b.art ? <span className="li-thumb"><Art name={String(b.art)} /></span> : b.icon ? <span className="li-ic"><Icon name={String(b.icon)} /></span> : null;
    const trail = b.toggle !== undefined ? <span className={`sw${b.toggle ? " on" : ""}`} aria-hidden="true" />
      : b.badge ? <BadgeEl x={b.badge as Badge} locale={locale} />
      : b.check ? <Icon name="check" cls="li-check" />
      : null;
    const row = (
      <div className="li-row">
        {lead}
        <span className="li-main"><span className="li-t">{inline(text)}</span>{b.sub ? <span className="li-s">{inline(T(b.sub, locale))}</span> : null}</span>
        {b.value ? <span className="li-v">{inline(T(b.value, locale))}</span> : null}
        {trail}
        {b.chevron ? <Icon name="caret-right" cls="li-chev" /> : null}
      </div>
    );
    return <div className={cls + (sw ? " is-swiped" : "")} style={style}>{sw ? <><div className="li-slide">{row}</div><span className={`li-act t-${sw.tone ?? "bad"}`}>{T(sw.text, locale)}</span></> : row}</div>;
  },
  card: ({ b, locale, cls, style }) => <div className={cls} style={style}>{b.art ? <div className="card-art"><Art name={String(b.art)} label={T(b.alt, locale)} /></div> : null}<div className="card-in"><Kids blocks={b.blocks} locale={locale} /></div></div>,
  badge: ({ b, locale, cls, style }) => <div className={cls} style={style}><BadgeEl x={{ text: b.text, tone: b.tone, icon: b.icon as string }} locale={locale} /></div>,
  searchbar: ({ b, locale, cls, style, text }) => {
    const sug = (Array.isArray(b.suggest) ? b.suggest : []) as { icon?: string; text?: MockText; value?: MockText }[];
    return (
      <div className={cls} style={style}>
        <div className={`sb-box${b.focus ? " focus" : ""}`}><Icon name="magnifying-glass" /><span className={b.filled ? "filled" : "sb-ph"}>{text}{b.focus ? <i className="caret" /> : null}</span></div>
        {sug.length ? <div className="sb-sug">{sug.map((x, i) => <div key={i} className="sb-row"><Icon name={x.icon ?? "magnifying-glass"} /><span className="li-main">{inline(T(x.text, locale))}</span>{x.value ? <span className="li-v">{T(x.value, locale)}</span> : null}</div>)}</div> : null}
      </div>
    );
  },
  chat: ({ b, locale, cls, style, text }) => {
    const from = String(b.from ?? "them");
    const acts = (Array.isArray(b.actions) ? b.actions : []) as string[];
    const ICON: Record<string, string> = { copy: "copy", regenerate: "arrows-clockwise", like: "thumbs-up", dislike: "thumbs-down", share: "share-network" };
    return (
      <div className={`${cls} from-${from}`} style={style}>
        {from !== "me" ? <Avatar a={from === "ai" && !b.avatar ? { icon: "sparkle" } : ((b.avatar as Av) ?? { text: b.name as MockText })} locale={locale} size="s" /> : null}
        <div className="ch-col">
          {b.name ? <span className="ch-name">{T(b.name, locale)}</span> : null}
          <div className="ch-bub">{inline(text)}</div>
          {b.time || acts.length ? <span className="ch-meta">{acts.map((a) => <Icon key={a} name={ICON[a] ?? a} />)}{b.time ? <span>{T(b.time, locale)}</span> : null}</span> : null}
        </div>
      </div>
    );
  },
  composer: ({ cls, style, text }) => <div className={cls} style={style}><span className="cp-in">{text}</span><span className="cp-send"><Icon name="paper-plane-tilt" /></span></div>,
  price: ({ b, locale, cls, style, text }) => <div className={cls} style={style}><b>{text}</b>{b.per ? <span className="pr-per">{T(b.per, locale)}</span> : null}{b.was ? <s className="pr-was">{T(b.was, locale)}</s> : null}</div>,
  list: ({ b, locale, cls, style }) => {
    const items = (Array.isArray(b.items) ? b.items : []) as MockText[];
    const st = String(b.style ?? "bullet");
    const inner = items.map((x, i) => <li key={i}>{st === "check" ? <Icon name="check-circle" cls="lst-ck" /> : null}<span>{inline(T(x, locale))}</span></li>);
    return st === "number" ? <ol className={cls} style={style}>{inner}</ol> : <ul className={cls} style={style}>{inner}</ul>;
  },
  progress: ({ b, locale, cls, style }) => {
    const v = Math.max(0, Math.min(100, num(b.value) ?? 0));
    const label = b.label ? <span className="pg-l">{T(b.label, locale)}</span> : null;
    if (b.ring) return <div className={cls + " is-ring"} style={style}><span className="pg-ring" style={{ background: `conic-gradient(var(--mock-brand) ${v * 3.6}deg, var(--mock-line) 0)` }}><b>{v}%</b></span>{label}</div>;
    return <div className={cls} style={style}>{label}<span className="pg-bar"><i style={{ width: `${v}%` }} /></span></div>;
  },
  notification: ({ b, locale, cls, style, text }) => {
    const app = (b.app && typeof b.app === "object" ? b.app : null) as MockApp | null;
    return (
      <div className={cls} style={style}>
        <div className="nt-head"><span className="nt-ic" style={app ? { background: app.color } : undefined}><Icon name={app?.icon ?? "bell"} /></span><span className="nt-app">{app ? T(app.name, locale) : ""}</span><span className="nt-time">{T(b.time, locale)}</span></div>
        {b.title ? <div className="nt-t">{inline(T(b.title, locale))}</div> : null}
        {text ? <div className="nt-b">{inline(text)}</div> : null}
      </div>
    );
  },
  quote: ({ b, locale, cls, style, text }) => <div className={cls} style={style}><div className="qt-t">{inline(text)}</div>{b.name || b.time ? <div className="qt-m">{T(b.name, locale)}{b.time ? <span className="qt-time">{T(b.time, locale)}</span> : null}</div> : null}</div>,
  table: ({ b, locale, cls, style }) => {
    const head = (Array.isArray(b.head) ? b.head : []) as MockText[];
    const rows = (Array.isArray(b.rows) ? b.rows : []) as MockText[][];
    return <div className={cls} style={style}><table><thead><tr>{head.map((h, i) => <th key={i}>{T(h, locale)}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(T(c, locale))}</td>)}</tr>)}</tbody></table></div>;
  },
  accordion: ({ b, locale, cls, style, text }) => <div className={cls + (b.open ? " is-open" : "")} style={style}><div className="ac-h"><span>{inline(text)}</span><Icon name="caret-down" cls="ac-chev" /></div>{b.open ? <div className="ac-b"><Kids blocks={b.blocks} locale={locale} /></div> : null}</div>,
  tabs: ({ b, locale, cls, style }) => <div className={cls} style={style}>{(b.options ?? []).map((o, k) => <span key={k} className={`tb${k === (b.value ?? 0) ? " on" : ""}`}>{mt(o, locale)}</span>)}</div>,
  chart: ({ b, locale, cls, style }) => {
    const vals = (Array.isArray(b.values) ? b.values : []).map(Number);
    const labels = (Array.isArray(b.labels) ? b.labels : []) as MockText[];
    const max = Math.max(1, ...vals);
    const hi = num(b.highlight);
    if (b.type === "line") {
      const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * 100},${40 - (v / max) * 36}`).join(" ");
      return <div className={cls} style={style}><svg viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} fill="none" stroke="var(--mock-brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>{labels.length ? <div className="ct-l">{labels.map((l, i) => <span key={i}>{mt(l, locale)}</span>)}</div> : null}</div>;
    }
    return <div className={cls} style={style}><div className="ct-bars">{vals.map((v, i) => <span key={i} className={i === hi ? "on" : undefined} style={{ height: `${(v / max) * 100}%` }} />)}</div>{labels.length ? <div className="ct-l">{labels.map((l, i) => <span key={i}>{mt(l, locale)}</span>)}</div> : null}</div>;
  },
  seatmap: ({ b, cls, style }) => {
    const rows = num(b.rows) ?? 6, cols = num(b.cols) ?? 8, aisle = num(b.aisle);
    const has = (list: unknown, r: number, c: number) => Array.isArray(list) && list.some((x) => Array.isArray(x) && x[0] === r && x[1] === c);
    return <div className={cls} style={style}><div className="sm-screen" />{Array.from({ length: rows }, (_, r) => <div key={r} className="sm-row">{Array.from({ length: cols }, (_, c) => <Fragment key={c}>{aisle !== undefined && c === aisle ? <i className="sm-gap" /> : null}<i className={has(b.picked, r, c) ? "on" : has(b.taken, r, c) ? "off" : undefined} /></Fragment>)}</div>)}</div>;
  },
};

/** A dialog, bottom sheet, full-screen layer, toast or top banner drawn over the screen. Dialogs and sheets dim the screen unless `scrim: false`. */
function Overlay({ o, locale }: { o: MockOverlay; locale: Locale }) {
  const scrim = o.scrim ?? (o.type === "dialog" || o.type === "sheet" || o.type === "side" || o.type === "menu");
  return (
    <>
      {scrim ? <div className="scrim" aria-hidden="true" /> : null}
      <div className={`ov ov-${o.type}${o.tall ? " tall" : ""}`}>
        {o.type === "sheet" && o.handle !== false ? <div className="grab" aria-hidden="true" /> : null}
        {o.close ? <span className="ovx" aria-hidden="true"><Icon name="x" /></span> : null}
        {o.title ? <div className="ov-title">{mt(o.title, locale)}</div> : null}
        {o.blocks.map((c, i) => <Block key={i} b={c} locale={locale} />)}
      </div>
    </>
  );
}

/** Floating action buttons, stacked from the bottom corner; `text` makes an extended FAB. */
const Fabs = ({ fab, locale }: { fab: MockFab | MockFab[]; locale: Locale }) => (
  <>
    {([] as MockFab[]).concat(fab).map((x, i) => (
      <div key={i} className={`k-fab${x.text ? " ext" : ""}${i ? ` n${i + 1}` : ""}`} aria-hidden="true"><Icon name={x.icon || "plus"} />{x.text ? <b>{mt(x.text, locale)}</b> : null}</div>
    ))}
  </>
);

/** A tappable chrome part (an app bar action, a tab) in spot steps; plain otherwise. */
function Hit({ region, children, className }: { region?: string; children: ReactNode; className: string }) {
  const ctx = useContext(Regions);
  if (!ctx || !region || !ctx.labels[region]) return <span className={className}>{children}</span>;
  const state = ctx.state(region), picked = ctx.selected.includes(region);
  return <button type="button" data-region={region} className={`${className} lp-region region ${picked && !state ? "is-selected" : state}`} aria-pressed={picked} aria-label={ctx.labels[region]} disabled={ctx.locked} onClick={() => ctx.onPick(region)}>{children}</button>;
}
const Count = ({ n }: { n?: number }) => (n ? <span className="xm-count">{n > 99 ? "99+" : n}</span> : null);
const Action = ({ a, locale }: { a: MockAction; locale: Locale }) => (
  <Hit region={a.region} className="xm-act"><Icon name={a.icon} />{a.aria ? <span className="xm-sr">{mt(a.aria, locale)}</span> : null}<Count n={a.count} /></Hit>
);

const StatusBar = () => (
  <div className="xm-status" aria-hidden="true" dir="ltr"><b>9:41</b><span className="xm-st-r"><Icon name="cell-signal-full" /><Icon name="wifi-high" /><Icon name="battery-full" /></span></div>
);

function AppBar({ bar, app, locale }: { bar: MockAppbar; app?: MockApp; locale: Locale }) {
  return (
    <Hit region={bar.region} className={`xm-appbar${bar.large ? " is-large" : ""}`}>
      {bar.back ? <Icon name="caret-left" cls="xm-back" /> : null}
      {bar.logo && app ? <span className="xm-logo"><span className="xm-logo-ic"><Icon name={app.icon} /></span><b>{mt(app.name, locale)}</b></span> : !bar.large ? <b className="xm-title">{mt(bar.title, locale)}</b> : <span className="xm-title" />}
      <span className="xm-acts">{(bar.actions ?? []).map((a, i) => <Action key={i} a={a} locale={locale} />)}</span>
      {bar.large ? <b className="xm-big">{mt(bar.title, locale)}</b> : null}
    </Hit>
  );
}

const TabBar = ({ bar, locale }: { bar: NonNullable<Mock["tabbar"]>; locale: Locale }) => (
  <div className="xm-tabbar">{bar.items.map((t, i) => <Hit key={i} region={t.region} className={`xm-tab${i === (bar.active ?? 0) ? " on" : ""}`}><span className="xm-tab-ic"><Icon name={i === (bar.active ?? 0) && !t.icon.endsWith("-fill") ? `${t.icon}-fill` : t.icon} /><Count n={t.count} /></span>{t.text ? <span>{mt(t.text, locale)}</span> : t.aria ? <span className="xm-sr">{mt(t.aria, locale)}</span> : null}</Hit>)}</div>
);

const BrowserBar = ({ url }: { url: string }) => (
  <div className="xm-browser" aria-hidden="true"><span className="xm-dots"><i /><i /><i /></span><span className="xm-url" dir="ltr"><Icon name="lock-simple" />{url}</span></div>
);

function NavBar({ nav, app, locale }: { nav: MockNavbar; app?: MockApp; locale: Locale }) {
  return (
    <div className="xm-nav">
      {app ? <span className="xm-logo"><span className="xm-logo-ic"><Icon name={app.icon} /></span><b>{mt(app.name, locale)}</b></span> : null}
      <span className="xm-links">{(nav.links ?? []).map((l, i) => <span key={i} className={i === nav.active ? "on" : undefined}>{mt(l, locale)}</span>)}</span>
      {nav.search ? <span className="xm-nsearch"><Icon name="magnifying-glass" />{mt(nav.search, locale)}</span> : null}
      <span className="xm-acts">{(nav.actions ?? []).map((a, i) => <Action key={i} a={a} locale={locale} />)}</span>
    </div>
  );
}

const KEYS = { text: ["qwertyuiop", "asdfghjkl", "zxcvbnm"], number: ["123", "456", "789"] };
const Keyboard = ({ kind }: { kind: "text" | "number" }) => (
  <div className={`xm-kb kb-${kind}`} aria-hidden="true" dir="ltr">
    {KEYS[kind].map((r, i) => <div key={i} className="kb-r">{r.split("").map((k) => <i key={k}>{k}</i>)}</div>)}
    <div className="kb-r">{kind === "number" ? <><i className="w" /><i>0</i><i className="w">⌫</i></> : <><i className="w">123</i><i className="sp" /><i className="w">↵</i></>}</div>
  </div>
);

/** Readable text on a brand colour: white unless the colour is light. */
const rgbOf = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const lum = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const onColor = (hex: string) => { const rgb = rgbOf(hex); return rgb && lum(rgb) > 0.45 ? "#1D1D1F" : "#FFFFFF"; };
/** The product colour darkened until white text on it, and it as text on white, reach 4.5:1 (WCAG AA).
 *  Buttons, links, active tabs and other app-coloured parts use this; the label swatch and an explicit
 *  `color: brand` keep the exact product colour. */
const hexOf = (rgb: number[]) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
export const accessibleBrand = (hex: string, dark = false) => {
  let rgb = rgbOf(hex);
  if (!rgb) return hex;
  if (!dark) {
    for (let i = 0; i < 40 && 1.05 / (lum(rgb) + 0.05) < 4.6; i++) rgb = rgb.map((v) => Math.round(v * 0.94)) as [number, number, number];
  } else {
    // Dark screens (#121417): lighten until the colour reads as text on the background.
    for (let i = 0; i < 40 && (lum(rgb) + 0.05) / (0.0072 + 0.05) < 4.6; i++) rgb = rgb.map((v) => Math.round(v + (255 - v) * 0.08)) as [number, number, number];
  }
  return hexOf(rgb);
};
/** White or near-black text, whichever reads better on the colour. */
const bestOn = (hex: string) => { const rgb = rgbOf(hex); if (!rgb) return "#FFFFFF"; const l = lum(rgb); return 1.05 / (l + 0.05) >= (l + 0.05) / (0.0137 + 0.05) ? "#FFFFFF" : "#16181B"; };

/**
 * An example screen drawn from the content's mock: a phone, tablet or browser with the product's own chrome, never
 * mistaken for UXGate (the label above names the product and says "Example").
 */
export function MockView({ mock, locale, label, tag, chip, regions }: { mock: Mock; locale: Locale; label: string; tag: string; chip?: string; regions?: RegionCtx }) {
  void chip;
  const app = mock.app && typeof mock.app === "object" ? mock.app : mock.app ? { name: mock.app, color: "#5B3FD1", icon: "app-window" } : undefined;
  const frame = mock.frame ?? "phone";
  const wide = frame === "wide";
  const phoneLike = frame === "phone" || frame === "small" || frame === "tablet";
  const status = !wide && (mock.status ?? !!(app || mock.appbar || mock.tabbar || mock.screen));
  const blocks = mock.blocks.map((b, i) => <Block key={i} b={b} locale={locale} />);
  const screen: React.CSSProperties & Record<string, string | number> = {};
  if (mock.width) { screen.maxWidth = mock.width; screen.marginInline = "auto"; }
  if (mock.height) screen.minHeight = Number(mock.height);
  if (app) { const brand = accessibleBrand(app.color, mock.theme === "dark"); screen["--mock-brand"] = brand; screen["--mock-focus"] = brand; screen["--mock-on-brand"] = bestOn(brand); }
  const chrome = !!(status || mock.appbar || mock.tabbar || mock.footer || mock.navbar || wide || mock.keyboard);
  const cls = ["exmock", wide && "wide", mock.gray && "gray", mock.overlay && "has-ov", mock.fab && "has-fab", app && "has-app", chrome && "has-chrome", mock.theme === "dark" && "th-dark", mock.screen === "lock" && "is-lock"].filter(Boolean).join(" ");
  const caption = [app ? mt(app.name, locale) : null, tag, mock.caption ? mt(mock.caption, locale) : null].filter(Boolean).join(" · ");
  const url = mock.url ?? app?.domain ?? (wide && app ? `${String(app.id ?? "site")}.example` : undefined);
  const dir = mock.dir ?? (locale === "ar" ? "rtl" : "ltr");
  const body = (
    <Rtl.Provider value={dir === "rtl"}>
    <figure className={`xm xm-${frame}${chrome ? " xm-dev" : ""}`} role="group" aria-label={label} style={mock.width ? { maxWidth: Number(mock.width) + (phoneLike && chrome ? 12 : 0) } : undefined}>
      <figcaption className="xm-label" aria-hidden="true">{app ? <span className="xm-label-ic" style={{ background: app.color, color: onColor(app.color) }}><Icon name={app.icon} /></span> : null}<span>{caption}</span></figcaption>
      <div className="xm-shell">
        <div className={cls} dir={dir} style={screen}>
          {wide && url ? <BrowserBar url={url} /> : null}
          {status ? <StatusBar /> : null}
          {mock.navbar ? <NavBar nav={mock.navbar} app={app} locale={locale} /> : null}
          {mock.appbar ? <AppBar bar={mock.appbar} app={app} locale={locale} /> : null}
          {mock.screen === "lock" ? <div className="xm-lock" aria-hidden="true" dir="ltr"><b>9:41</b><span>{locale === "ar" ? "الخميس 5 نوفمبر" : "Thursday 5 November"}</span></div> : null}
          <div className="xm-body">{mock.blur ? <div style={{ filter: `blur(${mock.blur}px)` }} aria-hidden="true">{blocks}</div> : blocks}</div>
          {mock.footer ? <div className="xm-footer">{mock.footer.map((b, i) => <Block key={i} b={b} locale={locale} />)}</div> : null}
          {mock.tabbar ? <TabBar bar={mock.tabbar} locale={locale} /> : null}
          {mock.keyboard ? <Keyboard kind={mock.keyboard === "number" ? "number" : "text"} /> : null}
          {mock.fab ? <Fabs fab={mock.fab} locale={locale} /> : null}
          {mock.overlay ? <Overlay o={mock.overlay} locale={locale} /> : null}
        </div>
      </div>
      {mock.reader ? <div className="xm-reader"><Icon name="speaker-high" /><span>“{mt(mock.reader, locale)}”</span></div> : null}
    </figure>
    </Rtl.Provider>
  );
  return regions ? <Regions.Provider value={regions}>{body}</Regions.Provider> : body;
}
