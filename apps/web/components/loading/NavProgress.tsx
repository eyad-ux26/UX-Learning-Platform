"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { appPath, checkNavDone, shownAddress, startNavProgress, useNavProgress } from "@/lib/nav-progress";
import { Loader } from "./Loader";

/** The toolbar destinations, so the loading frame can carry the name of the screen being opened. */
function screenOf(to: string | null): "home" | "paths" | "review" | "profile" | null {
  if (!to) return null;
  if (to === "/app" || to.startsWith("/app/streak")) return "home";
  if (to.startsWith("/app/path") || to.startsWith("/app/skills")) return "paths";
  if (to.startsWith("/app/review")) return "review";
  if (/^\/app\/(profile|badges|certificate|board|settings|inbox)/.test(to)) return "profile";
  return null;
}

/** Links that open a page in this app (not a new tab, a file, an API route or another site). */
function pageLink(e: MouseEvent): HTMLAnchorElement | null {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.target && a.target !== "_self" || a.hasAttribute("download") || a.dataset.noProgress !== undefined) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith("/api/") || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return null;
  return a;
}

const SHOW_LAYER_AFTER = 400; // ms: the design system's rule for full-screen waits

/**
 * Feedback for every move between screens (tab switches included):
 * - at once: a thin progress line at the top, with a selection handle at its head, and the old screen dims;
 * - after 400 ms: a loading layer over the content area (the rail and toolbar stay usable) with the UXGate artboard loader.
 * Under reduced motion the line stands still at most of its length and the logo does not move.
 */
export function NavProgress() {
  const nav = useNavProgress();
  const pathname = usePathname();
  const search = useSearchParams();
  const t = useTranslations("nav");
  const bar = useRef<HTMLSpanElement>(null);
  const [finishing, setFinishing] = useState(false);
  const [layer, setLayer] = useState<React.CSSProperties | null>(null);
  const wasActive = useRef(false);

  // Start: link clicks (capture, so it runs even when a handler stops the event) and the browser's back/forward.
  useEffect(() => {
    const onClick = (e: MouseEvent) => { const a = pageLink(e); if (a) startNavProgress(a.href); };
    const onPop = () => { if (`${location.pathname}${location.search}` !== shownAddress()) startNavProgress(); }; // not for #hash moves
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("popstate", onPop); };
  }, []);

  // End: a screen rendered at a new address.
  useEffect(() => { checkNavDone(); }, [pathname, search]);

  // The old screen dims while the next one loads.
  useEffect(() => {
    const root = document.documentElement;
    if (nav.active) root.dataset.nav = "busy"; else delete root.dataset.nav;
    return () => { delete root.dataset.nav; };
  }, [nav.active]);

  // After 400 ms, cover the content area (main + side panel), never the rail or the phone toolbar.
  useEffect(() => {
    if (!nav.active) { setLayer(null); return; }
    const id = setTimeout(() => {
      const parts = [".shell-main", ".shell-panel"].map((s) => document.querySelector(s)?.getBoundingClientRect()).filter((r): r is DOMRect => !!r && r.width > 0);
      if (!parts.length) return setLayer({ inset: 0 });
      const left = Math.min(...parts.map((r) => r.left));
      const right = Math.max(...parts.map((r) => r.right));
      setLayer({ insetBlock: 0, left, width: right - left });
    }, SHOW_LAYER_AFTER);
    return () => clearTimeout(id);
  }, [nav.active, nav.id]);

  // Finish: the line runs to the end from wherever it is, then fades out.
  useLayoutEffect(() => {
    const el = bar.current;
    if (nav.active) { wasActive.current = true; setFinishing(false); return; }
    if (!wasActive.current || !el) return;
    wasActive.current = false;
    const now = getComputedStyle(el).inlineSize;
    el.style.animation = "none";
    el.style.inlineSize = now;
    void el.offsetWidth; // start the run to 100% from the current length
    el.style.transition = "inline-size 200ms ease-out";
    el.style.inlineSize = "100%";
    setFinishing(true);
    const id = setTimeout(() => setFinishing(false), 460);
    return () => clearTimeout(id);
  }, [nav.active, nav.id]);

  const screen = screenOf(nav.to ?? appPath(pathname));
  return (
    <>
      <div className={`nav-line${nav.active ? " is-on" : ""}${finishing ? " is-done" : ""}`} aria-hidden="true">
        <span ref={bar} key={nav.id} className="nav-line-bar" />
      </div>
      {nav.active && layer ? (
        <div className="nav-layer ug-in" style={layer}>
          <Loader name={screen ? t(screen) : undefined} />
        </div>
      ) : null}
    </>
  );
}
