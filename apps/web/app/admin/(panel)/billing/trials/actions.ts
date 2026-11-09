"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, check, run, who, type ActionResult } from "@/lib/admin/guard";
import { intFrom, reasonFrom, uuidFrom } from "@/lib/admin/form";

/** Support gives a learner a few more trial days (1 to 14 at a time, at most 60 in all), with a reason. */
export async function extendTrial(_: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    const ctx = await actionAdmin("trials.extend");
    const days = intFrom(f, "days", 1, 14, "the days")!;
    check(await createAdminClient().rpc("admin_extend_trial", { ...who(ctx), p_user: uuidFrom(f.get("user")), p_days: days, p_reason: reasonFrom(f) }));
  }, "Trial extended. The learner sees the new end date at once.");
}
