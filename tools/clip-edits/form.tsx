import React from "react";
import { D } from "../brand/theme";

/* Form, stepper, slider and date drawings for the P14 Unit 5 and 6 clips, in the example product's light palette.
 * Errors inside the product use a calm burnt orange, never alarm red. */

export const INK = "#1F2328";
export const MUTED = "#6B7280";
export const LINE = "#C4CAD3";
export const ERR = "#C2410C";

/** A label row: the label, and an optional note at the far end (such as "Optional" or "MM/YY"). */
export const FLabel: React.FC<{ text: string; note?: string; o?: number; fs?: number }> = ({ text, note, o = 1, fs = 19 }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: fs, fontWeight: 600, color: INK, opacity: o, marginBottom: 4 }}>
    <span>{text}</span>
    {note ? <span style={{ fontSize: fs - 2, fontWeight: 500, color: MUTED }}>{note}</span> : null}
  </div>
);

/** A text field box. `ph` is grey placeholder text, `value` is typed text; `err` turns the border orange and shows a message. */
export const FBox: React.FC<{ value?: string; ph?: string; h?: number; focus?: boolean; err?: boolean; ltr?: boolean; caret?: boolean; select?: boolean; fs?: number; w?: number | string }> = ({ value, ph, h = 42, focus, err, ltr, caret, select, fs = 19, w = "100%" }) => (
  <div dir={ltr ? "ltr" : undefined} style={{ width: w, height: h, borderRadius: 10, border: `${focus || err ? 2.5 : 1.5}px solid ${err ? ERR : focus ? D.brand : LINE}`, background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", boxSizing: "border-box", fontSize: fs, color: value ? INK : "#9AA1AB", fontWeight: value ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden" }}>
    <span>
      {value || ph || ""}
      {caret ? <span style={{ display: "inline-block", width: 2, height: fs + 2, background: D.brand, verticalAlign: "middle", marginInlineStart: 2 }} /> : null}
    </span>
    {select ? <span style={{ color: MUTED, fontSize: fs - 3 }}>▾</span> : null}
  </div>
);

/** Label + box (+ hint or error), as one block with a bottom gap. */
export const FField: React.FC<{ label?: string; note?: string; value?: string; ph?: string; hint?: string; error?: string; gap?: number; focus?: boolean; ltr?: boolean; caret?: boolean; select?: boolean; o?: number; labelGap?: number; h?: number }> = ({ label, note, value, ph, hint, error, gap = 12, focus, ltr, caret, select, o = 1, labelGap, h }) => (
  <div style={{ marginBottom: gap, opacity: o }}>
    {label ? (
      <div style={{ marginBottom: labelGap ?? 0 }}>
        <FLabel text={label} note={note} />
      </div>
    ) : null}
    <FBox value={value} ph={ph} focus={focus} err={!!error} ltr={ltr} caret={caret} select={select} h={h} />
    {hint ? <div style={{ fontSize: 17, color: MUTED, marginTop: 5 }}>{hint}</div> : null}
    {error ? <div style={{ fontSize: 17, color: ERR, fontWeight: 600, marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>⚠ {error}</div> : null}
  </div>
);

/** A section heading with a rule under it. */
export const FSection: React.FC<{ text: string; o?: number }> = ({ text, o = 1 }) => (
  <div style={{ fontSize: 20, fontWeight: 700, color: D.brand, borderBottom: `2px solid ${LINE}`, paddingBottom: 6, margin: "4px 0 12px", opacity: o }}>{text}</div>
);

/** Filled or plain button. */
export const FButton: React.FC<{ text: string; plain?: boolean; o?: number; h?: number; fs?: number; w?: number | string }> = ({ text, plain, o = 1, h = 50, fs = 20, w = "100%" }) => (
  <div style={{ width: w, height: h, borderRadius: 12, background: plain ? "transparent" : D.brand, color: plain ? D.brand : "#FFFFFF", border: plain ? `1.5px solid ${LINE}` : undefined, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, fontWeight: 700, opacity: o, boxSizing: "border-box" }}>{text}</div>
);

/** Stepper: − value +. `minOff`/`maxOff` grey a button out; `small` draws the hard-to-hit desktop arrows; `edit` shows the value as a typing box. */
export const Stepper: React.FC<{ value: string; minOff?: boolean; maxOff?: boolean; small?: boolean; edit?: boolean; press?: "minus" | "plus"; w?: number }> = ({ value, minOff, maxOff, small, edit, press, w = 190 }) => {
  if (small)
    return (
      <div dir="ltr" style={{ display: "inline-flex", alignItems: "stretch", height: 44, border: `1.5px solid ${LINE}`, borderRadius: 8, overflow: "hidden", background: "#FFF" }}>
        <div style={{ width: 90, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 20, color: INK }}>{value}</div>
        <div style={{ width: 22, display: "flex", flexDirection: "column", borderLeft: `1.5px solid ${LINE}` }}>
          {["▲", "▼"].map((a, i) => (
            <span key={a} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: MUTED, borderTop: i ? `1px solid ${LINE}` : undefined, background: press === (i ? "minus" : "plus") ? "#E5E7EB" : undefined }}>{a}</span>
          ))}
        </div>
      </div>
    );
  const btn = (t: string, off?: boolean, on?: boolean) => (
    <span style={{ width: 52, height: 52, borderRadius: 26, border: `2px solid ${off ? "#D9DDE3" : D.brand}`, color: off ? "#C4CAD3" : D.brand, background: on ? D.brandSoft : "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 600, flexShrink: 0 }}>{t}</span>
  );
  return (
    <div dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 10, width: w, justifyContent: "space-between" }}>
      {btn("−", minOff, press === "minus")}
      <span style={{ flex: 1, textAlign: "center", fontSize: 24, fontWeight: 700, color: INK, ...(edit ? { border: `2px solid ${D.brand}`, borderRadius: 10, padding: "6px 0" } : {}) }}>{value}</span>
      {btn("+", maxOff, press === "plus")}
    </div>
  );
};

/** A label on the start side and a control on the end side, in one row. */
export const Row: React.FC<{ label: string; sub?: string; children: React.ReactNode; gap?: number; o?: number }> = ({ label, sub, children, gap = 16, o = 1 }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: gap, opacity: o }}>
    <div>
      <div style={{ fontSize: 21, fontWeight: 600, color: INK }}>{label}</div>
      {sub ? <div style={{ fontSize: 17, color: MUTED }}>{sub}</div> : null}
    </div>
    {children}
  </div>
);

/** Slider track. `at` (0–1) is one handle, or `range` two handles. `bubble` shows `text` above the handle;
 *  `under` writes values below the track; `finger` covers the (last) handle with a fingertip; `thumbText` prints on the handle. */
export const Slider: React.FC<{ at?: number; range?: [number, number]; w?: number; bubble?: string[]; under?: string[]; finger?: boolean; fingerDy?: number; thumbText?: string; ends?: [string, string]; steps?: number; tint?: [string, string] }> = ({ at = 0.5, range, w = 440, bubble, under, finger, fingerDy = 0, thumbText, ends, steps, tint }) => {
  const ks = range ?? [at];
  const lo = range ? range[0] : 0, hi = range ? range[1] : at;
  return (
    <div dir="ltr" style={{ position: "relative", width: w, height: 110 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 52, height: 8, borderRadius: 4, background: tint ? `linear-gradient(90deg, ${tint[0]}, ${tint[1]})` : "#E1E4E8" }} />
      {tint ? null : <div style={{ position: "absolute", left: lo * w, width: (hi - lo) * w, top: 52, height: 8, borderRadius: 4, background: D.brand }} />}
      {steps ? Array.from({ length: steps }, (_, i) => <span key={i} style={{ position: "absolute", left: (i / (steps - 1)) * w - 3, top: 53, width: 6, height: 6, borderRadius: 3, background: "#FFFFFF", opacity: 0.9 }} />) : null}
      {ks.map((k, i) => (
        <React.Fragment key={i}>
          <span style={{ position: "absolute", left: k * w - (thumbText ? 30 : 16), top: thumbText ? 38 : 40, width: thumbText ? 60 : 32, height: thumbText ? 36 : 32, borderRadius: 18, background: "#FFF", border: `3px solid ${D.brand}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: INK, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>{thumbText ?? ""}</span>
          {bubble ? <span style={{ position: "absolute", left: k * w, top: 0, translate: "-50% 0", background: INK, color: "#FFF", borderRadius: 8, padding: "4px 10px", fontSize: 19, fontWeight: 700, whiteSpace: "nowrap" }}>{bubble[i]}</span> : null}
          {under ? <span style={{ position: "absolute", left: k * w, top: 80, translate: "-50% 0", fontSize: 19, fontWeight: 600, color: INK, whiteSpace: "nowrap" }}>{under[i]}</span> : null}
          {finger && i === ks.length - 1 ? <span style={{ position: "absolute", left: k * w - 22, top: 44 + fingerDy, width: 50, height: 74, borderRadius: "25px 25px 20px 20px", background: "rgba(222,168,128,0.96)", border: "1.5px solid rgba(150,98,62,0.55)" }} /> : null}
        </React.Fragment>
      ))}
      {ends ? (
        <>
          <span style={{ position: "absolute", left: 0, top: 80, fontSize: 18, color: MUTED }}>{ends[0]}</span>
          <span style={{ position: "absolute", right: 0, top: 80, fontSize: 18, color: MUTED }}>{ends[1]}</span>
        </>
      ) : null}
    </div>
  );
};

/** One month grid (week starts Sunday). Marks a range [from, to] or a single `pick`; `today` gets a ring. */
export const Month: React.FC<{ title: string; start: number; days: number; from?: number; to?: number; pick?: number; today?: number; cell?: number; fs?: number }> = ({ title, start, days, from = -1, to = -1, pick = -1, today = -1, cell = 34, fs = 17 }) => (
  <div dir="ltr" style={{ width: cell * 7 }}>
    <div style={{ textAlign: "center", fontSize: fs + 2, fontWeight: 700, color: INK, marginBottom: 6 }}>{title}</div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cell}px)`, rowGap: 2 }}>
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} style={{ textAlign: "center", fontSize: fs - 2, color: MUTED, fontWeight: 600, lineHeight: `${cell * 0.8}px` }}>{d}</span>)}
      {Array.from({ length: start }, (_, i) => <span key={`e${i}`} />)}
      {Array.from({ length: days }, (_, k) => {
        const d = k + 1, inR = from > 0 && d >= from && d <= to, end = d === from || d === to || d === pick;
        return (
          <span key={d} style={{ height: cell * 0.86, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, color: end ? "#FFF" : INK, fontWeight: end ? 700 : 500, background: end ? D.brand : inR ? D.brandSoft : undefined, borderRadius: end ? cell : 0, outline: d === today ? `2px solid ${D.brand}` : undefined, outlineOffset: -3 }}>{d}</span>
        );
      })}
    </div>
  </div>
);

/** Scrolling picker: columns of five values, the middle row chosen. */
export const Wheel: React.FC<{ cols: string[][]; w?: number }> = ({ cols, w = 70 }) => (
  <div dir="ltr" style={{ position: "relative", display: "inline-flex", gap: 8, background: "#F3F4F6", borderRadius: 14, padding: "6px 10px" }}>
    <div style={{ position: "absolute", left: 6, right: 6, top: 6 + 2 * 38, height: 38, borderRadius: 8, background: "#FFF", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    {cols.map((c, i) => (
      <div key={i} style={{ position: "relative", width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {c.map((t, k) => <span key={k} style={{ height: 38, display: "flex", alignItems: "center", fontSize: k === 2 ? 22 : 19, fontWeight: k === 2 ? 700 : 500, color: INK, opacity: k === 2 ? 1 : Math.abs(k - 2) === 1 ? 0.5 : 0.22 }}>{t}</span>)}
      </div>
    ))}
  </div>
);
