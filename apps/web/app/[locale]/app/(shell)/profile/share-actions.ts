"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleBase } from "@/lib/certificate";

async function me() {
  const { data } = await (await createClient()).auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Turns the public achievement page on or off. Off by default; turning it off takes the page down at once
 * (the public route reads this flag on every request). The handle is made once, from the name, and kept.
 */
export async function setAchievementPage(input: { enabled: boolean }): Promise<{ ok: boolean; handle?: string | null }> {
  const parsed = z.object({ enabled: z.boolean() }).safeParse(input);
  const userId = await me();
  if (!parsed.success || !userId) return { ok: false };
  const db = createAdminClient();
  const { data: prof } = await db.from("profiles").select("handle, display_name").eq("user_id", userId).maybeSingle();
  if (!prof) return { ok: false };
  let handle = (prof.handle as string | null) ?? null;
  if (parsed.data.enabled && !handle) {
    const base = handleBase((prof.display_name as string | null) ?? "");
    for (let i = 0; i < 6 && !handle; i++) {
      const candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 30);
      const { error } = await db.from("profiles").update({ handle: candidate }).eq("user_id", userId).is("handle", null);
      if (!error) handle = candidate;
    }
    if (!handle) return { ok: false };
  }
  const { error } = await db.from("profiles").update({ share_enabled: parsed.data.enabled }).eq("user_id", userId);
  return { ok: !error, handle };
}

/** Joins the weekly leaderboard under a chosen name (only while the admin flag is on). Leaving keeps everything else. */
export async function joinLeaderboard(input: { name: string }): Promise<{ ok: boolean }> {
  const parsed = z.object({ name: z.string().trim().min(1).max(30) }).safeParse(input);
  const userId = await me();
  if (!parsed.success || !userId) return { ok: false };
  const db = createAdminClient();
  const { data: flag } = await db.from("app_flags").select("enabled").eq("key", "leaderboard").maybeSingle();
  if (!flag?.enabled) return { ok: false };
  const { error } = await db.from("profiles").update({ leaderboard_joined_at: new Date().toISOString(), leaderboard_name: parsed.data.name }).eq("user_id", userId);
  return { ok: !error };
}

export async function leaveLeaderboard(): Promise<{ ok: boolean }> {
  const userId = await me();
  if (!userId) return { ok: false };
  const { error } = await createAdminClient().from("profiles").update({ leaderboard_joined_at: null }).eq("user_id", userId);
  return { ok: !error };
}
