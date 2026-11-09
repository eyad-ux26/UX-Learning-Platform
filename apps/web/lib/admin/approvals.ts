import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminCtx } from "./guard";

export type Approval = {
  id: string; kind: string; permission: string; title: string; detail: Record<string, unknown>; target_type: string | null; target_id: string | null;
  reason: string; requested_by: string; created_at: string; status: string; decided_by: string | null; decided_at: string | null; note: string | null;
};

/** Approvals in three lists: waiting for me (I hold the permission and did not ask), asked by me, and decided. */
export async function approvalLists(ctx: AdminCtx) {
  const db = createAdminClient();
  const cols = "id, kind, permission, title, detail, target_type, target_id, reason, requested_by, created_at, status, decided_by, decided_at, note";
  const [waiting, mine, decided, members] = await Promise.all([
    db.from("admin_approvals").select(cols).eq("status", "waiting").in("permission", [...ctx.perms]).neq("requested_by", ctx.userId).order("created_at"),
    db.from("admin_approvals").select(cols).eq("requested_by", ctx.userId).order("created_at", { ascending: false }).limit(30),
    db.from("admin_approvals").select(cols).neq("status", "waiting").in("permission", [...ctx.perms]).order("decided_at", { ascending: false }).limit(30),
    db.from("admin_members").select("user_id, email, display_name"),
  ]);
  const names = new Map((members.data ?? []).map((m) => [m.user_id, m.display_name || m.email]));
  return { waiting: (waiting.data ?? []) as Approval[], mine: (mine.data ?? []) as Approval[], decided: (decided.data ?? []) as Approval[], names };
}
