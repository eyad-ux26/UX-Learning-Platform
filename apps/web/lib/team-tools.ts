// Team testing tools (admins only): mark a path, or its first N units, as done; reset a path. Pure planning, so the
// server action (app/[locale]/app/(shell)/settings/team/actions.ts) only has to write the rows.
import { content as defaultContent, type ContentIndex } from "@uxgate/content";

export type TeamPlan = { lessonIds: string[]; skillIds: string[]; unitIds: string[] };

/** The lessons and skills of a path's units 1..throughUnit (all units when it is null), in play order. Empty for an unknown path. */
export function teamPlan(pathId: string, throughUnit: number | null = null, b: ContentIndex = defaultContent): TeamPlan {
  const units = b.units.filter((u) => u.pathId === pathId);
  const picked = throughUnit === null ? units : units.slice(0, Math.max(0, Math.min(units.length, throughUnit)));
  const lessonIds = picked.flatMap((u) => b.lessons.filter((l) => l.unitId === u.id).sort((a, c) => a.order - c.order).map((l) => l.lessonId));
  return { lessonIds, skillIds: picked.flatMap((u) => u.skills.map((s) => s.id)), unitIds: picked.map((u) => u.id) };
}

/** An attempt is kept as a "check" for the skill check of a unit, else a "lesson". */
export const attemptKind = (mode: string): "lesson" | "check" => (mode === "check" ? "check" : "lesson");
