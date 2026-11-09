/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";

export function GateCard({ title, sub, children, step }: { title: string; sub?: ReactNode; children: ReactNode; step?: string }) {
  return (
    <main className="a-gate">
      <div className="a-gate-card">
        <div className="a-row" style={{ gap: 8 }}>
          <img className="logo-light" src="/brand/logo.svg" alt="UXGate" style={{ height: 28 }} />
          <img className="logo-dark" src="/brand/logo-white.svg" alt="UXGate" style={{ height: 28 }} />
          <span className="a-tag-admin">Admin</span>
          <span className="a-grow" />
          {step ? <span className="t-xs ink-3">{step}</span> : null}
        </div>
        <div><h1 className="t-h1">{title}</h1>{sub ? <p className="t-sm ink-2" style={{ marginTop: 4 }}>{sub}</p> : null}</div>
        {children}
      </div>
    </main>
  );
}
