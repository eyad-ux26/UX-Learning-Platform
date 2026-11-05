import { Shell } from "@/components/app/Shell";
import { buildPathView, pickPath } from "@/lib/learning";
import type { Learner } from "@/lib/server/learner";

/**
 * The signed-in frame for the slice 4 screens. The one place that knows how Shell is called, so when slice 3's Shell
 * (which takes the learner) merges, only this file changes.
 */
export function AccountFrame({ me, locale, children }: { me: Learner; locale: string; children: React.ReactNode }) {
  const path = pickPath(me.currentPathId ?? me.recommendedPathId)!;
  const view = buildPathView(path.id, me.progress, me.practicedSkills)!;
  return (
    <Shell pathId={path.id} pathTitle={path.title.en} units={view.units.map((u) => ({ id: u.unit.id, title: u.unit.title[locale as "en" | "ar"] }))}>
      <div className="s4-page">{children}</div>
    </Shell>
  );
}
