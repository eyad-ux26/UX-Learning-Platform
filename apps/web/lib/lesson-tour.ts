/** The lesson tour runs once: for a guest once per browser, for a signed-in learner once per account on this browser. */
type Kind = "guest" | "first";
const keyOf = (kind: Kind, userId: string) => (kind === "guest" ? "ug-tour-guest" : `ug-tour:${userId}`);
const replayKey = (userId: string) => `ug-tour-replay:${userId}`;

export function tourSeen(kind: Kind, userId: string): boolean {
  try { return localStorage.getItem(keyOf(kind, userId)) === "1"; } catch { return true; } // no storage: never nag
}

export function markTourSeen(kind: Kind, userId: string) {
  try { localStorage.setItem(keyOf(kind, userId), "1"); if (kind === "first") localStorage.removeItem(replayKey(userId)); } catch { /* ignore */ }
}

/** Settings > Help "Show the lesson tour again": the next lesson starts with the tour, even if the learner has finished lessons before. */
export function resetTours(userId: string) {
  try { localStorage.removeItem(keyOf("guest", userId)); localStorage.removeItem(keyOf("first", userId)); localStorage.setItem(replayKey(userId), "1"); } catch { /* ignore */ }
}

function replayAsked(userId: string): boolean {
  try { return localStorage.getItem(replayKey(userId)) === "1"; } catch { return false; }
}

/** Which tour this lesson starts with, if any. A replay counts on any lesson that is just starting, not only the first one. */
export function tourKind({ guest, firstLesson, userId, atStart }: { guest: boolean; firstLesson: boolean; userId: string; atStart: boolean }): Kind | undefined {
  if (guest) return atStart && !tourSeen("guest", userId) ? "guest" : undefined;
  if (replayAsked(userId)) return "first";
  return firstLesson && atStart && !tourSeen("first", userId) ? "first" : undefined;
}
