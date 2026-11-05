import "server-only";
import { createTranslator } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed, readPrefs, type InboxKind, type Prefs } from "@/lib/notifications";
import { inboxCopy, type InboxData } from "@/lib/inbox";
import { slice4 } from "@/messages/s4";
import { isPushEndpoint } from "@/lib/push-hosts";
import { sendPush } from "./webpush";

export async function loadPrefs(db: SupabaseClient, userId: string): Promise<Prefs> {
  const { data } = await db.from("notification_prefs").select("prefs").eq("user_id", userId).maybeSingle();
  return readPrefs(data?.prefs);
}

/** Push to every device of the learner; subscriptions the browser dropped are removed. */
export async function pushToLearner(db: SupabaseClient, userId: string, msg: { title: string; body: string; url: string; tag?: string }): Promise<number> {
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId).limit(10);
  let sent = 0;
  for (const s of subs ?? []) {
    if (!isPushEndpoint(s.endpoint as string)) { await db.from("push_subscriptions").delete().eq("id", s.id); continue; }
    try {
      const r = await sendPush({ endpoint: s.endpoint as string, p256dh: s.p256dh as string, auth: s.auth as string }, msg);
      if (r.ok) { sent++; await db.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", s.id); }
      else if (r.gone) await db.from("push_subscriptions").delete().eq("id", s.id);
    } catch (e) {
      console.warn(`WARN push failed for ${userId}: ${(e as Error).message}`);
    }
  }
  return sent;
}

/**
 * One notification: an inbox row (when In app is on) and a push to each device (when Push is on).
 * Email is sent by the caller with the matching template, after checking `allowed(prefs, kind, "email")`.
 * Other slices call this for badges, certificates, review due and billing.
 */
export async function notify(userId: string, kind: InboxKind, data: InboxData, href: string, opts: { db?: SupabaseClient; prefs?: Prefs; locale?: "en" | "ar" } = {}) {
  const db = opts.db ?? createAdminClient();
  const prefs = opts.prefs ?? (await loadPrefs(db, userId));
  let inbox = false;
  let pushed = 0;
  if (allowed(prefs, kind, "in_app")) {
    const { error } = await db.from("notifications").insert({ user_id: userId, kind, data, href });
    inbox = !error;
  }
  if (allowed(prefs, kind, "push")) {
    let locale = opts.locale;
    if (!locale) {
      const { data: p } = await db.from("profiles").select("locale").eq("user_id", userId).maybeSingle();
      locale = p?.locale === "ar" ? "ar" : "en";
    }
    const t = createTranslator({ locale, messages: slice4[locale] as Record<string, unknown> }) as unknown as (key: string, values?: Record<string, string | number>) => string;
    const copy = inboxCopy(kind, data, locale);
    pushed = await pushToLearner(db, userId, { title: t(`inbox.${copy.title}`, copy.values), body: t(`inbox.${copy.body}`, copy.values), url: `/${locale}${href}`, tag: kind });
  }
  return { inbox, pushed };
}
