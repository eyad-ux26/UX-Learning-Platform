// Sends queued answers to the server. Answers are already safe in IndexedDB; this only copies them,
// retrying with growing delays until the server confirms. Nothing is removed from the queue before then.
import { useSyncExternalStore } from "react";
import { queueAll, queueDel } from "./idb";
import type { QueuedAttempt } from "./attempts";

/** `failed`: the last send did not reach the server and a retry is waiting (offline, 5xx, 429). Answers in flight are only `pending`. */
type Status = { online: boolean; pending: number; signedOut: boolean; failed: boolean };
let status: Status = { online: true, pending: 0, signedOut: false, failed: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<Status>) => { status = { ...status, ...patch }; listeners.forEach((l) => l()); };

// Who is signed in on this device. Set by the lesson screen; items of any other learner stay in the queue untouched.
let currentUser: string | undefined;
export function setSyncUser(userId: string | undefined) { if (currentUser !== userId) { currentUser = userId; delay = 2000; void flush(); } }

// The server will never accept these answers (bad data, locked lesson, content it no longer has), so retrying is pointless.
const DROP = new Set([400, 403, 404, 409, 413, 422]);

let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let delay = 2000;
let current: Promise<void> | null = null;
let again = false; // a flush was asked for while one was running: run once more when it ends

/**
 * Sends what is queued. A call made while a send is running joins it: the promise ends only when that run, and the
 * extra run for answers queued meanwhile, are over (QA #264: "Start the mastery round" waits for the real save).
 */
export function flush(): Promise<void> {
  if (current) { again = true; return current; }
  current = (async () => { do { again = false; await sendOnce(); } while (again); })().finally(() => { current = null; });
  return current;
}

/** Waits for the queue to reach the server. True when nothing of this learner is left; false when offline or a send failed. */
export async function drain(): Promise<boolean> {
  await flush();
  return status.pending === 0;
}

/** How many answers of this learner are still waiting on this device. */
export async function queuedFor(userId: string): Promise<number> {
  return (await queueAll<QueuedAttempt>().catch(() => [] as QueuedAttempt[])).filter((i) => i.userId === userId).length;
}

async function sendOnce(): Promise<void> {
  if (!currentUser || currentUser === "guest") return; // not known yet: sending now could put one learner's answers on another account. Guest answers stay on the device until sign-up.
  const mine = (it: QueuedAttempt) => it.userId === currentUser;
  const items = (await queueAll<QueuedAttempt>().catch(() => [] as QueuedAttempt[])).filter(mine);
  set({ pending: items.length });
  if (!items.length) { delay = 2000; set({ failed: false }); return; }
  // A send (or a retry) is starting: while it runs the end page says "Saving…", not the offline note (QA #264 Low).
  // Only when the device says it is online: a timed retry while still offline keeps the note.
  if (typeof navigator === "undefined" || navigator.onLine !== false) set({ online: true, failed: false });
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
          attemptId, lessonId: first.lessonId, hash: first.hash, startedAt, ...(list[0].plan ? { plan: list[0].plan } : {}), ...(list.some((i) => i.purpose) ? { purpose: "review" } : {}),
          events: list.map(({ event: e }) => ({ stepId: e.stepId, tryNo: e.tryNo, kind: e.kind, answer: e.answer, hintsUsed: e.hintsUsed, confidence: e.confidence, clientTs: e.clientTs })),
        }),
      });
      if (res.ok) { await Promise.all(list.map((i) => queueDel(i.key))); set({ signedOut: false }); }
      else if (res.status === 401) { set({ signedOut: true }); failed = true; } // guest: keep for sign-up
      else if (DROP.has(res.status)) await Promise.all(list.map((i) => queueDel(i.key))); // never acceptable: stop retrying
      else failed = true; // 429, 5xx and anything unknown: try again later
    } catch { failed = true; set({ online: false }); }
  }
  const left = (await queueAll<QueuedAttempt>().catch(() => [] as QueuedAttempt[])).filter(mine);
  set({ pending: left.length });
  // Answers queued while this run was sending were not in its snapshot: send them now, not on the next retry.
  const seen = new Set(items.map((i) => i.key));
  if (left.some((i) => !seen.has(i.key))) again = true;
  set({ failed: failed && left.length > 0 });
  if (failed && left.length) { schedule(); again = false; } else delay = 2000;
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
const SERVER: Status = { online: true, pending: 0, signedOut: false, failed: false };
/** The current status, outside React (tests). */
export const syncStatusNow = (): Status => status;
export const useSyncStatus = () => useSyncExternalStore(subscribe, () => status, () => SERVER);
