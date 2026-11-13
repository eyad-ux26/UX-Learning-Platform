"use client";

import { useSyncExternalStore } from "react";

/**
 * Navigation progress, shared by the top progress line, the loading layer and the toolbars.
 * A navigation starts on a link click, browser back/forward, or a router.push/replace (see i18n/navigation.ts),
 * and ends as soon as the address changes. A safety timer ends it if the page never changes.
 */
export type NavState = {
  active: boolean;
  /** Where the learner is going, without the locale prefix ("/app/paths"), when known. */
  to: string | null;
  /** The address (path + query) the navigation started from. */
  from: string;
  /** Bumps on every start, so a second tap restarts the line. */
  id: number;
};

const IDLE: NavState = { active: false, to: null, from: "", id: 0 };
let state: NavState = IDLE;
let timer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

const here = () => `${location.pathname}${location.search}`;
/** The address of the screen on show. On back/forward the browser changes location before the new screen renders. */
let shown = "";
const LOCALE = /^\/(en|ar)(?=\/|$)/;

/** "/en/app/paths?x=1#y" → "/app/paths" */
export function appPath(pathname: string): string {
  return pathname.replace(LOCALE, "") || "/";
}

export function startNavProgress(href?: string | null) {
  if (typeof window === "undefined") return;
  let to: string | null = null;
  if (href) {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    if (`${url.pathname}${url.search}` === (shown || here())) return; // same page (or only the #hash changes): nothing to wait for
    to = appPath(url.pathname);
  }
  state = { active: true, to, from: shown || here(), id: state.id + 1 };
  clearTimeout(timer);
  timer = setTimeout(doneNavProgress, 12000);
  emit();
}

export function doneNavProgress() {
  clearTimeout(timer);
  if (!state.active) return;
  state = { ...IDLE, id: state.id };
  emit();
}

/** Called when a screen has rendered: ends the navigation once the address has moved on. */
export function checkNavDone() {
  shown = here();
  if (state.active && shown !== state.from) doneNavProgress();
}

export const shownAddress = () => shown;
export const navState = () => state;

function subscribe(f: () => void) {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}

export function useNavProgress(): NavState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}
