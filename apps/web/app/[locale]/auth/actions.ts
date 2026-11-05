"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authErrorKey, isEmail, MIN_PASSWORD, type AuthErrorKey } from "@/lib/auth";
import { routing } from "@/i18n/routing";

// Sign-in, sign-up, Google and the email link run here, on the server, so the session cookies are set HttpOnly
// (see sessionCookieOptions). The browser never reads or writes a session token.

export type AuthResult = { ok: true; next?: "app" | "sent-signup" | "sent-magic"; url?: string } | { ok: false; error: AuthErrorKey | "needEmail" };

const locale = z.enum(routing.locales as unknown as [string, ...string[]]);
const creds = z.object({ email: z.string().max(254), password: z.string().max(200), locale });
const mail = z.object({ email: z.string().max(254), locale });

async function callback(loc: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/auth/callback?locale=${loc}`;
}

export async function signUpAction(input: unknown): Promise<AuthResult> {
  const p = creds.safeParse(input);
  if (!p.success || !isEmail(p.data.email)) return { ok: false, error: "emailInvalid" };
  if (p.data.password.length < MIN_PASSWORD) return { ok: false, error: "weak" };
  const { data, error } = await (await createClient()).auth.signUp({ email: p.data.email.trim(), password: p.data.password, options: { emailRedirectTo: await callback(p.data.locale), data: { locale: p.data.locale } } });
  if (error) return { ok: false, error: authErrorKey(error) };
  // With email confirmation on there is no session yet; the learner confirms from the email.
  return { ok: true, next: data.session ? "app" : "sent-signup" };
}

export async function signInAction(input: unknown): Promise<AuthResult> {
  const p = creds.safeParse(input);
  if (!p.success || !isEmail(p.data.email)) return { ok: false, error: "emailInvalid" };
  if (!p.data.password) return { ok: false, error: "invalid" };
  const { error } = await (await createClient()).auth.signInWithPassword({ email: p.data.email.trim(), password: p.data.password });
  if (error) return { ok: false, error: authErrorKey(error) };
  return { ok: true, next: "app" };
}

export async function magicLinkAction(input: unknown): Promise<AuthResult> {
  const p = mail.safeParse(input);
  if (!p.success) return { ok: false, error: "needEmail" };
  if (!isEmail(p.data.email)) return { ok: false, error: p.data.email.trim() ? "emailInvalid" : "needEmail" };
  const db = await createClient();
  const { error } = await db.auth.signInWithOtp({ email: p.data.email.trim(), options: { emailRedirectTo: await callback(p.data.locale), data: { locale: p.data.locale } } });
  if (error) return { ok: false, error: authErrorKey(error) };
  return { ok: true, next: "sent-magic" };
}

/** Starts Google sign-in on the server (the PKCE verifier cookie is HttpOnly too) and hands back the address to go to. */
export async function googleAction(input: unknown): Promise<AuthResult> {
  const p = z.object({ locale }).safeParse(input);
  if (!p.success) return { ok: false, error: "generic" };
  const { data, error } = await (await createClient()).auth.signInWithOAuth({ provider: "google", options: { redirectTo: await callback(p.data.locale), skipBrowserRedirect: true } });
  if (error || !data.url) return { ok: false, error: error ? authErrorKey(error) : "generic" };
  return { ok: true, url: data.url };
}
