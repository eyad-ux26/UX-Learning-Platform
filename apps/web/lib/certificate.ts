// A path certificate exists when every skill of the path is Shown or Kept (spec 4.7). Pure, so pages, jobs and tests agree.
import { content as defaultBundle, type ContentIndex as Bundle } from "@uxgate/content";
import type { SkillStateName } from "./skill-state";

export type StateOf = (skillId: string) => SkillStateName | undefined;
export const isShown = (s: SkillStateName | undefined) => s === "shown" || s === "kept";

export function pathSkills(pathId: string, b: Bundle = defaultBundle) {
  return b.units.filter((u) => u.pathId === pathId).flatMap((u) => u.skills);
}
export function pathProgressCounts(pathId: string, stateOf: StateOf, b: Bundle = defaultBundle) {
  const skills = pathSkills(pathId, b);
  return { total: skills.length, shown: skills.filter((s) => isShown(stateOf(s.id))).length, kept: skills.filter((s) => stateOf(s.id) === "kept").length };
}
/** Shown and Kept across the given paths only (Profile counts the paths it shows, so a lesson opened from an unjoined path does not add to the totals). */
export function totalsAcross(pathIds: readonly string[], stateOf: StateOf, b: Bundle = defaultBundle) {
  const t = { shown: 0, kept: 0 };
  for (const id of new Set(pathIds)) { const c = pathProgressCounts(id, stateOf, b); t.shown += c.shown; t.kept += c.kept; }
  return t;
}
/** True only when the path has skills and all of them are Shown or Kept. */
export function certificateEarned(pathId: string, stateOf: StateOf, b: Bundle = defaultBundle): boolean {
  const c = pathProgressCounts(pathId, stateOf, b);
  return c.total > 0 && c.shown === c.total;
}

/** A public handle from a name: lowercase letters, digits and dashes, 3 to 30 characters, never empty. */
export function handleBase(name: string): string {
  const slug = name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 22);
  return slug.length >= 3 ? slug : "learner";
}
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;
