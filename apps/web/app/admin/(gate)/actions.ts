"use server";

import { syncTeamTools } from "@/lib/admin/team-tools-sync";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { clientIp, ipHash } from "@/lib/server/ip-hash";
import { SIGNIN_PAUSE_SECONDS, SIGNIN_TRIES } from "@/lib/admin/rules";
import { sha256Hex } from "@/lib/admin/tokens";
import { getAdminState } from "@/lib/admin/guard";

export type GateResult = { ok: boolean; error?: string; url?: string; qr?: string; secret?: string; factorId?: string } | null;

/** Only admin pages may be a "go here after sign-in" target. */
const adminNext = (n: unknown) => (typeof n === "string" && /^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(n) ? n : "/admin");

async function buckets(email: string) {
  const h = await headers();
  const ip = (await ipHash(clientIp(h), "admin-signin")) ?? clientIp(h);
  return [`ip:${ip}`, `email:${email.toLowerCase()}`];
}

async function logFail(email: string, why: string) {
  // Only failed sign-ins to team accounts are logged, so the public cannot fill the audit log.
  const db = createAdminClient();
  const { data } = await db.from("admin_members").select("user_id").ilike("email", email).maybeSingle();
  if (!data) return;
  const h = await headers();
  await db.rpc("admin_log", { p_actor: null, p_action: "auth.sign_in_failed", p_area: "auth", p_target_type: "admin", p_target_id: data.user_id, p_target_label: email,
    p_before: null, p_after: null, p_reason: why, p_ip: clientIp(h), p_ua: (h.get("user-agent") ?? "").slice(0, 300), p_session: null });
}

const PAUSED = `Too many tries. Sign-in is paused for ${SIGNIN_PAUSE_SECONDS / 60} minutes.`;

export async function adminPasswordSignIn(_: GateResult, form: FormData): Promise<GateResult> {
  if (!hasServiceKey()) return { ok: false, error: "The admin panel is not set up on this host." };
  const p = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) }).safeParse({ email: form.get("email"), password: form.get("password") });
  if (!p.success) return { ok: false, error: "Enter your email and password." };
  const email = p.data.email.trim().toLowerCase();
  const db = createAdminClient();
  const b = await buckets(email);
  const { data: paused } = await db.rpc("admin_signin_paused", { p_buckets: b, p_limit: SIGNIN_TRIES, p_window_seconds: SIGNIN_PAUSE_SECONDS });
  if (paused) return { ok: false, error: PAUSED };
  const { error } = await (await createClient()).auth.signInWithPassword({ email, password: p.data.password });
  if (error) {
    const { data: still } = await db.rpc("admin_signin_fail", { p_buckets: b, p_limit: SIGNIN_TRIES, p_window_seconds: SIGNIN_PAUSE_SECONDS });
    await logFail(email, "Wrong email or password");
    return { ok: false, error: still === false ? PAUSED : "That email and password do not match." };
  }
  redirect(adminNext(form.get("next")));
}

export async function adminGoogleSignIn(_: GateResult, form: FormData): Promise<GateResult> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const next = adminNext(form.get("next"));
  const { data, error } = await (await createClient()).auth.signInWithOAuth({
    provider: "google", options: { redirectTo: `${proto}://${host}/api/auth/callback?locale=en&next=${encodeURIComponent(next)}`, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, error: "Google sign-in did not start. Try again." };
  redirect(data.url);
}

/** Starts authenticator-app setup: a new TOTP factor with its QR code. Old unfinished set-ups are removed first. */
export async function startTwoStep(): Promise<GateResult> {
  const s = await getAdminState();
  if (s.kind !== "two_step_setup") return { ok: false, error: "Two-step sign-in is already set up. Enter a code instead." };
  const db = await createClient();
  const { data: f } = await db.auth.mfa.listFactors();
  for (const x of f?.all ?? []) if (x.status !== "verified") await db.auth.mfa.unenroll({ factorId: x.id });
  const { data, error } = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: `UXGate admin ${new Date().toISOString().slice(0, 10)}`, issuer: "UXGate Admin" });
  if (error || !data) return { ok: false, error: "Could not start the set-up. Try again." };
  return { ok: true, qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id };
}

/** Checks a 6-digit code: finishes set-up (factorId given) or signs in with the verified factor. */
export async function verifyTwoStep(_: GateResult, form: FormData): Promise<GateResult> {
  const code = String(form.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6 digits from your authenticator app." };
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  const email = String(claims?.claims?.email ?? "");
  const b = await buckets(email || "unknown");
  const admin = createAdminClient();
  const { data: paused } = await admin.rpc("admin_signin_paused", { p_buckets: b, p_limit: SIGNIN_TRIES, p_window_seconds: SIGNIN_PAUSE_SECONDS });
  if (paused) return { ok: false, error: PAUSED };
  let factorId = String(form.get("factorId") ?? "");
  if (!factorId) {
    const { data: f } = await db.auth.mfa.listFactors();
    factorId = f?.totp?.find((x) => x.status === "verified")?.id ?? "";
  }
  if (!factorId) return { ok: false, error: "Set up two-step sign-in first." };
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    await admin.rpc("admin_signin_fail", { p_buckets: b, p_limit: SIGNIN_TRIES, p_window_seconds: SIGNIN_PAUSE_SECONDS });
    if (email) await logFail(email, "Wrong two-step code");
    return { ok: false, error: "That code did not work. Codes change every 30 seconds: try the newest one." };
  }
  redirect(adminNext(form.get("next")));
}

/** Accepts a team invite for the signed-in account, which must use the invited email. */
export async function acceptInvite(_: GateResult, form: FormData): Promise<GateResult> {
  const token = String(form.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return { ok: false, error: "This invite link is not complete." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return { ok: false, error: "Sign in first, with the email the invite was sent to." };
  if (!user.email_confirmed_at) return { ok: false, error: "Confirm your email address first (we sent you a link when you signed up)." };
  const h = await headers();
  const name = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").slice(0, 80) || null;
  const { error } = await createAdminClient().rpc("admin_accept_invite", {
    p_user: user.id, p_email: user.email, p_token_hash: await sha256Hex(token), p_name: name, p_ip: clientIp(h), p_ua: (h.get("user-agent") ?? "").slice(0, 300),
  });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("another email")) return { ok: false, error: `This invite is for another email. You are signed in as ${user.email}.` };
    if (m.includes("expired")) return { ok: false, error: "This invite has expired. Ask for a new one." };
    if (m.includes("already")) return { ok: false, error: "You are already on the team." };
    return { ok: false, error: "This invite is no longer valid. Ask for a new one." };
  }
  await syncTeamTools([user.id]);
  redirect("/admin/two-step");
}

export async function gateSignOut(): Promise<void> {
  await (await createClient()).auth.signOut({ scope: "local" });
  redirect("/admin/signin?out=1");
}
