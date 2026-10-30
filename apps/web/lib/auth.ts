// Small pure helpers for sign-in so they can be tested without a server.

/** Only same-site paths may be used as a "go here after sign-in" target. */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export type AuthErrorKey = "invalid" | "exists" | "weak" | "emailInvalid" | "rate" | "unconfirmed" | "generic";

/** Turns a Supabase auth error into one of our own messages, so the screen never shows raw English text in Arabic. */
export function authErrorKey(error: { code?: string; message?: string; status?: number } | null | undefined): AuthErrorKey {
  const code = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login")) return "invalid";
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered")) return "exists";
  if (code === "weak_password" || msg.includes("password should be")) return "weak";
  if (code === "email_address_invalid" || code === "validation_failed" || msg.includes("invalid email")) return "emailInvalid";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || error?.status === 429) return "rate";
  if (code === "email_not_confirmed") return "unconfirmed";
  return "generic";
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
export const MIN_PASSWORD = 8;
