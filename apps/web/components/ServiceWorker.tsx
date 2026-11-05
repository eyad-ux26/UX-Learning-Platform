"use client";

import { useEffect } from "react";

/** Registers /sw.js (push and the offline page) once the page has loaded. Not in development, where it would cache stale builds. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const go = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  }, []);
  return null;
}
