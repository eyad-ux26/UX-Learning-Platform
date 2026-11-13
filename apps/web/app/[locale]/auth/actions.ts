"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authErrorKey, isEmail, MIN_PASSWORD, type AuthErrorKey } from "@/lib/auth";
import { restoreIfDeleting } from "@/lib/server/account";
import { routing } from "@/i18n/routing";
import { comingSoonOn } from "@/lib/coming-soon";
import { requestOrigin } from "@/lib/server/origin";
import { emailSendAllowed, signInAllowed, signInFailed } from "@/lib/server/auth-limit";

// Sign-in, sign-up, Apple, Google, the email link and password reset run here, on the server, so the session cookies are
// set HttpOnly (see sessionCookieOptions). The browser never reads or writes a session token.

export type AuthNext = "app" | "sent-signup" | "sent-magic" | "sent-reset";
export type AuthError = AuthErrorKey | "needEmail" | "same" | "expired";
/** restored: signing in undid a pending account deletion, so the app shows "Your account is kept". */
export type AuthResult = { ok: true; next?: AuthNext; url?: string; restored?: boolean } | { ok: false; error: AuthError };

const locale = z.enum(routing.locales as unknown as [string, ...string[]]);
const creds = z.object({ email: z.string().max(254), password: z.string().max(200), locale });
const mail = z.object({ email: z.string().max(254), locale });

// The link in the email must come back to this site: the routed host only, never X-Forwarded-Host (lib/request-origin.ts).
async function callback(loc: string, next?: string) {
  return `${await requestOrigin()}/api/auth/callback?locale=${loc}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
}

export async function signUpAction(input: unknown): Promise<AuthResult> {
  // Coming Soon: no new email accounts before launch (the sign-up page shows Coming Soon; this stops direct calls).
  if (comingSoonOn()) return { ok: false, error: "generic" };
  const p = creds.safeParse(input);
  if (!p.success || !isEmail(p.data.email)) return { ok: false, error: "emailInvalid" };
  if (p.data.password.length < MIN_PASSWORD) return { ok: false, error: "weak" };
  if (!(await emailSendAllowed(p.data.email))) return { ok: false, error: "rate" };
  const { data, error } = await (await createClient()).auth.signUp({ email: p.data.email.trim(), password: p.data.password, options: { emailRedirectTo: await callback(p.data.locale), data: { locale: p.data.locale } } });
  if (error) return { ok: false, error: authErrorKey(error) };
  // With email confirmation on, an email that already has an account comes back as a user with no identities.
  if (data.user && !data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, error: "exists" };
  // With email confirmation on there is no session yet; the learner confirms from the email.
  return { ok: true, next: data.session ? "app" : "sent-signup" };
}

export async function signInAction(input: unknown): Promise<AuthResult> {
  const p = creds.safeParse(input);
  if (!p.success || !isEmail(p.data.email)) return { ok: false, error: "emailInvalid" };
  if (!p.data.password) return { ok: false, error: "invalid" };
  if (!(await signInAllowed(p.data.email))) return { ok: false, error: "rate" };
  const { data, error } = await (await createClient()).auth.signInWithPassword({ email: p.data.email.trim(), password: p.data.password });
  if (error) {
    const key = authErrorKey(error);
    if (key === "invalid") await signInFailed(p.data.email);
    return { ok: false, error: key };
  }
  // Signing in during the 30 days after a delete request keeps the account.
  const restored = data.user ? await restoreIfDeleting(data.user.id).catch(() => false) : false;
  return { ok: true, next: "app", restored };
}

export async function magicLinkAction(input: unknown): Promise<AuthResult> {
  const p = mail.safeParse(input);
  if (!p.success) return { ok: false, error: "needEmail" };
  if (!isEmail(p.data.email)) return { ok: false, error: p.data.email.trim() ? "emailInvalid" : "needEmail" };
  if (!(await emailSendAllowed(p.data.email))) return { ok: false, error: "rate" };
  const db = await createClient();
  const { error } = await db.auth.signInWithOtp({ email: p.data.email.trim(), options: { emailRedirectTo: await callback(p.data.locale), data: { locale: p.data.locale } } });
  if (error) return { ok: false, error: authErrorKey(error) };
  return { ok: true, next: "sent-magic" };
}

/** "Send again" on the check-your-email screen after sign-up. */
export async function resendSignupAction(input: unknown): Promise<AuthResult> {
  const p = mail.safeParse(input);
  if (!p.success || !isEmail(p.data.email)) return { ok: false, error: "emailInvalid" };
  if (!(await emailSendAllowed(p.data.email))) return { ok: false, error: "rate" };
  const { error } = await (await createClient()).auth.resend({ type: "signup", email: p.data.email.trim(), options: { emailRedirectTo: await callback(p.data.locale) } });
  if (error && authErrorKey(error) === "rate") return { ok: false, error: "rate" };
  return { ok: true, next: "sent-signup" };
}

/**
 * Sends the reset-password email. The answer is the same whether or not the email has an account (only a malformed
 * email or a rate limit is reported), so this page cannot be used to find out who has signed up.
 */
export async function forgotAction(input: unknown): Promise<AuthResult> {
  const p = mail.safeParse(input);
  if (!p.success) return { ok: false, error: "needEmail" };
  if (!isEmail(p.data.email)) return { ok: false, error: p.data.email.trim() ? "emailInvalid" : "needEmail" };
  if (!(await emailSendAllowed(p.data.email))) return { ok: false, error: "rate" };
  const { error } = await (await createClient()).auth.resetPasswordForEmail(p.data.email.trim(), { redirectTo: await callback(p.data.locale, "/reset") });
  if (error && authErrorKey(error) === "rate") return { ok: false, error: "rate" };
  return { ok: true, next: "sent-reset" };
}

/** Sets a new password for the learner signed in by the reset link. */
export async function resetPasswordAction(input: unknown): Promise<AuthResult> {
  const p = z.object({ password: z.string().max(200), locale }).safeParse(input);
  if (!p.success) return { ok: false, error: "generic" };
  if (p.data.password.length < MIN_PASSWORD) return { ok: false, error: "weak" };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "expired" };
  const { error } = await db.auth.updateUser({ password: p.data.password });
  if (error) return { ok: false, error: error.code === "same_password" ? "same" : authErrorKey(error) };
  return { ok: true, next: "app" };
}

/** Starts Apple or Google sign-in on the server (the PKCE verifier cookie is HttpOnly too) and hands back the address to go to. */
async function oauth(provider: "google" | "apple", input: unknown): Promise<AuthResult> {
  const p = z.object({ locale }).safeParse(input);
  if (!p.success) return { ok: false, error: "generic" };
  const { data, error } = await (await createClient()).auth.signInWithOAuth({ provider, options: { redirectTo: await callback(p.data.locale), skipBrowserRedirect: true } });
  if (error || !data.url) return { ok: false, error: error ? authErrorKey(error) : "generic" };
  return { ok: true, url: data.url };
}

export async function googleAction(input: unknown): Promise<AuthResult> {
  return oauth("google", input);
}

/** Sign in with Apple. The button shows only when NEXT_PUBLIC_APPLE_SIGNIN is "1" (Apple Developer and Supabase set up). */
export async function appleAction(input: unknown): Promise<AuthResult> {
  if (process.env.NEXT_PUBLIC_APPLE_SIGNIN !== "1") return { ok: false, error: "generic" };
  return oauth("apple", input);
}
