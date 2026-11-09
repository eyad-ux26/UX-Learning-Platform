// Flags and settings the Admins change in the panel (0061, app_config()). Edge-safe: the middleware, the server pages
// and the API routes read it the same way, with one small request per isolate per minute. app_config() holds no secret,
// so the public key reads it. When the database cannot be reached the app keeps the last answer, or runs on its
// built-in defaults (every flag off), so a database problem never turns a feature on.
import { DEFAULT_RULES, rulesFrom, type LearningRules } from "./learning-rules";

export type AppConfig = { flags: Record<string, boolean>; settings: Record<string, unknown>; teamPasswordSet: boolean };

const TTL_MS = 60_000;
const EMPTY: AppConfig = { flags: {}, settings: {}, teamPasswordSet: false };
let cached: { at: number; value: AppConfig } | null = null;
let pending: Promise<AppConfig> | null = null;

async function fetchConfig(): Promise<AppConfig> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return EMPTY;
  const res = await fetch(`${url}/rest/v1/rpc/app_config`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(1500),
    cache: "no-store",
  });
  if (res.status === 404) return EMPTY; // 0061 not run yet: built-in defaults
  if (!res.ok) throw new Error(`app_config ${res.status}`);
  const j = (await res.json()) as { flags?: Record<string, boolean>; settings?: Record<string, unknown>; team_password_set?: boolean } | null;
  return { flags: j?.flags ?? {}, settings: j?.settings ?? {}, teamPasswordSet: !!j?.team_password_set };
}

/** The current flags and settings (at most a minute old). */
export async function getAppConfig(now = Date.now()): Promise<AppConfig> {
  if (process.env.UG_DEV_FIXTURE === "1" || process.env.UG_ADMIN_FIXTURE === "1") return EMPTY;
  if (cached && now - cached.at < TTL_MS) return cached.value;
  if (!pending) {
    pending = fetchConfig()
      .then((value) => { cached = { at: Date.now(), value }; return value; })
      .catch((e) => {
        console.warn("app config: kept the last answer", (e as Error).message);
        if (cached) cached = { at: Date.now() - TTL_MS / 2, value: cached.value }; // try again in 30 s
        return cached?.value ?? EMPTY;
      })
      .finally(() => { pending = null; });
  }
  return pending;
}

/** Forget the cached answer (the panel calls it after a change, so the admin sees it at once on this isolate). */
export const resetAppConfig = () => { cached = null; };

export const flagOn = async (key: string) => (await getAppConfig()).flags[key] === true;

/** The learning rules now in force. */
export async function learningRules(): Promise<LearningRules> {
  try { return rulesFrom((await getAppConfig()).settings); } catch { return DEFAULT_RULES; }
}

export type AccessConfig = {
  /** true or false when an Admin set it in the panel; null to follow the Worker variable. */
  comingSoon: boolean | null;
  maintenance: boolean;
  maintenanceMessage: { en: string; ar: string } | null;
};

export function accessFrom(c: AppConfig): AccessConfig {
  const cs = c.settings["access.coming_soon"];
  const msg = c.settings["access.maintenance_message"] as { en?: unknown; ar?: unknown } | undefined;
  return {
    comingSoon: typeof cs === "boolean" ? cs : null,
    maintenance: c.settings["access.maintenance"] === true,
    maintenanceMessage: msg && typeof msg.en === "string" && typeof msg.ar === "string" ? { en: msg.en, ar: msg.ar } : null,
  };
}
