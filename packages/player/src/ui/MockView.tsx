import type { Locale, Mock, MockBlock, MockText } from "@uxgate/content/types";

export const mt = (v: MockText | undefined, locale: Locale): string => (v === undefined ? "" : typeof v === "string" ? v : v[locale]);

// Latin letters and digits mixed (codes, dates) keep left-to-right order inside right-to-left text.
const isolate = (s: string, locale: Locale) =>
  locale === "ar" && /[A-Za-z]/.test(s) && /\d/.test(s) ? <bdi dir="ltr">{s}</bdi> : s;

function Block({ b, locale }: { b: MockBlock; locale: Locale }) {
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
export function MockView({ mock, locale, label, tag }: { mock: Mock; locale: Locale; label: string; tag: string }) {
  const blocks = mock.blocks.map((b, i) => <Block key={i} b={b} locale={locale} />);
  return (
    <div className="mock" role="group" aria-label={label}>
      <div className="mock-bar" aria-hidden="true"><span className="lbl">{tag}</span></div>
      <div className={`exmock${mock.frame === "wide" ? " wide" : ""}${mock.gray ? " gray" : ""}`} dir={mock.dir ?? (locale === "ar" ? "rtl" : "ltr")} style={mock.width ? { maxWidth: mock.width, marginInline: "auto" } : undefined}>
        {mock.caption ? <div className="mcap">{mock.caption[locale]}</div> : null}
        {mock.blur ? <div style={{ filter: `blur(${mock.blur}px)` }} aria-hidden="true">{blocks}</div> : blocks}
      </div>
    </div>
  );
}
