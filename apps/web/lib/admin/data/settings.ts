import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEGAL_STATUS } from "@/lib/legal-text";

// Reads for Platform settings (SET-1 to SET-4) and System health (SYS-1, SYS-2). Before 0061 runs, the tables are
// missing and the screens say so.

export type FlagRow = { key: string; enabled: boolean; label: string | null; description: string | null; updatedAt: string | null; updatedBy: string | null };
export type SettingRow = { key: string; value: unknown; updatedAt: string | null; updatedBy: string | null };

export async function settingsData(): Promise<{ ready: boolean; flags: FlagRow[]; settings: Map<string, SettingRow>; teamPasswordSet: boolean }> {
  const db = createAdminClient();
  const [f, s, sec] = await Promise.all([
    db.from("app_flags").select("key, enabled, label, description, updated_at, updated_by").order("key"),
    db.from("app_settings").select("key, value, updated_at, updated_by"),
    db.from("app_secrets").select("key").eq("key", "team_password"),
  ]);
  const ready = !s.error;
  return {
    ready,
    flags: (f.data ?? []).map((r) => ({ key: r.key as string, enabled: !!r.enabled, label: (r.label as string) ?? null, description: (r.description as string) ?? null, updatedAt: (r.updated_at as string) ?? null, updatedBy: (r.updated_by as string) ?? null })),
    settings: new Map((s.data ?? []).map((r) => [r.key as string, { key: r.key as string, value: r.value, updatedAt: r.updated_at as string, updatedBy: r.updated_by as string | null }])),
    teamPasswordSet: (sec.data ?? []).length > 0,
  };
}

/** What the Worker's own variables say, so the panel can show which layer decides (never the values of secrets). */
export function workerAccess() {
  return {
    comingSoon: process.env.UG_COMING_SOON === "1",
    maintenance: process.env.UG_MAINTENANCE === "1",
    teamPasswordSecret: !!process.env.UG_TEAM_PASSWORD,
    billingMock: process.env.BILLING_MOCK === "1",
  };
}

export const legalStatus = () => LEGAL_STATUS;

// ───────── system health ─────────

export type Check = { id: string; label: string; ok: boolean | null; detail: string };

/** Quick checks of what the app depends on. Each one is cheap and never shows a secret. */
export async function healthChecks(): Promise<Check[]> {
  const db = createAdminClient();
  const t0 = Date.now();
  const ping = await db.from("app_flags").select("key").limit(1);
  const dbMs = Date.now() - t0;
  const env = (k: string) => !!process.env[k];
  const out: Check[] = [
    { id: "db", label: "Database", ok: !ping.error, detail: ping.error ? `Not reachable: ${ping.error.message}` : `Answered in ${dbMs} ms` },
    { id: "email", label: "Email (Resend)", ok: env("RESEND_API_KEY"), detail: env("RESEND_API_KEY") ? "Key set on this server" : "No RESEND_API_KEY: emails are not sent" },
    { id: "paddle", label: "Paddle", ok: env("PADDLE_API_KEY") && env("PADDLE_WEBHOOK_SECRET"), detail: `${process.env.PADDLE_ENV === "production" ? "Live" : "Sandbox"} · ${env("PADDLE_API_KEY") ? "API key set" : "no API key"} · ${env("PADDLE_WEBHOOK_SECRET") ? "webhook secret set" : "no webhook secret"}` },
    { id: "paymob", label: "Paymob", ok: env("PAYMOB_SECRET_KEY") && env("PAYMOB_HMAC_SECRET") ? true : null, detail: env("PAYMOB_SECRET_KEY") ? "Key set" : "Not set up yet (Egypt payments use the test page on previews)" },
    { id: "bunny", label: "Bunny video", ok: env("BUNNY_STREAM_TOKEN_KEY") && env("BUNNY_STREAM_CDN_HOST"), detail: env("BUNNY_STREAM_TOKEN_KEY") ? "Token key set: videos play" : "No BUNNY_STREAM_TOKEN_KEY: videos do not play" },
    { id: "links", label: "Email link secret", ok: env("EMAIL_LINK_SECRET"), detail: env("EMAIL_LINK_SECRET") ? "Set" : "No EMAIL_LINK_SECRET: unsubscribe and survey links do not work" },
    { id: "push", label: "Push notifications", ok: env("VAPID_PRIVATE_KEY") ? true : null, detail: env("VAPID_PRIVATE_KEY") ? "Keys set" : "No VAPID keys: push is off" },
    { id: "cron", label: "Daily job secret", ok: env("CRON_SECRET"), detail: env("CRON_SECRET") ? "Set" : "No CRON_SECRET: the daily job refuses to run" },
  ];
  return out;
}

export type JobRow = { name: string; label: string; schedule: string; emailsLearners: boolean; lastRun: string | null; lastOk: boolean | null; lastDetail: string | null };

/** The scheduled jobs (cf-worker.ts) and when each last ran (job_runs, 0063). */
export const JOBS: Omit<JobRow, "lastRun" | "lastOk" | "lastDetail">[] = [
  { name: "daily", label: "Daily job: streak days and freezes, waitlist, trial emails, campaigns", schedule: "Every day 02:00 UTC", emailsLearners: true },
  { name: "review-due", label: "Reviews due: the inbox and email for skills to review", schedule: "Every day 02:00 UTC", emailsLearners: true },
  { name: "billing", label: "Billing: renewals, grace ends, Paymob retries", schedule: "Every day 02:00 UTC", emailsLearners: true },
  { name: "reminders", label: "Daily reminders by email and push", schedule: "Every 15 minutes", emailsLearners: true },
  { name: "support", label: "Support housekeeping: SLA, auto-close, survey emails", schedule: "Every 15 minutes", emailsLearners: true },
];

export async function jobRuns(): Promise<JobRow[]> {
  const { data, error } = await createAdminClient().from("job_runs").select("name, finished_at, ok, detail").order("finished_at", { ascending: false }).limit(200);
  const last = new Map<string, { finished_at: string; ok: boolean; detail: string | null }>();
  if (!error) for (const r of data ?? []) if (!last.has(r.name as string)) last.set(r.name as string, r as { finished_at: string; ok: boolean; detail: string | null });
  return JOBS.map((j) => ({ ...j, lastRun: last.get(j.name)?.finished_at ?? null, lastOk: last.get(j.name)?.ok ?? null, lastDetail: last.get(j.name)?.detail ?? null }));
}
