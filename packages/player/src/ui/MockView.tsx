import { createContext, useContext } from "react";
import type { Locale, Mock, MockBlock, MockText } from "@uxgate/content/types";

/** Spot steps make blocks with a `region` tappable. */
export type RegionCtx = { selected: string[]; state: (id: string) => "" | "is-right" | "is-wrong" | "is-dim"; labels: Record<string, string>; onPick: (id: string) => void; locked: boolean; rightWord: string; wrongWord: string };
const Regions = createContext<RegionCtx | null>(null);

export const mt = (v: MockText | undefined, locale: Locale): string => (v === undefined ? "" : typeof v === "string" ? v : v[locale]);

// Latin letters and digits mixed (codes, dates) keep left-to-right order inside right-to-left text.
const isolate = (s: string, locale: Locale) =>
  locale === "ar" && /[A-Za-z]/.test(s) && /\d/.test(s) ? <bdi dir="ltr">{s}</bdi> : s;

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

function Plain({ b, locale }: { b: MockBlock; locale: Locale }) {
  const cls = ["b", `k-${b.kind}`, b.size && `size-${b.size}`, b.emphasis && `em-${b.emphasis}`, b.tone && `tone-${b.tone}`, b.gap && `gap-${b.gap}`, b.color && `c-${b.color}`, b.weight && `w-${b.weight}`, b.style && `style-${String(b.style)}`, b.nowrap && "nowrap"].filter(Boolean).join(" ");
  const style: React.CSSProperties = {};
  if (b.px) { style.fontSize = b.px; style.lineHeight = 1.3; }
  if (b.height) { style.height = Number(b.height); style.overflow = "hidden"; }
  if (b.overlap) style.marginBlockStart = -30;
  const text = mt(b.text, locale);

  switch (b.kind) {
    case "group":
      return <div className={cls + (b.scroll ? " scroll" : "") + (b.sticky ? " sticky" : "")} style={style}>{b.blocks?.map((c, i) => <Block key={i} b={c} locale={locale} />)}</div>;
    case "row":
      return <div className={`row2 ${b.gap ? `gap-${b.gap}` : ""}`}>{b.blocks?.map((c, i) => <Block key={i} b={c} locale={locale} />)}</div>;
    case "field":
    case "select": {
      const hint = b.hint ? <div className="fh">{mt(b.hint, locale)}</div> : null;
      const looksLtr = /\d/.test(text) && /^[\s\d+\-()]+$/.test(text);
      return (
        <div className={cls} style={style}>
          {b.label ? <div className="fl">{mt(b.label, locale)}</div> : null}
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
      return <div className={cls} style={style}><span className={`mk${b.selected ? " on" : ""}`} aria-hidden="true" /><span>{text}</span></div>;
    case "toggle":
      return <div className={cls} style={style}><span>{text}</span><span className={`sw${b.selected ? " on" : ""}`} aria-hidden="true" /></div>;
    case "stepper":
      return <div className={cls} style={style}>{b.label ? <div className="fl">{mt(b.label, locale)}</div> : null}<div className="stp"><span aria-hidden="true">−</span><b>{text}</b><span aria-hidden="true">+</span></div></div>;
    case "segmented":
      return <div className={cls} style={style}>{(b.options ?? []).map((o, k) => <span key={k} className={`sg${k === (b.value ?? 0) ? " on" : ""}`}>{mt(o, locale)}</span>)}</div>;
    case "divider":
      return <div className={cls} style={style} />;
    default:
      return <div className={cls} style={style}>{isolate(text, locale)}{b.code ? <> <bdi dir="ltr">{b.code}</bdi></> : null}</div>;
  }
}

/** An example screen, drawn from the content's mock blocks, inside the design system's frame with an EXAMPLE tag so it is never mistaken for UXGate. */
export function MockView({ mock, locale, label, tag, chip, regions }: { mock: Mock; locale: Locale; label: string; tag: string; chip: string; regions?: RegionCtx }) {
  const blocks = mock.blocks.map((b, i) => <Block key={i} b={b} locale={locale} />);
  const body = (
    <div className="mock" role="group" aria-label={label}>
      <div className="mock-bar" aria-hidden="true"><span className="lbl">{chip}</span><span className="cap">{tag}{mock.caption ? ` · ${mock.caption[locale]}` : ""}</span><span className="dots"><i /><i /></span></div>
      <div className={`exmock${mock.frame === "wide" ? " wide" : ""}${mock.gray ? " gray" : ""}`} dir={mock.dir ?? (locale === "ar" ? "rtl" : "ltr")} style={mock.width ? { maxWidth: mock.width, marginInline: "auto" } : undefined}>
        {mock.blur ? <div style={{ filter: `blur(${mock.blur}px)` }} aria-hidden="true">{blocks}</div> : blocks}
      </div>
    </div>
  );
  return regions ? <Regions.Provider value={regions}>{body}</Regions.Provider> : body;
}
