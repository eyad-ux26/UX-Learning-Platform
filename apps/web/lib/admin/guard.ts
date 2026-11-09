import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { clientIp } from "@/lib/server/ip-hash";
import { type Permission, type Perms } from "./permissions";
import { fixtureCtx } from "./fixture";
import { ADMIN_IDLE_SECONDS, ADMIN_TOTAL_SECONDS, REAUTH_SECONDS, freshTotp, type Amr } from "./rules";

// The admin panel's access check (requirements: "Security"). Every admin page and server action calls it: the menu only
// hides what a role cannot use, it never protects anything. Middleware is not used for access control.
//
// An admin is let in when all of these hold, in this order:
//   1. a signed-in UXGate account (password or Google; the learner sign-in);
//   2. an active row in admin_members (invited and accepted, not suspended);
//   3. two-step sign-in done in this session (Supabase MFA, aal2);
//   4. a panel session that is not ended, idle for 30 minutes or older than 12 hours (admin_sessions).
// Then the member's permissions come from their roles (admin_context), and each page or action checks the one it needs.

export type AdminCtx = {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  perms: Perms;
  founding: boolean;
  sessionId: string;
  ip: string;
  ua: string;
  /** Unix seconds of the last authenticator-app check in this session (two-step sign-in or a re-check). */
  totpAt: number | null;
  /** The panel touches production data unless UG_ENV says otherwise (one Supabase project serves every host). */
  env: "production" | "staging";
};

export type AdminState =
  | { kind: "signed_out" }
  | { kind: "no_access"; email: string }
  | { kind: "suspended"; email: string }
  | { kind: "two_step_setup"; email: string }
  | { kind: "two_step_verify"; email: string }
  | { kind: "expired"; email: string }
  | { kind: "not_configured" }
  | { kind: "ok"; ctx: AdminCtx };

type Claims = { sub?: string; email?: string; aal?: string; session_id?: string; amr?: Amr[] };

export const adminEnv = (): "production" | "staging" => (process.env.UG_ENV === "staging" ? "staging" : "production");

/** Where this request stands, cached per request so a page and its layout share one check. */
export const getAdminState = cache(async (): Promise<AdminState> => {
  if (process.env.UG_ADMIN_FIXTURE === "1" && process.env.NODE_ENV !== "production") return { kind: "ok", ctx: fixtureCtx() };
  if (!hasServiceKey()) return { kind: "not_configured" };
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  const c = (data?.claims ?? null) as Claims | null;
  if (!c?.sub) return { kind: "signed_out" };
  const email = (c.email ?? "").toLowerCase();
  const admin = createAdminClient();
  const { data: rows, error } = await admin.rpc("admin_context", { p_user: c.sub });
  if (error) {
    console.error("admin guard: context", error.code, error.message);
    return { kind: "no_access", email };
  }
  const m = (rows as { user_id: string; email: string; display_name: string | null; status: string; founding: boolean; roles: string[]; perms: string[] }[] | null)?.[0];
  if (!m) return { kind: "no_access", email };
  if (m.status !== "active") return { kind: "suspended", email };
  // Two-step sign-in: required for every admin account. Google or a password alone is not enough.
  if (c.aal !== "aal2") {
    const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    return aal?.nextLevel === "aal2" ? { kind: "two_step_verify", email } : { kind: "two_step_setup", email };
  }
  if (!c.session_id) return { kind: "expired", email };
  const h = await headers();
  const ip = clientIp(h);
  const ua = (h.get("user-agent") ?? "").slice(0, 300);
  const { data: touch, error: te } = await admin.rpc("admin_touch_session", {
    p_session: c.session_id, p_user: c.sub, p_ip: ip, p_ua: ua, p_idle_seconds: ADMIN_IDLE_SECONDS, p_total_seconds: ADMIN_TOTAL_SECONDS,
  });
  if (te) {
    console.error("admin guard: session", te.code, te.message);
    return { kind: "expired", email };
  }
  if (touch !== "ok") return { kind: "expired", email };
  const totp = (c.amr ?? []).filter((a) => a.method === "totp" || a.method === "mfa/totp").map((a) => a.timestamp);
  return {
    kind: "ok",
    ctx: {
      userId: c.sub, email: m.email, name: m.display_name || m.email.split("@")[0], roles: m.roles, perms: new Set(m.perms), founding: m.founding,
      sessionId: c.session_id, ip, ua, totpAt: totp.length ? Math.max(...totp) : null, env: adminEnv(),
    },
  };
});

/** For panel pages: the admin, or a redirect to the right sign-in step. Permission checks come after (see `allowed`). */
export async function requireAdmin(): Promise<AdminCtx> {
  const s = await getAdminState();
  if (s.kind === "ok") return s.ctx;
  redirect(gatePath(s));
}

export const gatePath = (s: AdminState): string => {
  switch (s.kind) {
    case "signed_out": return "/admin/signin";
    case "two_step_setup":
    case "two_step_verify": return "/admin/two-step";
    case "expired": return "/admin/signin?expired=1";
    case "no_access":
    case "suspended":
    case "not_configured": return "/admin/no-access";
    default: return "/admin";
  }
};

/** True when the admin has at least one of these permissions. */
export const allowed = (ctx: AdminCtx, ...need: Permission[]) => need.length === 0 || need.some((p) => ctx.perms.has(p));

export class AdminError extends Error {
  constructor(public code: "signed_out" | "forbidden" | "reauth" | "invalid" | "conflict" | "failed", message?: string) {
    super(message ?? code);
  }
}

/** For server actions: the admin with this permission, or an AdminError the action turns into a message. */
export async function actionAdmin(...need: Permission[]): Promise<AdminCtx> {
  const s = await getAdminState();
  if (s.kind !== "ok") throw new AdminError("signed_out", "Your admin session ended. Sign in again.");
  if (!allowed(s.ctx, ...need)) throw new AdminError("forbidden", "Your roles do not allow this.");
  return s.ctx;
}

/**
 * Risky actions (role changes, super admin grants, refunds over the limit, exports, deletes) need an authenticator code
 * from the last 10 minutes. A fresh code may come with the action itself; it is checked here and refreshes the session.
 */
export async function requireFresh(ctx: AdminCtx, code?: string | null): Promise<void> {
  if (process.env.UG_ADMIN_FIXTURE === "1" && process.env.NODE_ENV !== "production") return;
  if (freshTotp(ctx.totpAt, Date.now(), REAUTH_SECONDS)) return;
  const c = (code ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) throw new AdminError("reauth", "Enter the 6-digit code from your authenticator app to confirm.");
  const db = await createClient();
  const { data: f } = await db.auth.mfa.listFactors();
  const factor = f?.totp?.find((x) => x.status === "verified");
  if (!factor) throw new AdminError("reauth", "Set up two-step sign-in first.");
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId: factor.id, code: c });
  if (error) {
    await audit(ctx, "auth.reauth_failed", "auth", { type: "admin", id: ctx.userId, label: ctx.email });
    throw new AdminError("reauth", "That code did not work. Try the newest code.");
  }
}

export type Target = { type: string; id: string; label?: string | null };

/** One audit log entry for this admin's action. A failed write is logged loudly but does not undo the action. */
export async function audit(ctx: AdminCtx, action: string, area: string, target: Target | null, change: { before?: unknown; after?: unknown; reason?: string | null } = {}) {
  if (process.env.UG_ADMIN_FIXTURE === "1" && process.env.NODE_ENV !== "production") return;
  const { error } = await createAdminClient().rpc("admin_log", {
    p_actor: ctx.userId, p_action: action, p_area: area, p_target_type: target?.type ?? null, p_target_id: target?.id ?? null, p_target_label: target?.label ?? null,
    p_before: change.before ?? null, p_after: change.after ?? null, p_reason: change.reason ?? null, p_ip: ctx.ip, p_ua: ctx.ua, p_session: ctx.sessionId,
  });
  if (error) console.error(`ERROR admin audit write failed for ${action}`, error.code, error.message);
}

/** The arguments every admin_* database function takes to log who did it, from where. */
export const who = (ctx: AdminCtx) => ({ p_actor: ctx.userId, p_ip: ctx.ip, p_ua: ctx.ua, p_session: ctx.sessionId });

export type ActionResult = { ok: true; data?: unknown; message?: string } | { ok: false; error: string; reauth?: boolean };

/** Runs a server action body and turns AdminError and database refusals into a message for the form. */
export async function run(fn: () => Promise<unknown>, done?: string): Promise<ActionResult> {
  try {
    const data = await fn();
    return { ok: true, data: data ?? undefined, message: done };
  } catch (e) {
    if (e instanceof AdminError) return { ok: false, error: e.message, reauth: e.code === "reauth" };
    const err = e as { code?: string; message?: string };
    // Database guards (0044) answer 42501 with a sentence written for people.
    if (err?.code === "42501" || err?.code === "22023") return { ok: false, error: sentence(err.message ?? "Not allowed.") };
    console.error("admin action failed", err?.code, err?.message);
    return { ok: false, error: "Something went wrong. Nothing was changed. Try again." };
  }
}

const sentence = (m: string) => (m.charAt(0).toUpperCase() + m.slice(1)).replace(/([^.])$/, "$1.");

/** Throws a database error so `run` can show its message. */
export function check<T>(r: { data: T; error: { code?: string; message: string } | null }): T {
  if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code });
  return r.data;
}
