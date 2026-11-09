"use client";
// A small line chart for the dashboard: one y axis, 2px lines, a legend with totals, a crosshair tooltip on hover, and
// a table with the same numbers for keyboard and screen reader users. Series colours are the validated --s1 and --s2.
import { useState } from "react";

export type Series = { label: string; color: string; values: number[] };

const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
};

export function TrendChart({ days, series, unit, title }: { days: string[]; series: Series[]; unit: "usd" | "count"; title: string }) {
  const [h, setH] = useState(-1);
  const fmt = (v: number) => (unit === "usd" ? `$${Math.round(v / 100).toLocaleString("en-US")}` : v.toLocaleString("en-US"));
  const label = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const W = 700, H = 200, N = days.length;
  const x = (i: number) => (N > 1 ? (i / (N - 1)) * W : W / 2);
  const y = (v: number) => H - (v / max) * H;
  const path = (vs: number[]) => vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  let grid = "";
  for (let k = 0; k <= 4; k++) grid += `M0 ${H - (k * H) / 4} L${W} ${H - (k * H) / 4} `;
  const ticks = [4, 3, 2, 1, 0].map((k) => fmt((max * k) / 4));
  const xt = N > 1 ? [...new Set([0, Math.round((N - 1) / 4), Math.round((N - 1) / 2), Math.round((3 * (N - 1)) / 4), N - 1])] : [0];
  const pct = h < 0 || N < 2 ? 0 : (h / (N - 1)) * 100;
  return (
    <div className="a-stack" style={{ gap: 10 }}>
      <div className="a-row" style={{ gap: 16, flexWrap: "wrap" }}>
        {series.map((s) => (
          <span key={s.label} className="a-row t-sm" style={{ gap: 6 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: s.color }} aria-hidden="true" />
            <span className="w6">{s.label}</span><span className="ink-2 num">{fmt(s.values.reduce((a, b) => a + b, 0))}</span>
          </span>
        ))}
        <span className="a-grow" /><span className="t-xs ink-3">Last {N} days · daily</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div className="a-chart-y t-xs ink-3 num" aria-hidden="true">{ticks.map((t, i) => <span key={i}>{t}</span>)}</div>
        <div className="a-chart" style={{ flex: 1, minWidth: 0 }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${title}, last ${N} days. The table below has the numbers.`}>
            <path d={grid} stroke="var(--line)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
            {series.map((s) => <path key={s.label} d={path(s.values)} stroke={s.color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
          </svg>
          {h >= 0 ? (
            <>
              <div className="xh" style={{ left: `${pct}%` }} aria-hidden="true" />
              <div className="tip" style={pct > 70 ? { right: `${100 - pct}%`, marginRight: 8 } : { left: `${pct}%`, marginLeft: 8 }} aria-hidden="true">
                <p className="w7">{label(days[h]!)}</p>
                {series.map((s) => (
                  <p key={s.label} className="a-row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} /><span className="a-grow">{s.label}</span><b className="num">{fmt(s.values[h] ?? 0)}</b></p>
                ))}
              </div>
            </>
          ) : null}
          <div className="hits" onMouseLeave={() => setH(-1)}>{days.map((d, i) => <span key={d} onMouseEnter={() => setH(i)} />)}</div>
          <div className="x t-xs ink-3" aria-hidden="true">{xt.map((i) => <span key={i}>{label(days[i]!)}</span>)}</div>
        </div>
      </div>
      <details>
        <summary className="t-xs w6">Show as a table</summary>
        <div className="a-tbl-wrap" style={{ maxHeight: 280, overflow: "auto" }}><table className="a-tbl">
          <thead><tr><th scope="col">Day</th>{series.map((s) => <th key={s.label} scope="col" className="r">{s.label}</th>)}</tr></thead>
          <tbody>{days.map((d, i) => <tr key={d}><td>{label(d)}</td>{series.map((s) => <td key={s.label} className="r num">{fmt(s.values[i] ?? 0)}</td>)}</tr>)}</tbody>
        </table></div>
      </details>
    </div>
  );
}
