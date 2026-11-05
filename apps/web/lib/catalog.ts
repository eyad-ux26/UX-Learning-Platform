// The 14 paths a learner can see on the Paths tab (spec 4.4b). Names stay in English in both languages, as on the canvas.
// A path is playable when the content bundle has lessons for it; the others show as Coming soon and cannot be started.
import { content as defaultBundle, type ContentIndex as Bundle } from "@uxgate/content";

import { CATALOG, catalogEntry, type CatalogEntry } from "./catalog-list";

export { CATALOG, catalogEntry, pathArtUrl, type CatalogEntry } from "./catalog-list";

/** A path is playable when it has at least one lesson in the content content. */
export const isPlayable = (pathId: string, b: Bundle = defaultBundle) => b.units.some((u) => u.pathId === pathId && u.lessons.length > 0);

export type PathState = "current" | "joined" | "new" | "soon";
export type CatalogRow = CatalogEntry & { state: PathState; units: number };

/** All 14 paths with their state for one learner: current first, then joined, then ones they can start, then Coming soon. */
export function catalogFor(joined: ReadonlySet<string>, currentId: string | null, b: Bundle = defaultBundle): CatalogRow[] {
  const rank: Record<PathState, number> = { current: 0, joined: 1, new: 2, soon: 3 };
  return CATALOG.map((p, i): CatalogRow & { i: number } => {
    const playable = isPlayable(p.id, b);
    const state: PathState = !playable ? "soon" : p.id === currentId && joined.has(p.id) ? "current" : joined.has(p.id) ? "joined" : "new";
    return { ...p, state, units: b.units.filter((u) => u.pathId === p.id).length, i };
  }).sort((a, c) => rank[a.state] - rank[c.state] || a.i - c.i).map((r) => ({ id: r.id, name: r.name, art: r.art, kind: r.kind, sub: r.sub, state: r.state, units: r.units }));
}
