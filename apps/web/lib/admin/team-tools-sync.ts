import "server-only";
// TEAM-6: the team testing tools (and passing the Coming Soon gate to use them) come with the testing.tools permission.
// The learner app reads app_metadata from the session token without a database call, so after any change to a member's
// roles we write app_metadata.team_tools to match. It takes effect at the member's next token refresh (within an hour).
import { createAdminClient } from "@/lib/supabase/admin";

export async function syncTeamTools(userIds: string[]): Promise<void> {
  const db = createAdminClient();
  for (const id of [...new Set(userIds)]) {
    try {
      const [{ data: perms }, { data: u }] = await Promise.all([db.rpc("admin_perms", { p_user: id }), db.auth.admin.getUserById(id)]);
      if (!u?.user) continue;
      const on = ((perms ?? []) as string[]).includes("testing.tools");
      const meta = (u.user.app_metadata ?? {}) as Record<string, unknown>;
      if ((meta.team_tools === true) === on) continue;
      const next = { ...meta };
      if (on) next.team_tools = true;
      else delete next.team_tools;
      await db.auth.admin.updateUserById(id, { app_metadata: next });
    } catch (e) {
      console.error("admin team tools sync", id, (e as Error).message);
    }
  }
}

/** Every member who holds this role, for when the role's permissions change. */
export async function membersOfRole(roleId: string): Promise<string[]> {
  const { data } = await createAdminClient().from("admin_member_roles").select("user_id").eq("role_id", roleId);
  return (data ?? []).map((r) => r.user_id as string);
}
