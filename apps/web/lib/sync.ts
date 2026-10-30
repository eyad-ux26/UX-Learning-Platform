// Sends queued answers to the server. Answers are already safe in IndexedDB; this only copies them,
// retrying with growing delays until the server confirms. Nothing is removed from the queue before then.
import { useSyncExternalStore } from "react";
import { queueAll, queueDel } from "./idb";
import type { QueuedAttempt } from "./attempts";

type Status = { online: boolean; pending: number; signedOut: boolean };
let status: Status = { online: true, pending: 0, signedOut: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<Status>) => { status = { ...status, ...patch }; listeners.forEach((l) => l()); };

let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let delay = 2000;
let running = false;

export async function flush(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const items = await queueAll<QueuedAttempt>().catch(() => [] as QueuedAttempt[]);
    set({ pending: items.length });
    if (!items.length) { delay = 2000; return; }
    const groups = new Map<string, QueuedAttempt[]>();
    for (const it of items) groups.set(it.attemptId, [...(groups.get(it.attemptId) ?? []), it]);
    let failed = false;
    for (const [attemptId, list] of groups) {
      const first = list[0].event;
      const startedAt = Number(attemptId.split("@")[1]);
      try {
        const res = await fetch("/api/attempts", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            attemptId, lessonId: first.lessonId, hash: first.hash, startedAt,
            events: list.map(({ event: e }) => ({ stepId: e.stepId, tryNo: e.tryNo, kind: e.kind, answer: e.answer, hintsUsed: e.hintsUsed, confidence: e.confidence, clientTs: e.clientTs })),
          }),
        });
        if (res.ok) { await Promise.all(list.map((i) => queueDel(i.key))); set({ signedOut: false }); }
        else if (res.status === 401) { set({ signedOut: true }); failed = true; } // guest: keep for sign-up
        else if (res.status >= 500 || res.status === 429) failed = true;
        else failed = true; // 4xx other than auth: keep, a newer app version may accept it
      } catch { failed = true; set({ online: false }); }
    }
    const left = await queueAll().catch(() => []);
    set({ pending: left.length });
    if (failed && left.length) schedule(); else delay = 2000;
  } finally { running = false; }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => { void flush(); }, delay);
  delay = Math.min(delay * 2, 60000);
}

export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ online: navigator.onLine });
  window.addEventListener("online", () => { set({ online: true }); delay = 2000; void flush(); });
  window.addEventListener("offline", () => set({ online: false }));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void flush(); });
  void flush();
}

/** Call after queueing an answer. */
export function kick() { delay = 2000; void flush(); }

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const SERVER: Status = { online: true, pending: 0, signedOut: false };
export const useSyncStatus = () => useSyncExternalStore(subscribe, () => status, () => SERVER);
