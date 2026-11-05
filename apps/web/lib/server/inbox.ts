import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InboxRow = { id: string; kind: string; data: Record<string, unknown>; href: string | null; read_at: string | null; created_at: string };

/** Newest first; the bell count is the unread ones (acceptance check 5: the count matches unread inbox items). */
export async function loadInbox(db: SupabaseClient | null, userId: string, limit = 50): Promise<InboxRow[]> {
  if (!db) return fixtureInbox();
  const { data } = await db.from("notifications").select("id, kind, data, href, read_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as InboxRow[];
}

export async function unreadCount(db: SupabaseClient | null, userId: string): Promise<number> {
  if (!db) return fixtureInbox().filter((r) => !r.read_at).length;
  const { count } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  return count ?? 0;
}

/** Made-up items for UG_DEV_FIXTURE screens (no database). */
function fixtureInbox(): InboxRow[] {
  const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  return [
    { id: "00000000-0000-4000-8000-000000000001", kind: "answer", data: { status: "accepted", xp: 10 }, href: "/app/requests", read_at: null, created_at: ago(2) },
    { id: "00000000-0000-4000-8000-000000000002", kind: "reminder", data: { lesson: { en: "Long lists: let people type", ar: "القوائم الطويلة: دع الناس يكتبون" }, minutes: 6, path: "Forms That Flow" }, href: "/app/lesson/P01-U01-L02", read_at: null, created_at: ago(3) },
    { id: "00000000-0000-4000-8000-000000000003", kind: "badge", data: { name: { en: "Cut fields you do not need", ar: "احذف الحقول غير اللازمة" } }, href: "/app/profile", read_at: null, created_at: ago(5) },
    { id: "00000000-0000-4000-8000-000000000004", kind: "review", data: { count: 5, minutes: 6 }, href: "/app", read_at: ago(20), created_at: ago(26) },
    { id: "00000000-0000-4000-8000-000000000005", kind: "goal", data: {}, href: "/app", read_at: ago(20), created_at: ago(30) },
  ];
}
