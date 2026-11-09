import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** The status of each approval request, by id (waiting, approved, declined, cancelled, failed). */
export async function approvalStates(ids: (string | null)[]): Promise<Map<string, string>> {
  const list = [...new Set(ids.filter(Boolean) as string[])];
  if (!list.length) return new Map();
  const { data } = await createAdminClient().from("admin_approvals").select("id, status").in("id", list);
  return new Map((data ?? []).map((a) => [a.id as string, a.status as string]));
}
