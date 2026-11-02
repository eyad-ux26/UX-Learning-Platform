"use client";

import { useEffect } from "react";
import { queueAll, queueDel, queuePut } from "@/lib/idb";
import type { QueuedAttempt } from "@/lib/attempts";
import { kick, setSyncUser, startSync } from "@/lib/sync";

const FLAG = "ug-guest-handoff";
/** The "keep my result" choice is good for two hours; after that the guest answers are dropped, not handed to whoever signs in. */
export const HANDOFF_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * The sample lesson keeps its answers on the device under the "guest" user. When the learner chose "Sign up to keep your result"
 * and is now signed in, those answers move to their account and sync like any others. Without the flag nothing moves,
 * so a different person signing in on a shared device never inherits a guest's answers.
 */
export function GuestHandoff() {
  useEffect(() => {
    let flag: string | null = null;
    try { flag = localStorage.getItem(FLAG); } catch { return; }
    const age = Date.now() - Number(flag);
    if (!flag || !Number.isFinite(age) || age < 0 || age > HANDOFF_TTL_MS) {
      if (flag) {
        // Stale (or an old-format flag): forget the choice and the guest answers.
        try { localStorage.removeItem(FLAG); } catch { /* nothing to clean */ }
        queueAll<QueuedAttempt>().then((all) => Promise.all(all.filter((i) => i.userId === "guest").map((i) => queueDel(i.key)))).catch(() => {});
      }
      return;
    }
    (async () => {
      // The session is HttpOnly, so ask the server who is signed in.
      const id = ((await (await fetch("/api/auth/whoami", { cache: "no-store" })).json()) as { id: string | null }).id;
      if (!id) return; // not signed up yet: keep waiting
      const guest = (await queueAll<QueuedAttempt>().catch(() => [] as QueuedAttempt[])).filter((i) => i.userId === "guest");
      await Promise.all(guest.map((i) => queuePut({ ...i, userId: id } as { key: string })));
      try { localStorage.removeItem(FLAG); } catch { /* nothing to clean */ }
      setSyncUser(id); startSync(); kick();
    })().catch(() => {});
  }, []);
  return null;
}
