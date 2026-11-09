"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, check, requireFresh, run, who, type ActionResult } from "@/lib/admin/guard";
import { reasonFrom, textFrom } from "@/lib/admin/form";
import { RULE_KEYS, type LearningRules } from "@/lib/learning-rules";
import { resetAppConfig } from "@/lib/app-config";
import { hashTeamPassword, resetTeamPassword, teamPasswordProblem } from "@/lib/team-access";

// Platform settings (SET-1 to SET-4). Every change needs a reason and a fresh two-step code, and is written by a
// database function that checks the permission again and logs the old and new value. Other servers pick it up within
// a minute (lib/app-config.ts); this one at once.

type R = ActionResult;
const FLAG = /^[a-z_]{2,40}$/;
/** Flags whose name must be typed, because they change what every learner gets. */
const TYPED_FLAGS = new Set(["content_db", "trials"]);

export async function setFlag(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("settings.flags");
    const key = String(f.get("key") ?? "");
    if (!FLAG.test(key)) throw new AdminError("invalid", "Something is missing. Reload the page and try again.");
    const on = f.get("enabled") === "1";
    if (TYPED_FLAGS.has(key) && String(f.get("typed") ?? "").trim() !== key) throw new AdminError("invalid", `Type ${key} to confirm.`);
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_set_flag", { ...who(ctx), p_key: key, p_enabled: on, p_reason: reasonFrom(f) }));
    resetAppConfig();
  }, "Saved. Every server uses it within a minute.");
}

export async function setRule(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("settings.rules");
    const name = String(f.get("rule") ?? "") as keyof LearningRules;
    const def = RULE_KEYS[name];
    if (!def) throw new AdminError("invalid", "Something is missing. Reload the page and try again.");
    const n = Number(String(f.get("value") ?? "").trim());
    if (!Number.isInteger(n) || n < def.min || n > def.max || (def.options && !def.options.includes(n))) {
      throw new AdminError("invalid", def.options ? `Pick ${def.options.join(", ")}.` : `Enter a whole number from ${def.min} to ${def.max}.`);
    }
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_set_setting", { ...who(ctx), p_key: def.key, p_value: n, p_reason: reasonFrom(f) }));
    resetAppConfig();
  }, "Saved. It applies from each learner's next lesson or day settled.");
}

export async function setMaintenance(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("settings.access");
    const on = f.get("on") === "1";
    if (on && String(f.get("typed") ?? "").trim() !== "MAINTENANCE") throw new AdminError("invalid", "Type MAINTENANCE to confirm.");
    const en = textFrom(f, "message_en", 300);
    const ar = textFrom(f, "message_ar", 300);
    await requireFresh(ctx, f.get("code") as string | null);
    const reason = reasonFrom(f);
    const db = createAdminClient();
    if (en !== null || ar !== null) {
      if (!en || !ar || en.length < 3 || ar.length < 3) throw new AdminError("invalid", "Write the message in English and Arabic.");
      check(await db.rpc("admin_set_setting", { ...who(ctx), p_key: "access.maintenance_message", p_value: { en, ar }, p_reason: reason }));
    }
    check(await db.rpc("admin_set_setting", { ...who(ctx), p_key: "access.maintenance", p_value: on, p_reason: reason }));
    resetAppConfig();
  }, "Saved. Every server uses it within a minute.");
}

export async function setMaintenanceMessage(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("settings.access");
    const en = textFrom(f, "message_en", 300, true, "the English message")!;
    const ar = textFrom(f, "message_ar", 300, true, "the Arabic message")!;
    check(await createAdminClient().rpc("admin_set_setting", { ...who(ctx), p_key: "access.maintenance_message", p_value: { en, ar }, p_reason: "Maintenance message edited" }));
    resetAppConfig();
  }, "Message saved.");
}

/** The panel can turn the Coming Soon gate on, or hand it back to the Worker variable (null). */
export async function setComingSoon(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("settings.access");
    const v = String(f.get("value") ?? "");
    if (!["on", "follow"].includes(v)) throw new AdminError("invalid", "Something is missing. Reload the page and try again.");
    if (v === "on" && String(f.get("typed") ?? "").trim() !== "COMING SOON") throw new AdminError("invalid", "Type COMING SOON to confirm.");
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_set_setting", { ...who(ctx), p_key: "access.coming_soon", p_value: v === "on" ? true : null, p_reason: reasonFrom(f) }));
    resetAppConfig();
  }, "Saved. Every server uses it within a minute.");
}

/** A new team password: only its PBKDF2 hash leaves this server. Team passes given before stay valid until they expire. */
export async function setTeamPassword(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("settings.access");
    const pw = String(f.get("password") ?? "");
    const again = String(f.get("password2") ?? "");
    const problem = teamPasswordProblem(pw);
    if (problem) throw new AdminError("invalid", problem);
    if (pw !== again) throw new AdminError("invalid", "The two passwords are not the same.");
    await requireFresh(ctx, f.get("code") as string | null);
    check(await createAdminClient().rpc("admin_set_team_password", { ...who(ctx), p_hash: await hashTeamPassword(pw), p_reason: reasonFrom(f) }));
    resetTeamPassword();
  }, "Team password changed. Passes given with the old one stop working within a minute. Share the new one privately.");
}
