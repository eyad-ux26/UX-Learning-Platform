import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDay } from "@/lib/progress";
import { settle, shiftDay, WEEK_START, type DayActivity } from "@/lib/freeze";
import { learningRules } from "@/lib/app-config";

/**
 * Settles a learner's finished days: counts goal days, earns freezes, uses one for a missed day.
 * Safe to call as often as you like (every Home visit and the daily job do): it does nothing once yesterday is settled,
 * and two callers at once cannot both claim the same days. Never throws, because it must not break a page.
 */
/** supabase-js returns errors instead of throwing; this turns one into a throw so the catch below reports it. */
const must = <T extends { error: { message: string } | null }>(r: T): T => {
  if (r.error) throw new Error(r.error.message);
  return r;
};

/** `ok: false` carries what went wrong, so the daily job can warn instead of failing silently. */
export type SettleResult = { ok: true } | { ok: false; error: string };

export async function settleLearner(
  userId: string,
  timeZone: string | null,
  now = new Date(),
  weekStart: number = WEEK_START,
): Promise<SettleResult> {
  try {
    const db = createAdminClient();
    const yesterday = shiftDay(localDay(now, timeZone), -1);
    const { data: row } = must(
      await db
        .from("streaks")
        .select("current, longest, freezes_available, settled_through")
        .eq("user_id", userId)
        .maybeSingle(),
    );
    if (!row) return { ok: true };
    const through = row.settled_through as string | null;
    if (through && through >= yesterday) return { ok: true };

    // From the Monday before the first day to settle, so a week that began earlier still counts all its goal days.
    const first = through ? shiftDay(through, 1) : shiftDay(yesterday, -120);
    const since = shiftDay(first, -7);
    const { data: days } = must(
      await db.from("daily_activity").select("day, lessons_done, goal_met").eq("user_id", userId).gte("day", since),
    );
    const activity: Record<string, DayActivity> = {};
    for (const d of days ?? [])
      activity[d.day as string] = { lessons: d.lessons_done as number, goalMet: d.goal_met as boolean };

    const out = settle(
      { current: row.current, longest: row.longest, freezes: row.freezes_available },
      through,
      yesterday,
      activity,
      weekStart,
      await learningRules(),
    );

    // Events and frozen days first: they are keyed, so a second caller repeating them changes nothing.
    if (out.usedDays.length) {
      must(
        await db.from("daily_activity").upsert(
          out.usedDays.map((day) => ({ user_id: userId, day, lessons_done: 0, goal_met: false, freeze_used: true })),
          { onConflict: "user_id,day", ignoreDuplicates: true },
        ),
      );
      must(
        await db.from("freeze_events").upsert(
          out.usedDays.map((day) => ({ user_id: userId, kind: "used", day })),
          { onConflict: "user_id,kind,day", ignoreDuplicates: true },
        ),
      );
    }
    if (out.earnedDays.length)
      must(
        await db.from("freeze_events").upsert(
          out.earnedDays.map((day) => ({ user_id: userId, kind: "earned", day })),
          { onConflict: "user_id,kind,day", ignoreDuplicates: true },
        ),
      );

    // Claim the days: only the caller that still sees the old settled_through writes the new counts.
    const claim = db
      .from("streaks")
      .update({
        current: out.current,
        longest: out.longest,
        freezes_available: out.freezes,
        settled_through: out.settledThrough,
      })
      .eq("user_id", userId);
    must(await (through ? claim.eq("settled_through", through) : claim.is("settled_through", null)));
    return { ok: true };
  } catch (e) {
    // The page still loads; the next visit tries again.
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
