// Admin panel building blocks on the Phase 1 design system (app/admin/admin.css). Server-safe: no hooks.
import Link from "next/link";
import type { ReactNode } from "react";
import { fmtMoney, fmtTime, fmtUtc, toUsd } from "@/lib/admin/format";

export const I = ({ n, s, className = "" }: { n: string; s?: 12 | 14 | 18 | 20 | 24 | 32; className?: string }) => (
  <span className={`i i-${n}${s ? ` s${s}` : ""}${className ? ` ${className}` : ""}`} aria-hidden="true" />
);

export type Crumb = { href?: string; label: string };

export function PageHead({ crumbs = [], title, sub, actions }: { crumbs?: Crumb[]; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="a-ph">
      <div className="tt">
        <nav className="a-crumb" aria-label="Breadcrumb">
          <Link href="/admin">Admin</Link>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: "contents" }}>
              <span aria-hidden="true">/</span>
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className="t-h1">{title}</h1>
        {sub ? <p className="t-sm ink-2">{sub}</p> : null}
      </div>
      {actions ? <div className="acts">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, actions, children, label, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; label?: string; pad?: boolean }) {
  return (
    <section className="a-card" aria-label={label}>
      {title || actions ? (
        <div className="a-card-h">
          {title ? <h2 className="t-h3">{title}</h2> : null}
          <span className="a-grow" />
          {actions}
        </div>
      ) : null}
      {pad ? <div className="a-card-b">{children}</div> : children}
    </section>
  );
}

export type Tone = "good" | "info" | "wait" | "bad" | "off";
const TONE_ICON: Record<Tone, string> = { good: "check-circle-fill", info: "info", wait: "hourglass-medium", bad: "warning", off: "minus-circle" };

/** One status system: an icon and a word, never colour alone. */
export const St = ({ tone, icon, children }: { tone: Tone; icon?: string; children: ReactNode }) => (
  <span className={`a-st ${tone}`}><I n={icon ?? TONE_ICON[tone]} />{children}</span>
);

export const RoleChip = ({ id, name }: { id: string; name: string }) => (
  <span className={`a-role${id === "super_admin" ? " super" : ""}`}><I n={ROLE_ICON[id] ?? "user"} s={12} />{name}</span>
);
const ROLE_ICON: Record<string, string> = {
  super_admin: "crown-simple-fill", admin: "user-gear", support_lead: "tray", support_agent: "tray", billing_manager: "wallet",
  content_publisher: "rocket-launch", content_editor: "pencil-simple", instructor: "chalkboard-teacher", marketing: "megaphone", analyst: "chart-bar", viewer: "eye",
};

export function Empty({ icon = "tray", title, children, action, tone }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode; tone?: "bad" }) {
  return (
    <div className="a-empty">
      <span className="art" style={tone === "bad" ? { borderColor: "var(--bad-line)", color: "var(--bad-ink)" } : undefined}><I n={icon} s={20} /></span>
      <b style={{ color: "var(--ink)" }}>{title}</b>
      {children ? <span className="t-sm">{children}</span> : null}
      {action}
    </div>
  );
}

/** What a member sees on a page their roles do not open. The server sent nothing else. */
export function NoAccess({ what, roles }: { what: string; roles?: string }) {
  return (
    <main className="a-page">
      <div className="a-card"><Empty icon="lock-simple" title="You don’t have access">{what} needs {roles ?? "another role"}. Ask a super admin.</Empty></div>
    </main>
  );
}

export function Tabs({ label, items }: { label: string; items: { href: string; label: string; count?: number | string | null; current?: boolean }[] }) {
  return (
    <nav className="a-tabs" aria-label={label}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.current ? "page" : undefined} aria-selected={t.current ? "true" : "false"}>
          {t.label}{t.count !== undefined && t.count !== null ? <span className="a-count">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function KV({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="a-kv">
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: "contents" }}><dt>{k}</dt><dd>{v ?? <span className="ink-3">—</span>}</dd></div>
      ))}
    </dl>
  );
}

/** A time in Cairo time, with UTC on hover. */
export const When = ({ at, rel = false }: { at: string | Date | null | undefined; rel?: boolean }) =>
  at ? <time dateTime={new Date(at).toISOString()} title={fmtUtc(at)}>{fmtTime(at, rel)}</time> : <span className="ink-3">—</span>;

/** An amount in its own currency, with the USD value beside it when it is not dollars. */
export function Money({ minor, currency, usd = true }: { minor: number | null | undefined; currency: string | null | undefined; usd?: boolean }) {
  if (minor === null || minor === undefined || !currency) return <span className="ink-3">—</span>;
  const u = usd && currency !== "USD" ? toUsd(minor, currency) : null;
  return (
    <span className="num">
      {fmtMoney(minor, currency)}
      {u ? <span className="t-xs ink-3" title={`At the rate of ${u.rateDate}`}> · ≈ {fmtMoney(u.minor, "USD")}</span> : null}
    </span>
  );
}

export function Pager({ page, more, href, total }: { page: number; more: boolean; href: (p: number) => string; total?: number | null }) {
  return (
    <div className="a-pager">
      <span>{total !== undefined && total !== null ? `${total.toLocaleString("en")} in all · ` : ""}Page {page}</span>
      <span className="a-grow" />
      {page > 1 ? <Link className="a-btn sm" href={href(page - 1)}><I n="caret-left" />Previous</Link> : null}
      {more ? <Link className="a-btn sm" href={href(page + 1)}>Next<I n="caret-right" /></Link> : null}
    </div>
  );
}

export const Note = ({ icon = "info", children }: { icon?: string; children: ReactNode }) => (
  <div className="a-note"><I n={icon} /><div className="t-sm">{children}</div></div>
);

/** Learner-facing Arabic text: right to left, in Cairo. */
export const Ar = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`a-ar ${className}`} dir="rtl" lang="ar">{children}</p>
);

export const Id = ({ children }: { children: ReactNode }) => <span className="a-id">{children}</span>;
