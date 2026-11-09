"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex } from "@/lib/admin/tokens";

export type RateState = { ok: boolean; done?: boolean; error?: "gone" | "invalid" };
const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/** The one-question rating from the survey email (SUP-8). Only the token's hash is stored; one answer per ticket. */
export async function rate(_: RateState | null, f: FormData): Promise<RateState> {
  const token = String(f.get("token") ?? "");
  const v = f.get("v");
  if (!TOKEN.test(token) || (v !== "good" && v !== "bad")) return { ok: false, error: "invalid" };
  const comment = String(f.get("comment") ?? "").trim().slice(0, 1000) || null;
  const db = createAdminClient();
  const { data } = await db.from("support_tickets").update({ satisfaction: v, satisfaction_comment: comment, satisfaction_at: new Date().toISOString() })
    .eq("satisfaction_token_hash", await sha256Hex(token)).is("satisfaction_at", null).select("id");
  if (!data?.length) return { ok: false, error: "gone" };
  return { ok: true, done: true };
}
