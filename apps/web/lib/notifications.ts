// Notification choices: which kinds reach the learner on which channel. Pure, so the server, the screen and the tests agree.
// Rules (spec §4.9, slice 4 design review): at most one reminder a day; billing email is always on; push only works where
// the device allows it; a goal-still-open message is a variant of the daily reminder, not a kind of its own.

export const KINDS = ["reminder", "review", "badge", "answer", "billing"] as const;
export const CHANNELS = ["in_app", "email", "push"] as const;
export type Kind = (typeof KINDS)[number];
export type Channel = (typeof CHANNELS)[number];
export type Prefs = Record<Kind, Record<Channel, boolean>>;

/** Defaults from the design (AccountPages `DEFAULTS`). */
export const DEFAULT_PREFS: Prefs = {
  reminder: { in_app: true, email: true, push: true },
  review: { in_app: true, email: false, push: true },
  badge: { in_app: true, email: true, push: false },
  answer: { in_app: true, email: true, push: true },
  billing: { in_app: true, email: true, push: false },
};

/** Cells that cannot be changed. */
export const isLocked = (kind: Kind, channel: Channel) => kind === "billing" && channel === "email";

/** Reads whatever is stored (possibly partial or stale) into a full set of choices. */
export function readPrefs(stored: unknown): Prefs {
  const src = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const out = {} as Prefs;
  for (const k of KINDS) {
    const row = (src[k] && typeof src[k] === "object" ? src[k] : {}) as Record<string, unknown>;
    out[k] = {} as Record<Channel, boolean>;
    for (const c of CHANNELS) out[k][c] = typeof row[c] === "boolean" ? (row[c] as boolean) : DEFAULT_PREFS[k][c];
    if (isLocked(k, "email")) out[k].email = true;
  }
  return out;
}

/** How many cells differ: the save bar counts these ("2 changes not saved"). */
export function countChanges(a: Prefs, b: Prefs): number {
  let n = 0;
  for (const k of KINDS) for (const c of CHANNELS) if (a[k][c] !== b[k][c]) n++;
  return n;
}

/** Inbox kinds map onto choice kinds; welcome and goal ride on the nearest choice. */
export type InboxKind = Kind | "goal" | "welcome";
export const prefKindOf = (k: InboxKind): Kind | null => (k === "goal" ? "reminder" : k === "welcome" ? null : k);

/** May this kind go out on this channel? Welcome always shows in the inbox. */
export function allowed(prefs: Prefs, kind: InboxKind, channel: Channel): boolean {
  const k = prefKindOf(kind);
  if (!k) return channel !== "push";
  if (isLocked(k, channel)) return true;
  return prefs[k][channel];
}

/**
 * What to store when the learner saves the Notifications screen: their choices for the screen's kinds, plus every other
 * key already stored (for example `news`, which only the link in campaign emails turns off). Saving the screen must never
 * undo an opt-out made somewhere else.
 */
export function prefsToStore(stored: unknown, prefs: Prefs): Record<string, unknown> {
  const keep = (stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}) as Record<string, unknown>;
  const screen = Object.fromEntries(KINDS.map((k) => [k, Object.fromEntries(CHANNELS.map((c) => [c, prefs[k][c]]))]));
  return { ...keep, ...screen };
}
