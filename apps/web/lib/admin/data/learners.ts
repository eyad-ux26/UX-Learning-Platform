import "server-only";
// Learners and Learner 360 (LRN-1, LRN-2). Reads use the service role after the guard checked the admin; the learner's
// own progress is read with the same code the learner app uses, so the panel shows what the learner sees.
import { content, type ContentIndex } from "@uxgate/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { readLearner } from "@/lib/server/learner-state";
import { buildPathView } from "@/lib/learning";
import { PAYMENT_COLS, type PaymentRow } from "./refunds";
import { TICKET_COLS, type Ticket } from "./support";

export type LearnerRow = {
  user_id: string; email: string; display_name: string | null; locale: string; country: string | null; joined_at: string; plan: "free" | "pro" | "comp";
  status: "active" | "past_due" | "cancelled" | "suspended" | "deleted"; pro_until: string | null; last_active: string | null; method: string; streak: number; total: number;
};

export type LearnerFilter = { q?: string; plan?: string; status?: string; locale?: string; country?: string; path?: string; joined?: string; active?: string; method?: string };

export async function learnerList(f: LearnerFilter, page: number, per = 50): Promise<{ rows: LearnerRow[]; total: number }> {
  const days = (v?: string) => (v && /^\d+$/.test(v) ? new Date(Date.now() - Number(v) * 86_400_000) : null);
  const { data, error } = await createAdminClient().rpc("admin_learners", {
    p_q: f.q || null, p_plan: f.plan || null, p_status: f.status || null, p_locale: f.locale || null, p_country: f.country || null, p_path: f.path || null,
    p_joined_from: days(f.joined)?.toISOString() ?? null, p_active_since: days(f.active)?.toISOString().slice(0, 10) ?? null, p_method: f.method || null,
    p_limit: per, p_offset: (page - 1) * per,
  });
  if (error) {
    console.error("admin learners list", error.code, error.message);
    return { rows: [], total: 0 };
  }
  const rows = (data ?? []) as LearnerRow[];
  return { rows, total: Number(rows[0]?.total ?? 0) };
}

export const pathTitle = (id: string, lang: "en" | "ar" = "en", b: ContentIndex = content) => b.paths.find((p) => p.id === id)?.title[lang] ?? id;
export const lessonTitle = (id: string, lang: "en" | "ar" = "en", b: ContentIndex = content) => {
  const l = b.lessons.find((x) => x.lessonId === id);
  return l ? `${l.body.title?.[lang] ?? id}` : id;
};

export type AuthFacts = { email: string; email_confirmed_at: string | null; last_sign_in_at: string | null; banned_until: string | null; created_at: string; methods: string[] };

/** Everything the Learner 360 page shows, in one round of parallel reads. */
export async function learner360(userId: string) {
  const db = createAdminClient();
  const [facts, profile, acct, subs, pays, tickets, notes, certs, reviews, billingEmails, emails, push, prefs, comp, student] = await Promise.all([
    db.rpc("admin_auth_facts", { p_user: userId }).then((r) => ((r.data ?? []) as AuthFacts[])[0] ?? null),
    db.from("profiles").select("display_name, locale, week_start, time_zone, created_at, reminder_time, delete_after, current_path_id").eq("user_id", userId).maybeSingle().then((r) => r.data),
    db.from("billing_accounts").select("country").eq("user_id", userId).maybeSingle().then((r) => r.data),
    db.from("subscriptions").select("id, provider, provider_sub_id, region, period, currency, renew_amount_minor, discount, status, current_period_end, grace_until, card_brand, card_last4, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5).then((r) => r.data ?? []),
    db.from("payments").select(PAYMENT_COLS).eq("user_id", userId).order("paid_at", { ascending: false }).limit(10).then((r) => (r.data ?? []) as PaymentRow[]),
    db.from("support_tickets").select(TICKET_COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(10).then((r) => (r.data ?? []) as Ticket[]),
    db.from("learner_notes").select("id, author_id, body, mentions, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50).then((r) => r.data ?? []),
    db.from("certificates").select("code, path_id, issued_at, revoked_at, reissued_at").eq("user_id", userId).order("issued_at", { ascending: false }).then((r) => r.data ?? []),
    db.from("review_requests").select("id, lesson_id, step_id, reason, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10).then((r) => r.data ?? []),
    db.from("billing_emails").select("kind, status, created_at, locale").eq("user_id", userId).order("created_at", { ascending: false }).limit(15).then((r) => r.data ?? []),
    db.from("email_log").select("kind, sent_at").eq("user_id", userId).order("sent_at", { ascending: false }).limit(15).then((r) => r.data ?? []),
    db.from("push_subscriptions").select("user_agent, created_at, last_ok_at").eq("user_id", userId).then((r) => r.data ?? []),
    db.from("notification_prefs").select("prefs").eq("user_id", userId).maybeSingle().then((r) => r.data?.prefs ?? null),
    db.from("admin_comp_grants").select("until, reason, kind, created_at, granted_by").eq("user_id", userId).order("created_at", { ascending: false }).limit(5).then((r) => r.data ?? []),
    db.from("student_checks").select("verified_at, valid_until").eq("user_id", userId).maybeSingle().then((r) => r.data),
  ]);
  if (!facts) return null;
  const learner = await readLearner(db, userId, { email: facts.email, host: null, adminView: true }).catch((e) => {
    console.error("admin learner 360: learner state", (e as Error).message);
    return null;
  });
  const lang: "en" | "ar" = profile?.locale === "ar" ? "ar" : "en";
  const paths = learner ? learner.joined.map((j) => {
    const v = buildPathView(j.pathId, learner.progress, learner.practicedSkills);
    return v ? {
      id: j.pathId, title: v.path.title[lang], startedAt: j.startedAt, lastActiveAt: j.lastActiveAt, done: v.doneCount, total: v.totalCount, next: v.next ? lessonTitle(v.next.lesson.lessonId, lang) : null,
      units: v.units.map((u) => {
        const skills = u.unit.skills.map((s) => learner.skillStates.get(s.id)?.state ?? null);
        return {
          id: u.unit.id, number: u.number, title: u.unit.title[lang], done: u.lessons.filter((l) => l.state === "done").length, total: u.lessons.length,
          practised: skills.filter((s) => s === "practiced").length, shown: skills.filter((s) => s === "shown").length, mastered: skills.filter((s) => s === "kept").length, skills: skills.length,
          lessons: u.lessons.map((l) => ({ id: l.lesson.lessonId, title: l.lesson.body.title?.[lang] ?? l.lesson.lessonId, state: l.state })),
        };
      }),
    } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x) : [];
  return { facts, profile, country: acct?.country ?? null, subs, pays, tickets, notes, certs, reviews, billingEmails, emails, push, prefs, comp, student, learner, paths, lang };
}

/** Recent audit entries about this learner (the activity timeline and "Audit trail for this learner"). */
export async function learnerAudit(userId: string, limit = 20) {
  const { data } = await createAdminClient().from("admin_audit").select("id, at, actor_email, action, reason").eq("target_type", "learner").eq("target_id", userId).order("at", { ascending: false }).limit(limit);
  return data ?? [];
}

/** The admin's live "view as" session for this learner, if it has not run out (30 minutes, logged). */
export async function viewAsUntil(sessionId: string, userId: string): Promise<Date | null> {
  const { data } = await createAdminClient().from("admin_sessions").select("view_as").eq("session_id", sessionId).maybeSingle();
  const v = data?.view_as as { user?: string; until?: string } | null;
  if (!v?.user || v.user !== userId || !v.until) return null;
  const until = new Date(v.until);
  return until.getTime() > Date.now() ? until : null;
}
