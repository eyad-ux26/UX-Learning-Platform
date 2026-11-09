// Admin panel rules that do not need a server, so they are tested on their own (rules.test.ts).

/** Panel sessions end after 30 minutes idle or 12 hours in total (admin_touch_session). */
export const ADMIN_IDLE_SECONDS = 30 * 60;
export const ADMIN_TOTAL_SECONDS = 12 * 60 * 60;
/** Risky actions need an authenticator code from the last 10 minutes. */
export const REAUTH_SECONDS = 10 * 60;
/** View as learner ends after 30 minutes (Admins' answer 7, 9 Nov 2026). */
export const VIEW_AS_SECONDS = 30 * 60;
/** Unanswered approvals remind the approvers after 4 hours. */
export const APPROVAL_REMIND_SECONDS = 4 * 60 * 60;
/** Too many failed admin sign-ins pause sign-in for 15 minutes: 5 tries per address in that time. */
export const SIGNIN_TRIES = 5;
export const SIGNIN_PAUSE_SECONDS = 15 * 60;
/** A support agent gives Pro for free (comp) for at most 30 days; comp.grant has no limit. */
export const AGENT_COMP_DAYS = 30;
/** Invites expire after 72 hours. */
export const INVITE_HOURS = 72;

export type Amr = { method: string; timestamp: number };

/** True when the last authenticator check was within `windowSeconds` of now (ms). */
export const freshTotp = (totpAt: number | null, nowMs: number, windowSeconds: number) =>
  totpAt !== null && nowMs / 1000 - totpAt <= windowSeconds && nowMs / 1000 - totpAt >= -60;

/** The exact words a super admin types to grant super admin. */
export const GRANT_PHRASE = "GRANT SUPER ADMIN";

/** A reason for a risky action: trimmed, 3 to 500 characters. */
export function reasonOf(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const r = v.trim().replace(/\s+/g, " ");
  return r.length >= 3 && r.length <= 500 ? r : null;
}

/** The panel's light or night theme, chosen on the Account page. */
export const ADMIN_THEME_COOKIE = "ug_adm_theme";

/** The public reasons a revoke can show, in both languages (CRT-2). */
export const REVOKE_REASONS = {
  asked: { en: "The learner asked us to remove it.", ar: "طلب المتعلم إزالتها." },
  mistake: { en: "It was issued by mistake.", ar: "صدرت عن طريق الخطأ." },
  terms: { en: "It broke the UXGate terms of use.", ar: "خالفت شروط استخدام UXGate." },
} as const;
