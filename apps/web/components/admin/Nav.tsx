"use client";
/* eslint-disable @next/next/no-img-element */
// The admin menu: built on the server from the member's permissions (lib/admin/permissions.ts navFor), so a support agent
// sees a short menu and a super admin all of it. The current page wears the selection frame. Hiding items protects
// nothing: every page checks the permission again.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup } from "@/lib/admin/permissions";

export function Nav({ groups, counts }: { groups: NavGroup[]; counts: Record<string, { n: number; hot?: boolean }> }) {
  const path = usePathname() ?? "/admin";
  const current = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  return (
    <nav className="a-nav" aria-label="Admin">
      <Link className="a-nav-logo" href="/admin" aria-label="UXGate admin, go to dashboard">
        <img className="full logo-light" src="/brand/logo.svg" alt="UXGate" />
        <img className="full logo-dark" src="/brand/logo-white.svg" alt="UXGate" />
        <img className="mark" src="/brand/icon.svg" alt="UXGate" />
        <span className="a-tag-admin">Admin</span>
      </Link>
      {groups.map((g) => (
        <div key={g.label} style={{ display: "contents" }}>
          <p className="a-nav-h">{g.label}</p>
          {g.items.map((n) => {
            const c = counts[n.id];
            return (
              <Link key={n.id} className="a-nav-i" href={n.href} aria-current={current(n.href) ? "page" : undefined} title={n.label}>
                <span className={`i i-${n.icon}`} aria-hidden="true" />
                <span className="lbl">{n.label}</span>
                {n.phase2 ? <span className="a-count" title="Coming in Phase 2">P2</span> : null}
                {c && c.n > 0 ? <><span className={`a-count${c.hot ? " hot" : ""}`}>{c.n}<span className="sr"> waiting</span></span><span className="dotc" aria-hidden="true" /></> : null}
              </Link>
            );
          })}
        </div>
      ))}
      <div className="a-nav-foot">
        <Link className="a-nav-i" href="/admin/help" title="Help and shortcuts"><span className="i i-question" aria-hidden="true" /><span className="lbl">Help and shortcuts</span></Link>
      </div>
    </nav>
  );
}
