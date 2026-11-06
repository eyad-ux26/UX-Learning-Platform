/** The lesson tour runs once: for a guest once per browser, for a signed-in learner once per account on this browser. */
const keyOf = (kind: "guest" | "first", userId: string) => (kind === "guest" ? "ug-tour-guest" : `ug-tour:${userId}`);

export function tourSeen(kind: "guest" | "first", userId: string): boolean {
  try { return localStorage.getItem(keyOf(kind, userId)) === "1"; } catch { return true; } // no storage: never nag
}

export function markTourSeen(kind: "guest" | "first", userId: string) {
  try { localStorage.setItem(keyOf(kind, userId), "1"); } catch { /* ignore */ }
}

/** Settings > Help "Show the lesson tour again": the next lesson starts with the tour. */
export function resetTours(userId: string) {
  try { localStorage.removeItem(keyOf("guest", userId)); localStorage.removeItem(keyOf("first", userId)); } catch { /* ignore */ }
}
