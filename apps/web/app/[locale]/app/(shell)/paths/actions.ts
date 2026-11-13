"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlayable } from "@/lib/catalog";

const schema = z.object({ pathId: z.string().regex(/^P\d{2}$/) });

/**
 * Makes a path the learner's current path, joining it first if they have not. Progress on every other path stays as it is.
 * Runs as the learner (row-level security applies): they can only enrol themselves, and only in a published path.
 */
export async function chooseCurrentPath(input: { pathId: string }): Promise<{ ok: boolean; joined?: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success || !isPlayable(parsed.data.pathId)) return { ok: false };
  const pathId = parsed.data.pathId;
  const db = await createClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { ok: false };
  const userId = auth.user.id;

  const [{ data: mine }, { data: prof }] = await Promise.all([
    db.from("enrollments").select("path_id").eq("user_id", userId).eq("path_id", pathId).maybeSingle(),
    db.from("profiles").select("current_path_id").eq("user_id", userId).maybeSingle(),
  ]);
  const previous = (prof?.current_path_id as string | null) ?? null;
  const now = new Date().toISOString();
  const joined = !mine;
  if (joined) {
    const { error } = await db.from("enrollments").insert({ user_id: userId, path_id: pathId, last_active_at: now });
    if (error) return { ok: false };
  } else {
    await db.from("enrollments").update({ last_active_at: now }).eq("user_id", userId).eq("path_id", pathId);
  }
  if (previous !== pathId) {
    const { error } = await db
      .from("profiles")
      .update({ current_path_id: pathId, updated_at: now })
      .eq("user_id", userId);
    if (error) return { ok: false };
  }
  if (joined || previous !== pathId) {
    await createAdminClient()
      .from("path_events")
      .insert({
        user_id: userId,
        kind: joined ? "started" : "switched",
        path_id: pathId,
        from_path_id: previous && previous !== pathId ? previous : null,
      });
  }
  return { ok: true, joined };
}
