"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { KINDS, prefsToStore, readPrefs, type Prefs } from "@/lib/notifications";
import { deleteAfter } from "@/lib/reminder-plan";
import { onAccountDeletionScheduled } from "@/lib/server/account-hooks";
import { sendDeletedEmail } from "@/lib/server/account-email";
import { BYE_COOKIE } from "@/lib/server/account";
import { isPushEndpoint } from "@/lib/push-hosts";

async function me() {
  const db = await createClient();
  const { data } = await db.auth.getUser();
  return { db, user: data.user };
}

const setting = z.discriminatedUnion("field", [
  z.object({ field: z.literal("display_name"), value: z.string().trim().min(1).max(60) }),
  z.object({ field: z.literal("locale"), value: z.enum(["en", "ar"]) }),
  z.object({ field: z.literal("theme"), value: z.enum(["system", "light", "dark"]) }),
  z.object({ field: z.literal("daily_goal"), value: z.number().int().min(1).max(3) }),
  z.object({ field: z.literal("reminder_time"), value: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable() }),
]);

/** One setting, saved the moment it changes (acceptance check 1: saves, survives a reload, applies at once). */
export async function saveSetting(input: z.infer<typeof setting>): Promise<{ ok: boolean }> {
  const p = setting.safeParse(input);
  if (!p.success) return { ok: false };
  const { db, user } = await me();
  if (!user) return { ok: false };
  const { error } = await db.from("profiles").update({ [p.data.field]: p.data.value, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  // Emails follow the language on the account (the auth templates read user metadata), so keep both in step.
  if (!error && p.data.field === "locale") await db.auth.updateUser({ data: { locale: p.data.value } });
  return { ok: !error };
}

const cell = z.object({ in_app: z.boolean(), email: z.boolean(), push: z.boolean() });
const prefsSchema = z.object(Object.fromEntries(KINDS.map((k) => [k, cell])) as Record<(typeof KINDS)[number], typeof cell>);

/** Notification choices are kept only when the learner presses Save changes. Billing email stays on whatever is sent. */
export async function saveNotificationPrefs(input: Prefs): Promise<{ ok: boolean; prefs?: Prefs }> {
  const p = prefsSchema.safeParse(input);
  if (!p.success) return { ok: false };
  const { user } = await me();
  if (!user || !hasServiceKey()) return { ok: false };
  const prefs = readPrefs(p.data);
  const admin = createAdminClient();
  // Keep keys this screen does not show (the news opt-out from campaign emails), so saving never turns them back on.
  const { data: had, error: readError } = await admin.from("notification_prefs").select("prefs").eq("user_id", user.id).maybeSingle();
  if (readError) return { ok: false };
  const { error } = await admin.from("notification_prefs").upsert({ user_id: user.id, prefs: prefsToStore(had?.prefs, prefs), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return { ok: !error, prefs };
}

const sub = z.object({ endpoint: z.string().url().startsWith("https://").max(1000), p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100), userAgent: z.string().max(300).optional() });

/** This device said yes to push: keep its subscription. One endpoint belongs to one learner (the last who signed in on it). */
/**
 * Saves this device's push subscription. Only the browsers' push services are accepted, and an endpoint stays with the
 * account that saved it first: "taken" tells the browser to drop that subscription and make a fresh one.
 */
export async function savePushSubscription(input: z.infer<typeof sub>): Promise<{ ok: boolean; taken?: boolean }> {
  const p = sub.safeParse(input);
  if (!p.success || !isPushEndpoint(p.data.endpoint)) return { ok: false };
  const { user } = await me();
  if (!user || !hasServiceKey()) return { ok: false };
  const admin = createAdminClient();
  const { data: had } = await admin.from("push_subscriptions").select("user_id").eq("endpoint", p.data.endpoint).maybeSingle();
  if (had && had.user_id !== user.id) return { ok: false, taken: true };
  const row = { p256dh: p.data.p256dh, auth: p.data.auth, user_agent: p.data.userAgent ?? null };
  const { error } = had
    ? await admin.from("push_subscriptions").update(row).eq("endpoint", p.data.endpoint).eq("user_id", user.id)
    : await admin.from("push_subscriptions").insert({ user_id: user.id, endpoint: p.data.endpoint, ...row });
  return { ok: !error };
}

export async function removePushSubscription(input: { endpoint: string }): Promise<{ ok: boolean }> {
  const p = z.object({ endpoint: z.string().max(1000) }).safeParse(input);
  const { user } = await me();
  if (!p.success || !user || !hasServiceKey()) return { ok: false };
  const { error } = await createAdminClient().from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", p.data.endpoint);
  return { ok: !error };
}

/** Marks some (or all) inbox items as read, through the database function that can change nothing else. */
export async function markRead(input: { ids?: string[] }): Promise<{ ok: boolean }> {
  const p = z.object({ ids: z.array(z.string().uuid()).max(100).optional() }).safeParse(input);
  if (!p.success) return { ok: false };
  const { db, user } = await me();
  if (!user) return { ok: false };
  const { error } = await db.rpc("mark_notifications_read", { p_ids: p.data.ids ?? null });
  return { ok: !error };
}

/**
 * Delete my account: schedule removal 30 days from now, stop renewal (slice 5 hook), email the undo date, and sign the
 * learner out on every device. Signing in before the date undoes it (lib/server/account.ts). The daily job removes the rest.
 */
export async function deleteAccount(input: { confirm: boolean; locale: "en" | "ar" }): Promise<{ ok: boolean }> {
  const p = z.object({ confirm: z.literal(true), locale: z.enum(["en", "ar"]) }).safeParse(input);
  if (!p.success) return { ok: false };
  const { db, user } = await me();
  if (!user || !hasServiceKey()) return { ok: false };
  const now = new Date();
  const after = deleteAfter(now);
  const admin = createAdminClient();
  const { data: prof, error } = await admin.from("profiles")
    .update({ delete_requested_at: now.toISOString(), delete_after: after.toISOString() })
    .eq("user_id", user.id).select("display_name, locale").maybeSingle();
  if (error || !prof) return { ok: false };
  await onAccountDeletionScheduled(user.id);
  const locale = prof.locale === "ar" ? "ar" : p.data.locale;
  if (user.email) await sendDeletedEmail({ userId: user.id, to: user.email, name: (prof.display_name as string | null) ?? "", locale, date: after }).catch(() => null);
  // Push on this account's devices stops at once; the rows go with the account later anyway.
  await admin.from("push_subscriptions").delete().eq("user_id", user.id);
  await db.auth.signOut({ scope: "global" });
  const masked = user.email ? user.email.replace(/^(.)[^@]*/, (_, a: string) => `${a}•••••`) : "";
  (await cookies()).set(BYE_COOKIE, JSON.stringify({ d: after.toISOString(), e: masked, n: (prof.display_name as string | null) ?? "" }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  return { ok: true };
}
