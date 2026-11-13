"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validCertName } from "@/lib/cert-name";

/**
 * Turns a certificate's public page on or off (also done by Share on LinkedIn). Off by default; off takes the page down at once,
 * because the public route reads the flag on every request. Only the owner's own certificate changes.
 */
export async function setCertificatePublic(input: {
  pathId: string;
  on: boolean;
}): Promise<{ ok: boolean; changedAt?: string }> {
  const parsed = z.object({ pathId: z.string().min(1).max(40), on: z.boolean() }).safeParse(input);
  const { data } = await (await createClient()).auth.getUser();
  const userId = data.user?.id;
  if (!parsed.success || !userId) return { ok: false };
  const changedAt = new Date().toISOString();
  const { data: row, error } = await createAdminClient()
    .from("certificates")
    .update({ public: parsed.data.on, public_changed_at: changedAt })
    .eq("user_id", userId)
    .eq("path_id", parsed.data.pathId)
    .select("code")
    .maybeSingle();
  return { ok: !error && !!row, changedAt };
}

/**
 * The one-time name check before a first certificate: with a name, saves it as the display name too; without one, confirms the
 * current name. Either way the check is marked done, so it shows once per account.
 */
export async function confirmCertificateName(input: {
  name?: string;
}): Promise<{ ok: boolean; name?: string; error?: "length" }> {
  const { data } = await (await createClient()).auth.getUser();
  const userId = data.user?.id;
  if (!userId) return { ok: false };
  const patch: Record<string, string> = { name_confirmed_at: new Date().toISOString() };
  if (typeof input?.name === "string") {
    const n = input.name.trim();
    if (!validCertName(n)) return { ok: false, error: "length" };
    patch.display_name = n;
    patch.updated_at = patch.name_confirmed_at;
  }
  const { data: row, error } = await createAdminClient()
    .from("profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("display_name")
    .maybeSingle();
  return { ok: !error && !!row, name: (row?.display_name as string | undefined) ?? undefined };
}
