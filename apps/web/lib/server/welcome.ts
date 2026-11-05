import "server-only";
import { content, getPath } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceKey } from "@/lib/supabase/env";
import { siteOrigin } from "@/lib/email-token";
import { pathArt } from "@/lib/path-art";
import { welcomeEmail } from "./email/templates";
import { sendEmail } from "./email/send";
import { notify } from "./notify";
import { reminderTimeLabel } from "./account-email";

/**
 * The welcome inbox item and email, once per account (after onboarding). `welcome_sent_at` is claimed first with a
 * conditional update, so a second onboarding pass or a double submit never sends it twice. Never throws.
 */
export async function sendWelcomeOnce(userId: string, email: string | null | undefined): Promise<boolean> {
  if (!hasServiceKey()) return false;
  try {
    const db = createAdminClient();
    const { data: claimed } = await db.from("profiles").update({ welcome_sent_at: new Date().toISOString() })
      .eq("user_id", userId).is("welcome_sent_at", null).select("locale, display_name, reminder_time, current_path_id");
    const prof = claimed?.[0];
    if (!prof) return false;
    const locale = prof.locale === "ar" ? "ar" : "en";
    const pathId = (prof.current_path_id as string | null) ?? content.paths[0]?.id;
    const path = pathId ? getPath(pathId) : undefined;
    const unit = content.units.find((u) => u.pathId === pathId);
    await notify(userId, "welcome", {}, "/app", { db, locale });
    if (email && path && unit) {
      const base = `${siteOrigin()}/${locale}`;
      const mail = welcomeEmail({
        locale, name: (prof.display_name as string | null) ?? null, pathTitle: path.title[locale], unitTitle: unit.title[locale],
        pathImg: pathArt(path.id), startHref: `${base}/app`, settingsHref: `${base}/app/settings/notifications`,
        time: prof.reminder_time ? reminderTimeLabel(prof.reminder_time as string, locale) : null,
      });
      const r = await sendEmail({ to: email, ...mail, kind: "welcome", userId, locale });
      if (r.ok) await db.from("email_log").insert({ user_id: userId, kind: "welcome", day: new Date().toISOString().slice(0, 10), provider_id: r.id ?? null });
    }
    return true;
  } catch (e) {
    console.warn(`WARN welcome: ${userId}: ${(e as Error).message}`);
    return false;
  }
}
