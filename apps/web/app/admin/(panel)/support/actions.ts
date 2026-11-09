"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { actionAdmin, AdminError, allowed, audit, check, requireFresh, run, type ActionResult } from "@/lib/admin/guard";
import { intFrom, reasonFrom, textFrom, uuidFrom } from "@/lib/admin/form";
import { replyOnTicket, sendSignInLink, updateTicket, type TicketStatus } from "@/lib/admin/data/support";

type R = ActionResult;
const STATUSES: TicketStatus[] = ["new", "open", "waiting_learner", "waiting_team", "resolved", "closed"];

const ticketIdFrom = (f: FormData) => {
  const id = Number(f.get("ticket"));
  if (!Number.isInteger(id) || id < 1) throw new AdminError("invalid", "Reload the page and try again.");
  return id;
};

/** A reply to the learner, or an internal note. A macro's actions run with the agent's own permissions. */
export async function sendReply(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("support.reply");
    const ticket = ticketIdFrom(f);
    const body = textFrom(f, "body", 20000, true, "the message")!;
    const db = createAdminClient();
    if (f.get("mode") === "note") {
      const tags = [...body.matchAll(/@([\p{L}\p{N}._-]{2,40})/gu)].map((m) => m[1]!.toLowerCase());
      let mentions: string[] = [];
      if (tags.length) {
        const { data: members } = await db.from("admin_members").select("user_id, email, display_name").eq("status", "active");
        mentions = (members ?? []).filter((m) => tags.some((t) => (m.display_name ?? "").toLowerCase().replace(/\s+/g, "").startsWith(t) || m.email.toLowerCase().startsWith(t))).map((m) => m.user_id);
      }
      check(await db.from("support_messages").insert({ ticket_id: ticket, kind: "note", author_id: ctx.userId, body, mentions }));
      await db.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticket);
      return { message: "Note added." };
    }
    const lang = f.get("lang") === "ar" ? "ar" : "en";
    const macroId = f.get("macro") ? uuidFrom(f.get("macro")) : null;
    let status: TicketStatus = STATUSES.includes(f.get("status") as TicketStatus) ? (f.get("status") as TicketStatus) : "waiting_learner";
    const ran: string[] = [];
    if (macroId) {
      const { data: m } = await db.from("support_macros").select("id, actions, uses").eq("id", macroId).maybeSingle();
      for (const a of (m?.actions ?? []) as string[]) {
        if (a === "resend_signin") {
          if (!allowed(ctx, "learners.act")) throw new AdminError("forbidden", "This macro resends the sign-in link, which your roles cannot do. Remove the macro or ask a lead.");
          const { data: t } = await db.from("support_tickets").select("user_id").eq("id", ticket).maybeSingle();
          if (!t?.user_id) throw new AdminError("invalid", "This ticket is not linked to a learner account, so no sign-in link can be sent.");
          await sendSignInLink(ctx, t.user_id);
          await db.from("support_messages").insert({ ticket_id: ticket, kind: "event", author_id: ctx.userId, body: `Action: sign-in link sent by ${ctx.name}` });
          ran.push("sign-in link sent");
        } else if (a.startsWith("status:") && STATUSES.includes(a.slice(7) as TicketStatus)) status = a.slice(7) as TicketStatus;
      }
      if (m) await db.from("support_macros").update({ uses: (m.uses ?? 0) + 1 }).eq("id", m.id);
    }
    const { delivered } = await replyOnTicket(ctx, ticket, body, { status, language: lang });
    if (!delivered) throw new AdminError("failed", "The reply is saved on the ticket but the email did not go out. Check the email settings, then send it again.");
    return { message: `Reply sent${ran.length ? ` and ${ran.join(", ")}` : ""}.` };
  });
}

/** Status, priority, category, assignee, tags or language. */
export async function changeTicket(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ticket = ticketIdFrom(f);
    const field = String(f.get("field"));
    const value = String(f.get("value") ?? "");
    const ctx = await actionAdmin("support.reply", "support.assign");
    if (field !== "assignee_id" && !allowed(ctx, "support.reply")) throw new AdminError("forbidden", "Your roles cannot change tickets.");
    if (field === "assignee_id") {
      // Anyone who replies can take a ticket; giving it to someone else needs support.assign.
      if (value && value !== ctx.userId && !allowed(ctx, "support.assign")) throw new AdminError("forbidden", "Your roles can take a ticket but not give it to others.");
      await updateTicket(ctx, ticket, { assignee_id: value ? uuidFrom(value) : null });
    } else if (field === "status") {
      if (!STATUSES.includes(value as TicketStatus)) throw new AdminError("invalid", "Pick a status.");
      await updateTicket(ctx, ticket, { status: value as TicketStatus });
    } else if (field === "priority") {
      if (!["low", "normal", "high", "urgent"].includes(value)) throw new AdminError("invalid", "Pick a priority.");
      await updateTicket(ctx, ticket, { priority: value });
    } else if (field === "category") {
      if (!["account", "billing", "content", "technical", "certificate", "idea", "other"].includes(value)) throw new AdminError("invalid", "Pick a category.");
      await updateTicket(ctx, ticket, { category: value });
    } else if (field === "language") {
      await updateTicket(ctx, ticket, { language: value === "ar" ? "ar" : "en" });
    } else if (field === "tags") {
      const tags = [...new Set(value.split(",").map((t) => t.trim().toLowerCase()).filter((t) => /^[\p{L}\p{N}_-]{1,30}$/u.test(t)))].slice(0, 10);
      await updateTicket(ctx, ticket, { tags });
    } else throw new AdminError("invalid", "Reload the page and try again.");
  }, "Saved.");
}

/** A ticket the team opens itself, for example after a phone call or a message on social media. */
export async function newTicket(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("support.reply");
    const email = String(f.get("email") ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminError("invalid", "Enter the learner's email.");
    const subject = textFrom(f, "subject", 300, true, "the subject")!;
    const body = textFrom(f, "body", 20000, true, "what they asked")!;
    const lang = f.get("lang") === "ar" ? "ar" : "en";
    const db = createAdminClient();
    const { data: t } = await db.from("support_tickets").insert({ email, subject, channel: "system", category: String(f.get("category") ?? "other"), language: lang, assignee_id: ctx.userId, status: "open" }).select("id").single();
    if (!t) throw new AdminError("failed", "The ticket was not saved. Try again.");
    check(await db.from("support_messages").insert({ ticket_id: t.id, kind: "note", author_id: ctx.userId, body }));
    await audit(ctx, "support.ticket_created", "support", { type: "ticket", id: String(t.id), label: subject });
    return { message: `Ticket #${t.id} created.`, id: t.id };
  });
}

// ───────── macros ─────────

const MACRO_ACTIONS = ["resend_signin", "status:waiting_learner", "status:resolved"];

export async function saveMacro(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("support.macros");
    const id = f.get("id") ? uuidFrom(f.get("id")) : null;
    const row = {
      title: textFrom(f, "title", 80, true, "the name")!, category: String(f.get("category") ?? "other"),
      body_en: textFrom(f, "body_en", 5000, true, "the English text")!, body_ar: textFrom(f, "body_ar", 5000, true, "the Arabic text")!,
      actions: f.getAll("actions").map(String).filter((a) => MACRO_ACTIONS.includes(a)), active: f.get("active") !== "off", updated_at: new Date().toISOString(),
    };
    if (row.title.length < 2) throw new AdminError("invalid", "Give the macro a name of at least 2 characters.");
    const db = createAdminClient();
    if (id) {
      const { data: before } = await db.from("support_macros").select("title, body_en, body_ar, actions, active").eq("id", id).maybeSingle();
      check(await db.from("support_macros").update(row).eq("id", id));
      await audit(ctx, "support.macro_changed", "support", { type: "macro", id, label: row.title }, { before, after: row });
    } else {
      const { data } = await db.from("support_macros").insert({ ...row, created_by: ctx.userId }).select("id").single();
      await audit(ctx, "support.macro_created", "support", { type: "macro", id: data?.id ?? "", label: row.title }, { after: row });
    }
  }, "Macro saved.");
}

// ───────── settings ─────────

export async function saveSupportSettings(_: R | null, f: FormData): Promise<R> {
  return run(async () => {
    const ctx = await actionAdmin("support.settings");
    const reason = reasonFrom(f);
    const n = (k: string, min: number, max: number, what: string) => {
      const v = intFrom(f, k, min, max, what);
      if (v === null) throw new AdminError("invalid", `Fill in ${what}.`);
      return v;
    };
    const sla: Record<string, { first: number; resolve: number }> = {};
    for (const p of ["urgent", "high", "normal", "low"]) sla[p] = { first: n(`${p}_first`, 1, 240, `the ${p} first reply hours`), resolve: n(`${p}_resolve`, 1, 720, `the ${p} resolution hours`) };
    const day = (k: string) => f.getAll(k).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    const hours = {
      tz: "Africa/Cairo",
      ar: { days: day("ar_days"), start: n("ar_start", 0, 23, "the Arabic start hour"), end: n("ar_end", 1, 24, "the Arabic end hour") },
      en: { days: day("en_days"), start: n("en_start", 0, 23, "the English start hour"), end: n("en_end", 1, 24, "the English end hour") },
    };
    if (hours.ar.end <= hours.ar.start || hours.en.end <= hours.en.start) throw new AdminError("invalid", "Business hours must end after they start.");
    const daysOff = String(f.get("days_off") ?? "").split(/[\s,]+/).filter(Boolean);
    if (daysOff.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new AdminError("invalid", "Write days off as dates like 2026-12-25, separated by commas.");
    const assignment = String(f.get("assignment"));
    if (!["manual", "round_robin", "category"].includes(assignment)) throw new AdminError("invalid", "Pick how tickets are assigned.");
    const category_assignees: Record<string, string> = {};
    for (const c of ["account", "billing", "content", "technical", "certificate", "idea", "other"]) {
      const v = String(f.get(`cat_${c}`) ?? "");
      if (v) category_assignees[c] = uuidFrom(v);
    }
    const limitUsd = Number(f.get("refund_limit"));
    if (!Number.isFinite(limitUsd) || limitUsd < 0 || limitUsd > 1000) throw new AdminError("invalid", "Set the agent refund limit between $0 and $1,000.");
    const row = {
      sla, hours, days_off: daysOff, assignment, category_assignees, warn_before_minutes: n("warn", 0, 1440, "the warning minutes"),
      auto_close_days: n("auto_close", 1, 30, "the auto-close days"), survey: f.get("survey") === "on",
      survey_text: { en: textFrom(f, "survey_en", 200) ?? "How did we do?", ar: textFrom(f, "survey_ar", 200) ?? "كيف كانت تجربتك معنا؟" },
      refund_limit_usd_minor: Math.round(limitUsd * 100), updated_at: new Date().toISOString(), updated_by: ctx.userId,
    };
    const db = createAdminClient();
    const { data: before } = await db.from("support_settings").select("sla, hours, days_off, assignment, category_assignees, warn_before_minutes, auto_close_days, survey, refund_limit_usd_minor").eq("id", 1).maybeSingle();
    // The agent refund limit decides which refunds skip Approvals: only someone who may approve any refund changes it, with a fresh code.
    if (before && before.refund_limit_usd_minor !== row.refund_limit_usd_minor) {
      if (!allowed(ctx, "refunds.approve_any")) throw new AdminError("forbidden", "Changing the agent refund limit needs a role that can approve any refund.");
      await requireFresh(ctx, f.get("code") as string | null);
    }
    check(await db.from("support_settings").update(row).eq("id", 1));
    await audit(ctx, "support.settings_changed", "support", { type: "settings", id: "support" }, { before, after: row, reason });
  }, "Settings saved. New tickets use them; open tickets keep their due times.");
}
