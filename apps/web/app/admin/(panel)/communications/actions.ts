"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, audit, check, run, who, type ActionResult } from "@/lib/admin/guard";
import { reasonFrom, textFrom, uuidFrom } from "@/lib/admin/form";
import { campaignEmail } from "@/lib/server/email/campaign";
import { sendEmail } from "@/lib/server/email/send";
import { siteOrigin } from "@/lib/email-token";

// Communications (COM-2, COM-3). Drafts are free to edit; scheduling counts the audience, and above 500 people a
// second team member with comms.approve approves it first (approval kind "email", carried out in lib/admin/carry-out.ts).

type R = ActionResult;
const APPROVAL_OVER = 500;
const LINK = /^\/(app|paths|pricing)(\/[A-Za-z0-9/_-]*)?$/;

/** A date and time field (yyyy-mm-ddThh:mm), read as Cairo time (+02:00, the panel's time zone in winter). */
function whenFrom(f: FormData, name: string): Date | null {
  const raw = String(f.get(name) ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) throw new AdminError("invalid", "Pick a date and a time.");
  const d = new Date(`${raw}:00+02:00`);
  if (Number.isNaN(d.getTime())) throw new AdminError("invalid", "Pick a date and a time.");
  return d;
}

function pair(f: FormData, name: string, min: number, max: number, what: string) {
  const en = textFrom(f, `${name}_en`, max, true, `the English ${what}`)!;
  const ar = textFrom(f, `${name}_ar`, max, true, `the Arabic ${what}`)!;
  if (en.length < min || ar.length < min) throw new AdminError("invalid", `Write the ${what} in English and Arabic (at least ${min} characters each).`);
  return { en, ar };
}

async function audienceCount(audience: string): Promise<number> {
  const { data, error } = await createAdminClient().rpc("admin_audience_count", { p_audience: audience });
  if (error) throw new AdminError("failed", "The audience could not be counted. Is migration 0063 in the database?");
  return Number(data ?? 0);
}

/** Schedules now, or asks for approval when the audience is large. Returns the message for the admin. */
async function scheduleOrAsk(ctx: Awaited<ReturnType<typeof actionAdmin>>, type: "announcement" | "campaign", id: string, title: string, audience: string, reason: string) {
  const table = type === "announcement" ? "announcements" : "campaigns";
  const n = await audienceCount(audience);
  const db = createAdminClient();
  if (n > APPROVAL_OVER) {
    const approval = check(await db.rpc("admin_request_approval", {
      ...who(ctx), p_kind: "email", p_permission: "comms.approve", p_title: `${type === "announcement" ? "Announcement" : "Campaign"}: ${title}`,
      p_detail: { type, id, audience, people: n }, p_target_type: type, p_target_id: id, p_reason: reason,
    })) as unknown as string;
    check(await db.from(table).update({ status: "waiting_approval", approval_id: approval, audience_count: n }).eq("id", id).eq("status", "draft"));
    return `Sent for approval: it reaches about ${n.toLocaleString("en")} people, so a second team member approves it.`;
  }
  check(await db.from(table).update({ status: "scheduled", audience_count: n }).eq("id", id).eq("status", "draft"));
  await audit(ctx, `${type}.scheduled`, "grow", { type, id, label: title }, { after: { audience, people: n }, reason });
  return `Scheduled for about ${n.toLocaleString("en")} people.`;
}

// ───────── announcements ─────────

export async function saveAnnouncement(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = f.get("id") ? uuidFrom(f.get("id")) : null;
    const title = pair(f, "title", 3, 80, "title");
    const body = pair(f, "body", 3, 240, "text");
    const link = textFrom(f, "link", 120);
    if (link && !LINK.test(link)) throw new AdminError("invalid", "A link must be a page of the app, for example /app or /paths/P15.");
    const audience = String(f.get("audience") ?? "all");
    if (!["all", "free", "pro"].includes(audience)) throw new AdminError("invalid", "Pick who sees it.");
    const starts = whenFrom(f, "starts_at");
    const ends = whenFrom(f, "ends_at");
    if (!starts || !ends || ends <= starts) throw new AdminError("invalid", "Pick a start and an end after it.");
    const row = { title, body, link: link || null, audience, starts_at: starts.toISOString(), ends_at: ends.toISOString() };
    const db = createAdminClient();
    if (id) {
      check(await db.from("announcements").update(row).eq("id", id).eq("status", "draft"));
      await audit(ctx, "announcement.edited", "grow", { type: "announcement", id, label: title.en }, { after: row });
    } else {
      const r = check(await db.from("announcements").insert({ ...row, created_by: ctx.userId }).select("id").single()) as { id: string };
      await audit(ctx, "announcement.created", "grow", { type: "announcement", id: r.id, label: title.en }, { after: row });
    }
  }, "Draft saved.");
}

export async function scheduleAnnouncement(_: R | null, f: FormData): Promise<R> {
  let msg = "";
  const r = await run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = uuidFrom(f.get("id"));
    const { data: a } = await createAdminClient().from("announcements").select("title, audience, status").eq("id", id).maybeSingle();
    if (!a || a.status !== "draft") throw new AdminError("conflict", "Only a draft can be scheduled. Reload the page.");
    msg = await scheduleOrAsk(ctx, "announcement", id, (a.title as { en: string }).en, a.audience as string, reasonFrom(f));
  });
  return r.ok ? { ...r, message: msg } : r;
}

export async function cancelAnnouncement(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = uuidFrom(f.get("id"));
    const db = createAdminClient();
    const { data: a } = await db.from("announcements").select("title, status, approval_id").eq("id", id).maybeSingle();
    if (!a || a.status === "cancelled") throw new AdminError("conflict", "It is already stopped. Reload the page.");
    check(await db.from("announcements").update({ status: "cancelled" }).eq("id", id));
    if (a.approval_id) await db.from("admin_approvals").update({ status: "cancelled", decided_at: new Date().toISOString() }).eq("id", a.approval_id).eq("status", "waiting");
    await audit(ctx, "announcement.cancelled", "grow", { type: "announcement", id, label: (a.title as { en: string }).en }, { before: { status: a.status }, reason: reasonFrom(f) });
  }, "Stopped. Learners no longer see it.");
}

/** A declined or cancelled approval gives the draft back. */
export async function backToDraft(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = uuidFrom(f.get("id"));
    const type = f.get("type") === "campaign" ? "campaign" : "announcement";
    const table = type === "campaign" ? "campaigns" : "announcements";
    const db = createAdminClient();
    const { data: row } = await db.from(table).select("status, approval_id").eq("id", id).maybeSingle();
    if (!row || row.status !== "waiting_approval") throw new AdminError("conflict", "It is not waiting for approval. Reload the page.");
    const { data: ap } = await db.from("admin_approvals").select("status").eq("id", row.approval_id).maybeSingle();
    if (ap?.status === "waiting") throw new AdminError("conflict", "It is still waiting for approval. Cancel the request in Team and roles, then Approvals, first.");
    check(await db.from(table).update({ status: "draft", approval_id: null }).eq("id", id));
    await audit(ctx, `${type}.back_to_draft`, "grow", { type, id, label: type }, { before: { approval: row.approval_id, approval_status: ap?.status ?? null } });
  }, "Back to draft. Edit it and schedule it again.");
}

// ───────── campaigns ─────────

function campaignFields(f: FormData) {
  const name = textFrom(f, "name", 80, true, "a name")!;
  if (name.length < 3) throw new AdminError("invalid", "Write a name of at least 3 characters.");
  const subject = pair(f, "subject", 3, 120, "subject");
  const body = pair(f, "body", 10, 4000, "text");
  const label = { en: textFrom(f, "button_en", 40) ?? "", ar: textFrom(f, "button_ar", 40) ?? "" };
  const href = textFrom(f, "button_link", 120);
  if ((label.en || label.ar || href) && (!label.en || !label.ar || !href || !LINK.test(href))) throw new AdminError("invalid", "A button needs words in both languages and a page of the app, for example /paths.");
  const audience = String(f.get("audience") ?? "all");
  if (!["all", "free", "pro", "trial"].includes(audience)) throw new AdminError("invalid", "Pick who gets it.");
  const sendAt = whenFrom(f, "send_at");
  if (!sendAt) throw new AdminError("invalid", "Pick when to send it.");
  return { name, subject, body, button: href ? { ...label, href } : null, audience, send_at: sendAt.toISOString() };
}

export async function saveCampaign(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = f.get("id") ? uuidFrom(f.get("id")) : null;
    const row = campaignFields(f);
    const db = createAdminClient();
    if (id) {
      check(await db.from("campaigns").update(row).eq("id", id).eq("status", "draft"));
      await audit(ctx, "campaign.edited", "grow", { type: "campaign", id, label: row.name }, { after: { ...row, body: undefined } });
    } else {
      const r = check(await db.from("campaigns").insert({ ...row, created_by: ctx.userId }).select("id").single()) as { id: string };
      await audit(ctx, "campaign.created", "grow", { type: "campaign", id: r.id, label: row.name }, { after: { ...row, body: undefined } });
    }
  }, "Draft saved.");
}

/** Sends the saved draft to the admin's own address, in one language, before it goes to anyone else. */
export async function testCampaign(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = uuidFrom(f.get("id"));
    const locale = f.get("locale") === "ar" ? "ar" : "en";
    const { data: c } = await createAdminClient().from("campaigns").select("name, subject, body, button").eq("id", id).maybeSingle();
    if (!c) throw new AdminError("conflict", "That campaign is gone. Reload the page.");
    const b = c.button as { en: string; ar: string; href: string } | null;
    const mail = campaignEmail({ locale, subject: `[Test] ${(c.subject as Record<string, string>)[locale]}`, body: (c.body as Record<string, string>)[locale], button: b ? { label: b[locale], href: `${siteOrigin()}/${locale}${b.href}` } : null, unsubscribeHref: `${siteOrigin()}/${locale}/app/settings/notifications` });
    const r = await sendEmail({ to: ctx.email, ...mail, kind: "news_test" });
    if (!r.ok) throw new AdminError("failed", r.skipped ? "Email is not set up on this server (no RESEND_API_KEY)." : `The email was not sent: ${r.error ?? "unknown error"}.`);
    await audit(ctx, "campaign.test_sent", "grow", { type: "campaign", id, label: c.name as string }, { after: { to: ctx.email, locale } });
  }, "Test sent to your address.");
}

export async function scheduleCampaign(_: R | null, f: FormData): Promise<R> {
  let msg = "";
  const r = await run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = uuidFrom(f.get("id"));
    const { data: c } = await createAdminClient().from("campaigns").select("name, audience, status").eq("id", id).maybeSingle();
    if (!c || c.status !== "draft") throw new AdminError("conflict", "Only a draft can be scheduled. Reload the page.");
    msg = await scheduleOrAsk(ctx, "campaign", id, c.name as string, c.audience as string, reasonFrom(f));
  });
  return r.ok ? { ...r, message: msg } : r;
}

export async function cancelCampaign(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("comms.send");
    const id = uuidFrom(f.get("id"));
    const db = createAdminClient();
    const { data: c } = await db.from("campaigns").select("name, status, approval_id, sent_count").eq("id", id).maybeSingle();
    if (!c || ["sent", "cancelled"].includes(c.status as string)) throw new AdminError("conflict", "It already ended. Reload the page.");
    check(await db.from("campaigns").update({ status: "cancelled" }).eq("id", id));
    if (c.approval_id) await db.from("admin_approvals").update({ status: "cancelled", decided_at: new Date().toISOString() }).eq("id", c.approval_id).eq("status", "waiting");
    await audit(ctx, "campaign.cancelled", "grow", { type: "campaign", id, label: c.name as string }, { before: { status: c.status, sent: c.sent_count }, reason: reasonFrom(f) });
  }, "Stopped. Nobody else gets it.");
}
