// Issue #131: page reads of billing tables must fail fast. Until migration 0036 is applied, every billing read errors;
// supabase-js retries some failed GETs (1 s, 2 s, 4 s), which would add seconds to every signed-in page. So page reads
// turn retries off, and once the database says a billing table does not exist, this isolate stops asking for a minute.
// Free is the safe answer while billing is missing: nothing is unlocked by an error.

/** PostgREST "table not in the schema cache" and Postgres "relation does not exist". */
const MISSING = new Set(["PGRST205", "42P01"]);
const QUIET_MS = 60_000;
let missingUntil = 0;

/** True while a recent read found the billing tables missing: skip the round trip and answer Free. */
export const billingTablesMissing = (now = Date.now()): boolean => now < missingUntil;

/** Remember a "table missing" error so the next requests skip billing reads for a minute. */
export function noteBillingError(error: { code?: string } | null | undefined, now = Date.now()): void {
  if (error?.code && MISSING.has(error.code)) missingUntil = now + QUIET_MS;
}

/** For tests. */
export const resetBillingTables = () => { missingUntil = 0; };
