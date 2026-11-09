"use client";
// The top bar: global search (Ctrl or Command + K), the environment badge, the bell (approvals and SLA alerts waiting),
// help and the admin menu.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function TopBar({ name, roleLabel, initials, env, bell }: { name: string; roleLabel: string; initials: string; env: "production" | "staging"; bell: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); router.push("/admin/search"); }
      if (e.key === "Escape") setOpen(false);
    };
    const click = (e: MouseEvent) => { if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("keydown", key);
    window.addEventListener("click", click);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("click", click); };
  }, [router]);
  return (
    <header className="a-top">
      <Link className="a-search" href="/admin/search" aria-label="Search everything, Control K or Command K" aria-keyshortcuts="Control+K Meta+K">
        <span className="i i-magnifying-glass" aria-hidden="true" />
        <span className="ph-txt">Search learners, emails, payments, tickets, certificates…</span>
        <span className="a-kbd" aria-hidden="true">Ctrl</span><span className="a-kbd" aria-hidden="true">K</span>
      </Link>
      <div className="a-top-sp" />
      {env === "production"
        ? <span className="a-env" title="You are changing the live platform"><span className="dot" aria-hidden="true" />Production</span>
        : <span className="a-env staging" title="Test data only"><span className="dot" aria-hidden="true" />Staging</span>}
      <Link className="a-ibtn" href="/admin/my-work" aria-label={`My work, ${bell} waiting`}>
        <span className="i i-bell s18" aria-hidden="true" />
        {bell > 0 ? <span className="pip" aria-hidden="true">{bell > 99 ? "99+" : bell}</span> : null}
      </Link>
      <Link className="a-ibtn hide-phone" href="/admin/help" aria-label="Help"><span className="i i-question s18" aria-hidden="true" /></Link>
      <div className="a-rel" ref={menu}>
        <button className="a-me" type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Admin menu: ${name}, ${roleLabel}`} onClick={() => setOpen((o) => !o)}>
          <span className="a-av v1" aria-hidden="true">{initials}</span>
          <span className="tx" style={{ display: "flex", flexDirection: "column" }}><span className="nm">{name}</span><span className="rl">{roleLabel}</span></span>
          <span className="i i-caret-down s14 ink-3" aria-hidden="true" />
        </button>
        {open ? (
          <div className="a-pop a-menu" role="menu">
            <Link role="menuitem" href="/admin/account" onClick={() => setOpen(false)}><span className="i i-user-circle" aria-hidden="true" />My account and sessions</Link>
            <Link role="menuitem" href="/admin/my-work" onClick={() => setOpen(false)}><span className="i i-list-checks" aria-hidden="true" />My work</Link>
            <form action="/admin/signout" method="post"><button role="menuitem" type="submit"><span className="i i-sign-out" aria-hidden="true" />Sign out</button></form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
