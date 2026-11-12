import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUILTIN_ROLES } from "../permissions";
import { INVITE_HOURS } from "../rules";

export type Member = {
  userId: string; email: string; name: string | null; status: "active" | "suspended"; founding: boolean; roles: string[];
  joinedAt: string; lastSignInAt: string | null; twoStep: "app" | "none"; invitedBy: string | null;
};
export type Invite = { id: string; email: string; roles: string[]; createdAt: string; expiresAt: string; invitedBy: string | null; bounce: { kind: string; detail: string | null; at: string } | null };
export type Role = { id: string; name: string; description: string; builtin: boolean; permissions: string[]; members: number };
export type Grant = { id: string; target: string; targetEmail: string; grantedBy: string; grantedByEmail: string; reason: string; createdAt: string; effectiveAt: string; status: string };

export async function listMembers(): Promise<Member[]> {
  const db = createAdminClient();
  const [{ data: m }, { data: r }] = await Promise.all([
    db.from("admin_members").select("user_id, email, display_name, status, founding, joined_at, last_sign_in_at, invited_by").order("founding", { ascending: false }).order("joined_at"),
    db.from("admin_member_roles").select("user_id, role_id"),
  ]);
  const roles = new Map<string, string[]>();
  for (const x of r ?? []) roles.set(x.user_id, [...(roles.get(x.user_id) ?? []), x.role_id]);
  const factors = await Promise.all((m ?? []).map(async (x) => {
    const { data } = await db.auth.admin.mfa.listFactors({ userId: x.user_id });
    return (data?.factors ?? []).some((f) => f.status === "verified") ? "app" as const : "none" as const;
  }));
  return (m ?? []).map((x, i) => ({
    userId: x.user_id, email: x.email, name: x.display_name, status: x.status, founding: x.founding, roles: (roles.get(x.user_id) ?? []).sort(),
    joinedAt: x.joined_at, lastSignInAt: x.last_sign_in_at, twoStep: factors[i], invitedBy: x.invited_by,
  }));
}


export async function listInvites(): Promise<Invite[]> {
  const db = createAdminClient();
  const { data } = await db.from("admin_invites").select("id, email, roles, created_at, expires_at, invited_by")
    .is("accepted_at", null).is("cancelled_at", null).order("created_at", { ascending: false });
  const rows = data ?? [];
  // Bounces from the Resend webhook (0066). Before 0066 runs the read fails and nothing is shown.
  const { data: b } = rows.length ? await db.from("email_bounces").select("email, kind, detail, at").in("email", rows.map((x) => x.email)).order("at", { ascending: false }) : { data: [] };
  return rows.map((x) => {
    // Each send gives the link INVITE_HOURS, so the last send was that long before it expires.
    const lastSent = new Date(x.expires_at).getTime() - INVITE_HOURS * 3_600_000;
    const hit = (b ?? []).find((e) => e.email === x.email && new Date(e.at).getTime() >= lastSent - 60_000);
    return { id: x.id, email: x.email, roles: x.roles, createdAt: x.created_at, expiresAt: x.expires_at, invitedBy: x.invited_by, bounce: hit ? { kind: hit.kind, detail: hit.detail, at: hit.at } : null };
  });
}

export async function listRoles(): Promise<Role[]> {
  const db = createAdminClient();
  const [{ data: roles }, { data: mr }] = await Promise.all([
    db.from("admin_roles").select("id, name, description, builtin, permissions"),
    db.from("admin_member_roles").select("role_id"),
  ]);
  const count = new Map<string, number>();
  for (const x of mr ?? []) count.set(x.role_id, (count.get(x.role_id) ?? 0) + 1);
  const order = (id: string) => { const i = BUILTIN_ROLES.findIndex((b) => b.id === id); return i < 0 ? 999 : i; };
  return (roles ?? []).map((x) => ({ ...x, members: count.get(x.id) ?? 0 })).sort((a, b) => order(a.id) - order(b.id) || a.name.localeCompare(b.name));
}

export async function listGrants(): Promise<Grant[]> {
  const db = createAdminClient();
  const { data } = await db.from("super_admin_grants").select("id, target, granted_by, reason, created_at, effective_at, status").order("created_at", { ascending: false }).limit(20);
  const { data: m } = await db.from("admin_members").select("user_id, email");
  const em = new Map((m ?? []).map((x) => [x.user_id, x.email]));
  return (data ?? []).map((g) => ({ id: g.id, target: g.target, targetEmail: em.get(g.target) ?? "a removed member", grantedBy: g.granted_by, grantedByEmail: em.get(g.granted_by) ?? "a removed member",
    reason: g.reason, createdAt: g.created_at, effectiveAt: g.effective_at, status: g.status }));
}

/** True when this member has a verified authenticator factor (needed before they can become a super admin). */
export async function hasTwoStep(userId: string): Promise<boolean> {
  const { data } = await createAdminClient().auth.admin.mfa.listFactors({ userId });
  return (data?.factors ?? []).some((f) => f.status === "verified");
}
