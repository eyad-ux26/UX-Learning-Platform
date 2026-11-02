"use client";

import { useEffect } from "react";
import { queueAll, queuePut } from "@/lib/idb";
import type { QueuedAttempt } from "@/lib/attempts";
import { createClient } from "@/lib/supabase/browser";
import { hasSupabase } from "@/lib/supabase/env";
import { kick, setSyncUser, startSync } from "@/lib/sync";

const FLAG = "ug-guest-handoff";

/**
 * The sample lesson keeps its answers on the device under the "guest" user. When the learner chose "Sign up to keep your result"
 * and is now signed in, those answers move to their account and sync like any others. Without the flag nothing moves,
 * so a different person signing in on a shared device never inherits a guest's answers.
 */
export function GuestHandoff() {
  useEffect(() => {
    let flag: string | null = null;
    try { flag = localStorage.getItem(FLAG); } catch { return; }
    if (flag !== "1" || !hasSupabase()) return;
    (async () => {
      const { data } = await createClient().auth.getUser();
      const id = data.user?.id;
      if (!id) return; // not signed up yet: keep waiting
      const guest = (await queueAll<QueuedAttempt>().catch(() => [] as QueuedAttempt[])).filter((i) => i.userId === "guest");
      await Promise.all(guest.map((i) => queuePut({ ...i, userId: id } as { key: string })));
      try { localStorage.removeItem(FLAG); } catch { /* nothing to clean */ }
      setSyncUser(id); startSync(); kick();
    })().catch(() => {});
  }, []);
  return null;
}
