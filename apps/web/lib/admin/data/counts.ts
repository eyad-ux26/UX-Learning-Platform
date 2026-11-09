import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminCtx } from "../guard";

export type NavCounts = Record<string, { n: number; hot?: boolean }>;

const n = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
  const { count, error } = await q;
  return error ? 0 : count ?? 0;
};

/** Waiting items for the menu and the bell. Each count is skipped when the member cannot open that page. */
export async function navCounts(ctx: AdminCtx): Promise<{ counts: NavCounts; bell: number }> {
  if (process.env.UG_ADMIN_FIXTURE === "1") return { counts: { inbox: { n: 12, hot: true }, appeals: { n: 3 }, refunds: { n: 4 }, mywork: { n: 2 } }, bell: 2 };
  const db = createAdminClient();
  const p = ctx.perms;
  const [inbox, breached, appeals, refunds, problems, approvals, mine] = await Promise.all([
    p.has("support.view") ? n(db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["new", "open", "waiting_team"])) : 0,
    p.has("support.view") ? n(db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["new", "open", "waiting_team"]).lt("first_reply_due", new Date().toISOString()).is("first_replied_at", null)) : 0,
    p.has("appeals.view") ? n(db.from("review_requests").select("id", { count: "exact", head: true }).eq("status", "open")) : 0,
    p.has("refunds.view") ? n(db.from("refund_requests").select("id", { count: "exact", head: true }).eq("status", "waiting")) : 0,
    p.has("problems.view") ? n(db.from("billing_events").select("id", { count: "exact", head: true }).not("error", "is", null).is("processed_at", null)) : 0,
    n(db.from("admin_approvals").select("id", { count: "exact", head: true }).eq("status", "waiting").in("permission", [...p]).neq("requested_by", ctx.userId)),
    p.has("support.view") ? n(db.from("support_tickets").select("id", { count: "exact", head: true }).eq("assignee_id", ctx.userId).in("status", ["new", "open", "waiting_team"])) : 0,
  ]);
  const counts: NavCounts = {
    inbox: { n: inbox, hot: breached > 0 }, appeals: { n: appeals }, refunds: { n: refunds }, problems: { n: problems, hot: problems > 0 },
    mywork: { n: approvals + mine },
  };
  return { counts, bell: approvals + breached };
}
