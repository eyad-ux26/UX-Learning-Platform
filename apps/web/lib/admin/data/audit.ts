import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditRow = {
  id: number; at: string; actor_id: string | null; actor_email: string | null; actor_roles: string[]; action: string; area: string;
  target_type: string | null; target_id: string | null; target_label: string | null; before: unknown; after: unknown; reason: string | null;
  ip: string | null; user_agent: string | null; session_id: string | null;
};
export type AuditFilter = { actor?: string; action?: string; area?: string; targetType?: string; targetId?: string; from?: string; to?: string; session?: string };

export const PAGE = 50;

export async function auditPage(f: AuditFilter, areas: "all" | string[], page: number, limit = PAGE) {
  let q = createAdminClient().from("admin_audit").select("*", { count: page === 1 ? "estimated" : undefined }).order("id", { ascending: false });
  if (areas !== "all") q = q.in("area", areas.length ? areas : ["-"]);
  if (f.actor) q = /^[0-9a-f-]{36}$/.test(f.actor) ? q.eq("actor_id", f.actor) : q.ilike("actor_email", `%${f.actor}%`);
  if (f.action) q = q.like("action", `${f.action.replace(/[%_]/g, "")}%`);
  if (f.area) q = q.eq("area", f.area);
  if (f.targetType) q = q.eq("target_type", f.targetType);
  if (f.targetId) q = q.eq("target_id", f.targetId);
  if (f.session) q = q.eq("session_id", f.session);
  if (f.from) q = q.gte("at", f.from);
  if (f.to) q = q.lt("at", f.to);
  const { data, count, error } = await q.range((page - 1) * limit, page * limit);
  if (error) throw error;
  const rows = (data ?? []) as AuditRow[];
  return { rows: rows.slice(0, limit), more: rows.length > limit, total: count ?? null };
}

/** Where an audit entry's target opens in the panel. */
export function targetHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  switch (type) {
    case "learner": return `/admin/learners/${id}`;
    case "admin": return "/admin/team";
    case "invite": return "/admin/team";
    case "role": return "/admin/team/roles";
    case "payment": return `/admin/billing/payments/${id}`;
    case "subscription": return `/admin/billing/subscriptions?open=${id}`;
    case "refund_request": return `/admin/billing/refunds?open=${id}`;
    case "ticket": return `/admin/support/${id}`;
    case "certificate": return `/admin/certificates?q=${id}`;
    case "review_request": return `/admin/appeals/${id}`;
    case "discount": return "/admin/billing/discounts";
    default: return null;
  }
}
