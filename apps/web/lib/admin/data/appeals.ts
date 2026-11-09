import "server-only";
// Appeals and review requests (SUP-10). A learner asks for a second look at one step; the team accepts (the answer
// counts, optional XP) or keeps the result, with a reply in both languages. The inbox item comes from the
// review_request_answered trigger; push and email are sent here, after the learner's own settings.
import { createAdminClient } from "@/lib/supabase/admin";
import { allowed as prefAllowed } from "@/lib/notifications";
import { loadPrefs, pushToLearner } from "@/lib/server/notify";
import { sendEmail } from "@/lib/server/email/send";
import { emailLayout, siteOrigin } from "@/lib/server/email/layout";
import { unsubHref } from "@/lib/email-token";
import { markPracticed } from "@/lib/server/skill-states";
import { REQUEST_COLUMNS, type RequestRow } from "@/lib/requests";
import { AdminError, audit, check, type AdminCtx } from "../guard";

export type AppealRow = RequestRow & { user_id: string; decided_by: string | null; to_quality: boolean };
export const APPEAL_COLS = `${REQUEST_COLUMNS}, user_id, decided_by, to_quality`;
export const REASON_LABEL: Record<string, string> = { answer_works: "My answer also works", unclear: "The question is unclear", broken: "Something is broken", other: "Something else" };
export const XP_CHOICES = [0, 5, 10] as const;

export type AppealTab = "open" | "accepted" | "declined" | "quality";
export async function appealList(tab: AppealTab, f: { reason?: string; lesson?: string }, page: number, per = 50) {
  const db = createAdminClient();
  let q = db.from("review_requests").select(APPEAL_COLS, { count: "exact" });
  if (tab === "quality") q = q.eq("to_quality", true);
  else q = q.eq("status", tab);
  if (f.reason && REASON_LABEL[f.reason]) q = q.eq("reason", f.reason);
  if (f.lesson && /^[A-Z0-9-]{3,40}$/.test(f.lesson)) q = q.eq("lesson_id", f.lesson);
  q = tab === "open" ? q.order("created_at", { ascending: true }) : q.order("replied_at", { ascending: false, nullsFirst: false });
  const { data, count } = await q.range((page - 1) * per, page * per - 1);
  return { rows: (data ?? []) as unknown as AppealRow[], total: count ?? 0 };
}

export async function appealCounts() {
  const db = createAdminClient();
  const c = (s: string) => db.from("review_requests").select("id", { count: "exact", head: true }).eq("status", s).then((r) => r.count ?? 0);
  const [open, accepted, declined, quality] = await Promise.all([c("open"), c("accepted"), c("declined"),
    db.from("review_requests").select("id", { count: "exact", head: true }).eq("to_quality", true).then((r) => r.count ?? 0)]);
  return { open, accepted, declined, quality };
}

/** How many other learners asked about the same step: a sign the question itself needs work. */
export async function sameStep(r: Pick<AppealRow, "id" | "lesson_id" | "step_id" | "user_id">) {
  const db = createAdminClient();
  const [{ data: same }, { data: mine }] = await Promise.all([
    db.from("review_requests").select("status").eq("lesson_id", r.lesson_id).eq("step_id", r.step_id).neq("id", r.id).limit(500),
    db.from("review_requests").select("status, replied_at").eq("user_id", r.user_id).neq("id", r.id).order("created_at", { ascending: false }).limit(50),
  ]);
  return {
    others: same?.length ?? 0, othersAccepted: (same ?? []).filter((x) => x.status === "accepted").length,
    before: mine?.length ?? 0, beforeAccepted: (mine ?? []).filter((x) => x.status === "accepted").length,
  };
}

/** The learner's latest try at this step, so "accept" can count it as right. */
async function latestResult(userId: string, lessonId: string, stepId: string) {
  const db = createAdminClient();
  const { data: attempts } = await db.from("attempts").select("id").eq("user_id", userId).eq("lesson_id", lessonId).order("started_at", { ascending: false }).limit(20);
  const ids = (attempts ?? []).map((a) => a.id as string);
  if (!ids.length) return null;
  const { data } = await db.from("step_results").select("id, attempt_id, skill_id, correct").eq("user_id", userId).eq("step_id", stepId).in("attempt_id", ids)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data as { id: string; attempt_id: string; skill_id: string | null; correct: boolean } | null;
}

export type Decision = { id: string; accept: boolean; reply: { en: string; ar: string }; xp: number; toQuality: boolean };

export async function decideAppeal(ctx: AdminCtx, d: Decision): Promise<{ notified: string[] }> {
  const db = createAdminClient();
  const r = check(await db.from("review_requests").select(APPEAL_COLS).eq("id", d.id).maybeSingle()) as unknown as AppealRow | null;
  if (!r) throw new AdminError("invalid", "That request was not found.");
  if (r.status !== "open") throw new AdminError("conflict", "Someone already answered this request. Reload the page.");
  const xp = d.accept ? d.xp : 0;

  // Claim the request first, so two people answering at once cannot both credit it.
  const { data: claimed } = await db.from("review_requests")
    .update({ status: d.accept ? "accepted" : "declined", reply: d.reply, replied_at: new Date().toISOString(), xp_added: xp, decided_by: ctx.userId, to_quality: d.toQuality || r.to_quality })
    .eq("id", d.id).eq("status", "open").select("id");
  if (!claimed?.length) throw new AdminError("conflict", "Someone already answered this request. Reload the page.");

  let credited = false;
  if (d.accept) {
    const res = await latestResult(r.user_id, r.lesson_id, r.step_id);
    if (res) {
      if (!res.correct) await db.from("step_results").update({ correct: true }).eq("id", res.id);
      if (res.skill_id) await markPracticed(db, r.user_id, [res.skill_id]);
      if (xp > 0) {
        const { data: ev } = await db.from("xp_events").select("id, amount").eq("attempt_id", res.attempt_id).eq("step_id", r.step_id).maybeSingle();
        if (ev) await db.from("xp_events").update({ amount: (ev.amount as number) + xp, outcome: "independent" }).eq("id", ev.id);
        else await db.from("xp_events").insert({ user_id: r.user_id, attempt_id: res.attempt_id, step_id: r.step_id, outcome: "independent", amount: xp });
      }
      credited = true;
    }
  }

  // A lesson report also opened a ticket; close it with a note so the inbox does not answer twice.
  const { data: t } = await db.from("support_tickets").select("id, status").eq("link_type", "review_request").eq("link_id", d.id).maybeSingle();
  if (t && !["resolved", "closed"].includes(t.status as string)) {
    await db.from("support_messages").insert({ ticket_id: t.id, kind: "event", author_id: ctx.userId, body: `Answered on the Appeals page by ${ctx.name}: ${d.accept ? "accepted" : "result kept"}.` });
    await db.from("support_tickets").update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", t.id);
  }

  await audit(ctx, d.accept ? "appeals.accepted" : "appeals.declined", "appeals", { type: "review_request", id: d.id, label: `${r.lesson_id} ${r.step_id}` },
    { before: { status: "open" }, after: { status: d.accept ? "accepted" : "declined", xp, credited, to_quality: d.toQuality, reply: d.reply } });

  return { notified: await tellLearner(r, d.accept, d.reply, xp) };
}

export async function sendToQuality(ctx: AdminCtx, id: string, on: boolean) {
  const db = createAdminClient();
  check(await db.from("review_requests").update({ to_quality: on }).eq("id", id));
  await audit(ctx, on ? "appeals.to_quality" : "appeals.quality_cleared", "appeals", { type: "review_request", id }, { after: { to_quality: on } });
}

/** Push and email, each only when the learner left it on for answers. Never throws: the answer is already saved. */
async function tellLearner(r: AppealRow, accepted: boolean, reply: { en: string; ar: string }, xp: number): Promise<string[]> {
  const out: string[] = [];
  const db = createAdminClient();
  try {
    const [prefs, { data: p }, { data: u }] = await Promise.all([
      loadPrefs(db, r.user_id),
      db.from("profiles").select("locale").eq("user_id", r.user_id).maybeSingle(),
      db.auth.admin.getUserById(r.user_id),
    ]);
    const lang: "en" | "ar" = p?.locale === "ar" ? "ar" : "en";
    const ar = lang === "ar";
    const href = `/${lang}/app/requests/${r.id}`;
    const title = accepted ? (ar ? "قبلنا إجابتك" : "We accepted your answer") : (ar ? "راجعنا طلبك" : "We reviewed your request");
    const line = accepted
      ? (ar ? (xp ? `أصبحت إجابتك محسوبة، وأضفنا ${xp} نقطة خبرة.` : "أصبحت إجابتك محسوبة.") : (xp ? `Your answer now counts, and we added ${xp} XP.` : "Your answer now counts."))
      : (ar ? "أبقينا النتيجة كما هي. اقرأ السبب في ردّنا." : "We kept the result as it is. Read why in our reply.");
    if (prefAllowed(prefs, "answer", "push")) {
      const n = await pushToLearner(db, r.user_id, { title, body: line, url: href, tag: "answer" });
      if (n) out.push("push");
    }
    const email = u?.user?.email;
    if (email && prefAllowed(prefs, "answer", "email")) {
      const l = emailLayout({
        locale: lang, preheader: line, heading: title,
        paragraphs: [line, (ar ? reply.ar : reply.en) || reply.en],
        button: { label: ar ? "اقرأ الرد" : "Read the reply", href: `${siteOrigin()}${href}` },
        footer: { unsubscribeHref: await unsubHref(r.user_id, "answer", lang), kindLabel: ar ? "رسائل الردود على طلباتك" : "emails about answers to your requests" },
        links: ["unsubscribe"], signoff: true,
      });
      const s = await sendEmail({ to: email, subject: title, html: l.html, text: l.text, kind: "answer", userId: r.user_id, locale: lang });
      if (s.ok) out.push("email");
    }
  } catch (e) {
    console.error("admin appeal: notify", (e as Error).message);
  }
  return out;
}
