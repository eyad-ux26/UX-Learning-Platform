import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";

/**
 * Signing in during the 30 days after a delete request keeps the account: the removal date is cleared.
 * Returns true when a pending deletion was undone, so the app can say "Your account is kept".
 */
export async function restoreIfDeleting(userId: string): Promise<boolean> {
  if (!hasServiceKey()) return false;
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("delete_after").eq("user_id", userId).maybeSingle();
  if (!data?.delete_after) return false;
  const { error } = await db.from("profiles").update({ delete_after: null, delete_requested_at: null }).eq("user_id", userId);
  return !error;
}

/** Set for an hour after deleting, so the goodbye page can show the date and the (masked) address the email went to. */
export const BYE_COOKIE = "ug-bye";
