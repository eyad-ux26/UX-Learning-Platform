"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z.string().trim().min(1).max(60),
  dailyGoal: z.number().int().min(1).max(3),
  reminder: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
});

export async function saveProfile(input: z.infer<typeof schema>): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return { ok: false };
  const { error } = await db.from("profiles").update({
    display_name: parsed.data.displayName, daily_goal: parsed.data.dailyGoal, reminder_time: parsed.data.reminder, updated_at: new Date().toISOString(),
  }).eq("user_id", data.user.id);
  return { ok: !error };
}

export async function signOut(): Promise<void> {
  await (await createClient()).auth.signOut();
}
