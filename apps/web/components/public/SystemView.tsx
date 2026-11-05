// 404, error, offline and maintenance: what happened, that progress is safe, and what to do next. Silent: no sounds here.
import type { ReactNode } from "react";
import { SysHeader } from "@/components/public/PublicChrome";

export type SystemViewProps = { ill: string; code: string; title: string; body: string; safe?: string; foot: string; children: ReactNode };

export function SystemView({ ill, code, title, body, safe, foot, children }: SystemViewProps) {
  return (
    <div className="s4-pub">
      <SysHeader />
      <main className="sys">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/ill/uxgate-ill-${ill}.png`} alt="" width={220} height={220} fetchPriority="high" />
        <span className="code ltr">{code}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        {safe ? <span className="safe"><span className="ph ph-cloud-check-fill" aria-hidden="true" />{safe}</span> : null}
        <div className="acts">{children}</div>
        <p className="t-small ink-3 pub-sys-foot">{foot} <a href="mailto:support@uxgate.org" className="ltr pub-link pub-strong">support@uxgate.org</a></p>
      </main>
    </div>
  );
}

/** Button classes of a system page action: full width on phones, side by side on desktop (see .sys .acts). */
export const sysBtn = (primary: boolean) => `btn ${primary ? "btn-primary" : "btn-secondary"} btn-lg press pub-sys-btn`;
