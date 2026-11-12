// Admin panel building blocks on the Phase 1 design system (app/admin/admin.css). Server-safe: no hooks.
import Link from "next/link";
import type { ReactNode } from "react";
import { fmtMoney, fmtTime, fmtUtc, toUsd } from "@/lib/admin/format";
import { maskEmail, maskName } from "@/lib/admin/mask";

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

const initialsOf = (s: string) => s.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const avTone = (s: string) => ["", " v2", " v3", " v4", " v5"][[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % 5];

/** A learner in a list: initials, masked name and email, linked to Learner 360. Full details are revealed there (logged). */
export function Who({ id, name, email, sub, link = true }: { id?: string | null; name?: string | null; email?: string | null; sub?: ReactNode; link?: boolean }) {
  const label = name ? maskName(name) : maskEmail(email) || "Unknown";
  const inner = (
    <span className="a-who">
      <span className={`a-av sm${avTone(label)}`} aria-hidden="true">{initialsOf(name || email || "?")}</span>
      <span style={{ minWidth: 0 }}><span className="n" style={{ display: "block" }}>{label}</span><span className="e" style={{ display: "block" }}>{sub ?? maskEmail(email)}</span></span>
    </span>
  );
  return link && id ? <Link href={`/admin/learners/${id}`} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link> : inner;
}

export function Kpi({ label, value, note, icon, href, alert, tone }: { label: string; value: ReactNode; note?: ReactNode; icon?: string; href?: string; alert?: boolean; tone?: "up" | "down" | "flat" }) {
  const body = (
    <>
      <span className="k">{icon ? <I n={icon} /> : null}{label}</span>
      <span className="t-big num">{value}</span>
      {note ? <span className={`d ${tone ?? "flat"}`}>{note}</span> : null}
    </>
  );
  return href ? <Link className={`a-kpi${alert ? " alert" : ""}`} href={href}>{body}</Link> : <div className={`a-kpi${alert ? " alert" : ""}`}>{body}</div>;
}

/** A search and filter bar that submits as a plain GET form, so every filtered list has its own link. */
export function Filters({ action, q, placeholder, selects = [], hidden = {} }: {
  action: string; q?: string; placeholder?: string; hidden?: Record<string, string>;
  selects?: { name: string; label: string; value?: string; options: [string, string][]; empty?: string }[];
}) {
  return (
    <form method="get" action={action} className="a-toolbar" role="search">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {placeholder ? (
        <label className="a-row" style={{ flex: "1 1 260px", gap: 6 }}>
          <span className="sr">Search</span>
          <input className="a-in" name="q" defaultValue={q} placeholder={placeholder} style={{ flex: 1 }} />
        </label>
      ) : null}
      {selects.map((s) => (
        <label key={s.name} className="a-row t-sm" style={{ gap: 6 }}>
          <span className="ink-2">{s.label}</span>
          <select className="a-in" name={s.name} defaultValue={s.value ?? ""} style={{ height: 32, width: "auto" }}>
            <option value="">{s.empty ?? "All"}</option>
            {s.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      ))}
      <button type="submit" className="a-btn sm"><I n="magnifying-glass" />Apply</button>
    </form>
  );
}

/** Builds a link to the same list with some query values changed. */
export const withQuery = (path: string, base: Record<string, string | undefined>, change: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...change })) if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
  const s = p.toString();
  return s ? `${path}?${s}` : path;
};
