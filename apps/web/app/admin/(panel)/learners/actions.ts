"use server";
// Learner 360 actions (LRN-3 to LRN-5). Each checks its permission again, asks a reason and writes the audit log.

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, audit, check, requireFresh, run, type ActionResult } from "@/lib/admin/guard";
import { reasonFrom, textFrom, uuidFrom } from "@/lib/admin/form";
import { VIEW_AS_SECONDS } from "@/lib/admin/rules";
import { sendSignInLink } from "@/lib/admin/data/support";
import { resolveWeekStart, shiftDay } from "@/lib/freeze";
import { learningRules } from "@/lib/app-config";
import { localDay } from "@/lib/progress";
import { settleLearner } from "@/lib/server/settle";
import { onAccountDeletionScheduled } from "@/lib/server/account-hooks";
import { emailLayout, siteOrigin } from "@/lib/server/email/layout";
import { sendEmail, SUPPORT_FROM } from "@/lib/server/email/send";
import { maskEmail } from "@/lib/admin/mask";

type R = ActionResult;

const emailOf = async (user: string) => {
  const { data } = await createAdminClient().auth.admin.getUserById(user);
  if (!data?.user) throw new AdminError("invalid", "That learner was not found.");
  return data.user;
};

/** Shows one masked value (email or last IP). Asks a reason; the reveal is logged with it. */
export async function reveal(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.reveal");
    const user = uuidFrom(f.get("user"));
    const field = String(f.get("field"));
    if (!["email", "ip"].includes(field)) throw new AdminError("invalid", "Reload the page and try again.");
    const reason = reasonFrom(f);
    const u = await emailOf(user);
    const value = field === "email" ? u.email ?? "" : ((u as { last_sign_in_ip?: string }).last_sign_in_ip ?? "Not recorded");
    await audit(ctx, "learners.revealed", "learners", { type: "learner", id: user, label: u.email ?? null }, { after: { field }, reason });
    await createAdminClient().from("admin_sessions").update({ revealed_at: new Date().toISOString() }).eq("session_id", ctx.sessionId);
    return { value };
  });
}

/** A team note. "@name" mentions a team member by the start of their name or email. */
export async function addNote(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.notes");
    const user = uuidFrom(f.get("user"));
    const body = textFrom(f, "body", 4000, true, "the note")!;
    const db = createAdminClient();
    const tags = [...body.matchAll(/@([\p{L}\p{N}._-]{2,40})/gu)].map((m) => m[1]!.toLowerCase());
    let mentions: string[] = [];
    if (tags.length) {
      const { data: members } = await db.from("admin_members").select("user_id, email, display_name").eq("status", "active");
      mentions = (members ?? []).filter((m) => tags.some((t) => (m.display_name ?? "").toLowerCase().replace(/\s+/g, "").startsWith(t) || m.email.toLowerCase().startsWith(t))).map((m) => m.user_id);
    }
    check(await db.from("learner_notes").insert({ user_id: user, author_id: ctx.userId, body, mentions }));
    await audit(ctx, "learners.note_added", "learners", { type: "learner", id: user }, { after: { mentions: mentions.length } });
  }, "Note added.");
}

export async function resendSignIn(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.act");
    const { email } = await sendSignInLink(ctx, uuidFrom(f.get("user")));
    return { message: `Sign-in link sent to ${email.replace(/^(.{2})[^@]*/, "$1•••")}.` };
  });
}

/** Adds one streak freeze (up to the most a learner can hold). */
export async function addFreeze(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.act");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    const db = createAdminClient();
    const { data: s } = await db.from("streaks").select("freezes_available").eq("user_id", user).maybeSingle();
    if (!s) throw new AdminError("invalid", "This learner has no streak yet.");
    const max = (await learningRules()).freezeMax; // Learning rules (0061), not the built-in default
    if (s.freezes_available >= max) throw new AdminError("conflict", `They already hold ${max} freezes, the most anyone can hold.`);
    check(await db.from("streaks").update({ freezes_available: s.freezes_available + 1 }).eq("user_id", user));
    await audit(ctx, "learners.freeze_added", "learners", { type: "learner", id: user }, { before: { freezes: s.freezes_available }, after: { freezes: s.freezes_available + 1 }, reason });
  }, "Freeze added.");
}

/** Covers one missed day with a freeze, so a streak our bug broke comes back, then recounts the streak. */
export async function coverDay(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.act");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    const day = String(f.get("day") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new AdminError("invalid", "Pick the missed day.");
    const db = createAdminClient();
    const { data: p } = await db.from("profiles").select("time_zone, week_start, locale").eq("user_id", user).maybeSingle();
    const today = localDay(new Date(), p?.time_zone ?? null);
    if (day >= today || day < shiftDay(today, -14)) throw new AdminError("invalid", "Pick a day in the last 14 days, before today.");
    const { data: before } = await db.from("streaks").select("current").eq("user_id", user).maybeSingle();
    check(await db.from("daily_activity").upsert({ user_id: user, day, freeze_used: true }, { onConflict: "user_id,day", ignoreDuplicates: false }));
    await db.from("freeze_events").upsert({ user_id: user, kind: "used", day, seen_at: new Date().toISOString() }, { onConflict: "user_id,kind,day", ignoreDuplicates: true });
    check(await db.from("streaks").update({ settled_through: shiftDay(day, -1) }).eq("user_id", user));
    const r = await settleLearner(user, p?.time_zone ?? null, new Date(), resolveWeekStart(p?.week_start, p?.locale));
    if (!r.ok) throw new AdminError("failed", "The day was covered but the streak could not be recounted. It recounts on their next visit.");
    const { data: after } = await db.from("streaks").select("current").eq("user_id", user).maybeSingle();
    await audit(ctx, "learners.streak_restored", "learners", { type: "learner", id: user }, { before: { streak: before?.current, day }, after: { streak: after?.current }, reason });
    return { message: `Streak is ${after?.current ?? "recounted"} days.` };
  });
}

/** Lets the learner take one lesson again from the start: its plays, answers and XP go. Skills already shown stay. */
export async function resetLesson(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.act");
    const user = uuidFrom(f.get("user"));
    const lesson = String(f.get("lesson") ?? "");
    if (!/^[A-Za-z0-9_-]{2,60}$/.test(lesson)) throw new AdminError("invalid", "Pick a lesson.");
    const reason = reasonFrom(f);
    const db = createAdminClient();
    const { data: gone } = await db.from("attempts").delete().eq("user_id", user).eq("lesson_id", lesson).select("id");
    if (!gone?.length) throw new AdminError("invalid", "They have not started this lesson.");
    await audit(ctx, "learners.lesson_reset", "learners", { type: "learner", id: user }, { before: { lesson, plays: gone.length }, after: { lesson, plays: 0 }, reason });
  }, "Lesson reset. It starts fresh on their next visit.");
}

/** Sends a confirm link to the new address; the email changes when they open it (Supabase's own email change). */
export async function changeEmail(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.manage");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    const next = z.string().email().max(254).safeParse(String(f.get("email") ?? "").trim().toLowerCase());
    if (!next.success) throw new AdminError("invalid", "Enter the new email in full.");
    const db = createAdminClient();
    // Team accounts (the founding super admin above all) are never moved from here: the new address would get the sign-in.
    const { data: team } = await db.from("admin_members").select("user_id").eq("user_id", user).maybeSingle();
    if (team) throw new AdminError("forbidden", "This is a team account. Its email is changed in Supabase by an owner, not here.");
    await requireFresh(ctx, f.get("code") as string | null);
    const u = await emailOf(user);
    if (!u.email) throw new AdminError("invalid", "This account has no email to change.");
    const { data, error } = await db.auth.admin.generateLink({ type: "email_change_new", email: u.email, newEmail: next.data });
    if (error || !data?.properties?.hashed_token) throw new AdminError("failed", error?.message?.includes("already") ? "Another account uses that email." : "Supabase did not make the confirm link. Try again.");
    const { data: prof } = await db.from("profiles").select("locale").eq("user_id", user).maybeSingle();
    const ar = prof?.locale === "ar";
    const href = `${siteOrigin()}/api/auth/confirm-email?token_hash=${data.properties.hashed_token}&locale=${ar ? "ar" : "en"}`;
    const l = emailLayout({
      locale: ar ? "ar" : "en", preheader: ar ? "أكّد بريدك الجديد" : "Confirm your new email", heading: ar ? "أكّد بريدك الجديد في UXGate" : "Confirm your new UXGate email",
      paragraphs: [ar ? "طلبتَ من فريق الدعم تغيير بريد حسابك إلى هذا العنوان. اضغط الزر للتأكيد." : "You asked our support team to move your account to this address. Tap the button to confirm."],
      button: { label: ar ? "أكّد البريد" : "Confirm email", href, showLink: true }, footer: "transactional",
      safety: ar ? "لم تطلب هذا؟ تجاهل الرسالة، فلن يتغير شيء." : "Didn't ask for this? Ignore this email; nothing changes.",
    });
    const sent = await sendEmail({ to: next.data, subject: ar ? "أكّد بريدك الجديد في UXGate" : "Confirm your new UXGate email", html: l.html, text: l.text, kind: "support_email_change", userId: user });
    // The old address hears about it too, so a change nobody asked for is noticed before the link is opened.
    const old = emailLayout({
      locale: ar ? "ar" : "en", preheader: ar ? "طلب لتغيير بريد حسابك" : "A request to change your account email",
      heading: ar ? "طلب لتغيير بريد حسابك في UXGate" : "A request to change your UXGate email",
      paragraphs: [ar ? `أرسل فريق الدعم رابط تأكيد إلى عنوان جديد (${maskEmail(next.data)}). لن يتغير بريدك إلا بعد فتح ذلك الرابط.` : `Our support team sent a confirm link to a new address (${maskEmail(next.data)}). Your email changes only when that link is opened.`],
      safety: ar ? "لم تطلب هذا؟ ردّ على هذه الرسالة فورًا، وسنوقف التغيير." : "Didn't ask for this? Reply to this email right away and we will stop the change.",
      footer: "transactional",
    });
    await sendEmail({ to: u.email, subject: ar ? "طلب لتغيير بريد حسابك في UXGate" : "A request to change your UXGate email", html: old.html, text: old.text, kind: "support_email_change_notice", userId: user, from: SUPPORT_FROM });
    await audit(ctx, "learners.email_change_sent", "learners", { type: "learner", id: user, label: u.email }, { before: { email: u.email }, after: { email: next.data, confirmed: false }, reason });
    if (!sent.ok) throw new AdminError("failed", "The confirm email did not go out. Try again.");
  }, "Confirm link sent to the new address. The email changes when they open it.");
}

export async function setSuspended(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.manage");
    const user = uuidFrom(f.get("user"));
    const on = f.get("to") === "suspend";
    const reason = reasonFrom(f);
    const db = createAdminClient();
    const { data: team } = await db.from("admin_members").select("user_id").eq("user_id", user).maybeSingle();
    if (team && on) throw new AdminError("forbidden", "This is a team account. Suspend them in Team and roles.");
    const { error } = await db.auth.admin.updateUserById(user, { ban_duration: on ? "876000h" : "none" });
    if (error) throw new AdminError("failed", "Supabase refused the change. Try again.");
    await audit(ctx, on ? "learners.suspended" : "learners.unsuspended", "learners", { type: "learner", id: user }, { after: { suspended: on }, reason });
  }, "Saved.");
}

/** Everything we hold about the learner, as one JSON file (data export request). */
export async function exportLearner(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.manage");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    await requireFresh(ctx, f.get("code") as string | null);
    const db = createAdminClient();
    const u = await emailOf(user);
    const tables = ["profiles", "onboarding", "enrollments", "attempts", "step_results", "xp_events", "skill_states", "streaks", "daily_activity", "freeze_events", "certificates",
      "review_requests", "notification_prefs", "entitlements", "subscriptions", "payments", "refund_requests", "billing_accounts", "student_checks"] as const;
    const out: Record<string, unknown> = { account: { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at } };
    for (const t of tables) {
      const { data } = await db.from(t).select("*").eq("user_id", user).limit(20000);
      out[t] = data ?? [];
    }
    out.support_tickets = (await db.from("support_tickets").select("id, subject, status, created_at").eq("user_id", user)).data ?? [];
    await audit(ctx, "learners.exported", "learners", { type: "learner", id: user, label: u.email ?? null }, { reason });
    const text = JSON.stringify({ exported_by: ctx.email, exported_at: new Date().toISOString(), ...out }, null, 2);
    return { csv: text, name: `uxgate-learner-${user.slice(0, 8)}.json`, mime: "application/json" };
  });
}

/** Deletes the account after 7 days (undo until then); renewal stops now. The learner's own delete waits 30 days. */
export async function deleteLearner(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.manage");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    const u = await emailOf(user);
    if (String(f.get("typed") ?? "").trim().toLowerCase() !== (u.email ?? "").toLowerCase()) throw new AdminError("invalid", "Type the learner's email exactly to confirm.");
    await requireFresh(ctx, f.get("code") as string | null);
    const db = createAdminClient();
    const { data: team } = await db.from("admin_members").select("user_id").eq("user_id", user).maybeSingle();
    if (team) throw new AdminError("forbidden", "This is a team account. Remove them from the team first.");
    const now = new Date();
    const after = new Date(now.getTime() + 7 * 86_400_000);
    check(await db.from("profiles").update({ delete_requested_at: now.toISOString(), delete_after: after.toISOString() }).eq("user_id", user));
    await onAccountDeletionScheduled(user);
    await db.from("push_subscriptions").delete().eq("user_id", user);
    await audit(ctx, "learners.delete_scheduled", "learners", { type: "learner", id: user, label: u.email ?? null }, { after: { delete_after: after.toISOString() }, reason });
  }, "Deletion scheduled in 7 days. Undo it here until then.");
}

export async function undoDelete(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.manage");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    check(await createAdminClient().from("profiles").update({ delete_requested_at: null, delete_after: null }).eq("user_id", user));
    await audit(ctx, "learners.delete_cancelled", "learners", { type: "learner", id: user }, { reason });
  }, "Deletion cancelled. Their plan does not restart by itself.");
}

/** Starts a 30-minute read-only view of the learner app as this learner. */
export async function startViewAs(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.view_as");
    const user = uuidFrom(f.get("user"));
    const reason = reasonFrom(f);
    const until = new Date(Date.now() + VIEW_AS_SECONDS * 1000).toISOString();
    check(await createAdminClient().from("admin_sessions").update({ view_as: { user, until } }).eq("session_id", ctx.sessionId));
    await audit(ctx, "learners.view_as_started", "learners", { type: "learner", id: user }, { after: { until }, reason });
  }, "Opening the learner view.");
}

export async function endViewAs(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("learners.view_as");
    const user = uuidFrom(f.get("user"));
    await createAdminClient().from("admin_sessions").update({ view_as: null }).eq("session_id", ctx.sessionId);
    await audit(ctx, "learners.view_as_ended", "learners", { type: "learner", id: user });
  }, "Left the learner view.");
}
