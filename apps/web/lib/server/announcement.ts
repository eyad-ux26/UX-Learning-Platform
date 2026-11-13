import "server-only";
import { createClient } from "@/lib/supabase/server";
import { flagOn } from "@/lib/app-config";
import type { Announcement } from "@/components/app/AnnouncementBanner";

/** The running announcement for this learner in their language, or null. One cached flag read when the flag is off. */
export async function currentAnnouncement(locale: string): Promise<Announcement | null> {
  if (process.env.UG_DEV_FIXTURE === "1") return null;
  if (!(await flagOn("announcements"))) return null;
  try {
    const db = await createClient();
    const { data } = await db.rpc("my_announcements");
    const a = (Array.isArray(data) ? data[0] : null) as {
      id: string;
      title: Record<string, string>;
      body: Record<string, string>;
      link: string | null;
    } | null;
    if (!a) return null;
    const l = locale === "ar" ? "ar" : "en";
    return { id: a.id, title: a.title[l], body: a.body[l], link: a.link ? `/${l}${a.link}` : null };
  } catch {
    return null;
  }
}
