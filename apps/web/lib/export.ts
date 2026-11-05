// "Download my data": which tables go in the file and how it is shaped. Pure, so the shape is tested.

/** Every learner-owned table. Push keys are left out (they are device secrets, not the learner's data). */
export const EXPORT_TABLES: { table: string; columns: string }[] = [
  { table: "profiles", columns: "*" },
  { table: "onboarding", columns: "*" },
  { table: "enrollments", columns: "*" },
  { table: "attempts", columns: "*" },
  { table: "step_results", columns: "*" },
  { table: "xp_events", columns: "*" },
  { table: "streaks", columns: "*" },
  { table: "daily_activity", columns: "*" },
  { table: "skill_states", columns: "*" },
  { table: "review_requests", columns: "*" },
  { table: "notifications", columns: "*" },
  { table: "notification_prefs", columns: "*" },
  { table: "email_log", columns: "kind, day, sent_at" },
  { table: "push_subscriptions", columns: "user_agent, created_at, last_ok_at" },
  // Slice 3 tables; skipped when they do not exist yet.
  { table: "path_events", columns: "*" },
  { table: "freeze_events", columns: "*" },
  { table: "certificates", columns: "*" },
];

export type ExportAccount = { id: string; email: string | null; createdAt: string; provider: string };

/** Keeps only rows that belong to this learner, whatever a query returned. */
export function buildExport(account: ExportAccount, tables: Record<string, unknown[]>, at: Date) {
  const own: Record<string, unknown[]> = {};
  for (const { table } of EXPORT_TABLES) {
    if (!(table in tables)) continue;
    own[table] = (tables[table] ?? []).filter((r) => {
      const uid = (r as { user_id?: unknown }).user_id;
      return uid === undefined || uid === account.id;
    });
  }
  return {
    format: "uxgate-data-export",
    version: 1,
    exported_at: at.toISOString(),
    account: { id: account.id, email: account.email, created_at: account.createdAt, sign_in: account.provider },
    tables: own,
  };
}
