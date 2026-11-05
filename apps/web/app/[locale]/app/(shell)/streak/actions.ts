"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** The learner has seen the "A freeze kept your streak" note. Only their own event can be marked. */
export async function dismissFreezeNote(input: { id: string }): Promise<{ ok: boolean }> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return { ok: false };
  const { error } = await createAdminClient().from("freeze_events").update({ seen_at: new Date().toISOString() }).eq("id", parsed.data.id).eq("user_id", data.user.id).is("seen_at", null);
  return { ok: !error };
}
