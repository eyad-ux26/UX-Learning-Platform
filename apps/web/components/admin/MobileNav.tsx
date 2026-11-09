"use client";
// The admin menu on a phone (760 px and narrower), where the side menu is hidden: a menu button in the top bar opens the
// same menu as a drawer. It closes on X, Esc, a tap outside it, or when a link is followed.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { NavGroup } from "@/lib/admin/permissions";
import { Nav } from "./Nav";

export function MobileNav({ groups, counts }: { groups: NavGroup[]; counts: Record<string, { n: number; hot?: boolean }> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  useEffect(() => { ref.current?.close(); }, [path]);
  return (
    <>
      <button type="button" className="a-ibtn a-mnav-btn" aria-label="Open the admin menu" aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        <span className="i i-list s18" aria-hidden="true" />
      </button>
      <dialog
        ref={ref} className="a-drawer a-mnav" aria-label="Admin menu"
        onClick={(e) => { const t = e.target as HTMLElement; if (t === e.currentTarget || t.closest("a")) ref.current?.close(); }}
      >
        <div className="a-drw-h"><h2 className="t-h2 a-grow">Menu</h2><button type="button" className="a-btn sm icon ghost" aria-label="Close" onClick={() => ref.current?.close()}><span className="i i-x" aria-hidden="true" /></button></div>
        <Nav groups={groups} counts={counts} />
      </dialog>
    </>
  );
}
