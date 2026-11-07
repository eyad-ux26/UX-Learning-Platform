"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Turns a certificate's public page on or off (also done by Share on LinkedIn). Off by default; off takes the page down at once,
 * because the public route reads the flag on every request. Only the owner's own certificate changes.
 */
export async function setCertificatePublic(input: { pathId: string; on: boolean }): Promise<{ ok: boolean; changedAt?: string }> {
  const parsed = z.object({ pathId: z.string().min(1).max(40), on: z.boolean() }).safeParse(input);
  const { data } = await (await createClient()).auth.getUser();
  const userId = data.user?.id;
  if (!parsed.success || !userId) return { ok: false };
  const changedAt = new Date().toISOString();
  const { data: row, error } = await createAdminClient().from("certificates").update({ public: parsed.data.on, public_changed_at: changedAt }).eq("user_id", userId).eq("path_id", parsed.data.pathId).select("code").maybeSingle();
  return { ok: !error && !!row, changedAt };
}
