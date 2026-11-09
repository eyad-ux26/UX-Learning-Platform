// The emails the app sends itself, in English and Arabic (canvas v63, EmailPages). Sign-in, sign-up and reset emails are
// Supabase Auth templates (supabase/templates). Inputs are plain data; every value is escaped by emailLayout.
// Copy lives in messages/s4/emails.*.json under `emails`, read directly (not through next-intl). Arabic uses the app's
// default masculine form of address. No email here uses loss-framed words, and reminder and goal are the same daily
// reminder: the goal copy is a variant, never a second email.

import en from "../../../messages/s4/emails.en.json";
import ar from "../../../messages/s4/emails.ar.json";
import { longDate } from "../../reminder-plan";
import { emailLayout, type EmailLocale } from "./layout";

export type EmailOut = { subject: string; html: string; text: string };

type Msgs = (typeof en)["emails"];
const msgs = (locale: EmailLocale): Msgs => (locale === "ar" ? ar : en).emails;

/** Fills {name} placeholders. Missing values stay visible as the bare name so a test can catch them. */
export function fill(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all));
}

type Forms = Record<"zero" | "one" | "two" | "few" | "many" | "other", string>;
/** Counted phrases ("about 6 minutes", «حوالي 6 دقائق») with each language's own plural forms. */
export function count(locale: EmailLocale, forms: Forms, n: number): string {
  const cat = new Intl.PluralRules(locale === "ar" ? "ar" : "en").select(n) as keyof Forms;
  return fill(forms[cat] ?? forms.other, { n });
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const clean = (s: string | null | undefined) => (s ?? "").trim();

// ───────── daily reminder ─────────

export type ReminderInput = {
  locale: EmailLocale;
  name?: string | null;
  /** e.g. "Pick the right control · Lesson 2" */
  lessonTitle: string;
  /** One line under the lesson title, e.g. "Radio buttons or a dropdown?" */
  lessonLead?: string | null;
  /** Illustration of the lesson's path, e.g. "path-forms". */
  lessonImg?: string | null;
  minutes: number;
  lessonHref: string;
  /** The reminder time as the learner set it, already formatted, e.g. "8:00 PM" or "8:00 م". */
  time: string;
  settingsHref: string;
  unsubscribeHref: string;
};

export function reminderEmail(i: ReminderInput): EmailOut {
  const m = msgs(i.locale);
  const r = m.reminder;
  const minutes = count(i.locale, m.count.aboutMinutes, i.minutes);
  const name = clean(i.name);
  const subject = r.subject;
  const out = emailLayout({
    locale: i.locale,
    preheader: fill(r.preheader, { lesson: i.lessonTitle, minutes }),
    heading: name ? fill(r.heading, { name }) : r.headingNoName,
    paragraphs: [fill(r.body, { minutes })],
    box: { title: i.lessonTitle, body: clean(i.lessonLead), img: i.lessonImg || "path-forms" },
    button: { label: r.button, href: i.lessonHref },
    notes: [fill(r.note, { time: i.time })],
    ill: "bulb",
    footer: { unsubscribeHref: i.unsubscribeHref, kindLabel: r.off },
    why: r.why,
    links: [{ label: r.changeTime, href: i.settingsHref }, "unsubscribe"],
  });
  return { subject, ...out };
}

// ───────── the same reminder when today's goal is still open (streak of 3 or more) ─────────

export type GoalInput = {
  locale: EmailLocale;
  /** Lessons done today and the daily goal. The copy is for the last lesson of the goal (done = goal - 1). */
  done: number;
  goal: number;
  /** The streak the next lesson makes (today included), 3 or more. */
  streak: number;
  minutes: number;
  lessonHref: string;
  /** Skills due for review now; 0 hides the review box. */
  reviewDue?: number;
  time: string;
  settingsHref: string;
  unsubscribeHref: string;
};

export function goalEmail(i: GoalInput): EmailOut {
  const m = msgs(i.locale);
  const g = m.goal;
  const minutes = count(i.locale, m.count.aboutMinutes, i.minutes);
  const review = (i.reviewDue ?? 0) > 0;
  const paragraphs = [
    ...(i.done > 0 ? [fill(g.done, { done: count(i.locale, m.count.lessonsDone, i.done), goal: count(i.locale, m.count.lessonsGoal, i.goal) })] : []),
    fill(g.next, { minutes, streak: count(i.locale, m.count.daysInRow, i.streak) }),
  ];
  const out = emailLayout({
    locale: i.locale,
    preheader: fill(review ? g.preheaderReview : g.preheader, { minutes: cap(minutes) }),
    heading: g.heading,
    // Both sentences are one paragraph in the design.
    paragraphs: [paragraphs.join(" ")],
    box: review ? { title: count(i.locale, m.count.skillsReady, i.reviewDue ?? 0), body: g.reviewBody, img: "review" } : undefined,
    button: { label: g.button, href: i.lessonHref },
    notes: [fill(g.note, { time: i.time })],
    ill: "flame",
    footer: { unsubscribeHref: i.unsubscribeHref, kindLabel: g.off },
    why: g.why,
    links: [{ label: g.changeTime, href: i.settingsHref }, "unsubscribe"],
  });
  return { subject: g.subject, ...out };
}

// ───────── welcome (once, after sign-up) ─────────

export type WelcomeInput = {
  locale: EmailLocale;
  name?: string | null;
  /** The starting path, e.g. "Forms That Flow", its Unit 1 title and illustration. */
  pathTitle: string;
  unitTitle: string;
  pathImg?: string | null;
  startHref: string;
  /** Formatted reminder time, or null when no reminder is set. */
  time?: string | null;
  settingsHref: string;
};

export function welcomeEmail(i: WelcomeInput): EmailOut {
  const w = msgs(i.locale).welcome;
  const name = clean(i.name);
  const out = emailLayout({
    locale: i.locale,
    preheader: fill(w.preheader, { path: i.pathTitle }),
    heading: name ? fill(w.heading, { name }) : w.headingNoName,
    paragraphs: [w.body],
    box: { title: fill(w.boxTitle, { path: i.pathTitle }), body: fill(w.boxBody, { unit: i.unitTitle }), img: i.pathImg || "path-forms" },
    button: { label: w.button, href: i.startHref },
    notes: i.time ? [fill(w.note, { time: i.time })] : [],
    ill: "gate",
    footer: "transactional",
    why: w.why,
    links: [{ label: w.all, href: i.settingsHref }],
  });
  return { subject: name ? fill(w.subject, { name }) : w.subjectNoName, ...out };
}

// ───────── free trial (0062): ends in 2 days, ended ─────────

export type TrialInput = { locale: EmailLocale; kind: "reminder" | "ended"; endsOn: string; plansHref: string };

export function trialEmail(i: TrialInput): EmailOut {
  const m = msgs(i.locale).trial;
  const r = i.kind === "reminder";
  const out = emailLayout({
    locale: i.locale,
    preheader: r ? m.reminderPreheader : m.endedPreheader,
    heading: r ? fill(m.reminderHeading, { date: i.endsOn }) : m.endedHeading,
    paragraphs: [r ? m.reminderBody : m.endedBody],
    button: { label: m.button, href: i.plansHref },
    ill: "gate",
    footer: "transactional",
    why: m.why,
  });
  return { subject: r ? fill(m.reminderSubject, { date: i.endsOn }) : m.endedSubject, ...out };
}

// ───────── badge turned gold (Kept) ─────────

export type BadgeInput = {
  locale: EmailLocale;
  /** The skill on the badge, e.g. "Cut fields you do not need". */
  skill: string;
  /** e.g. "Forms That Flow · Unit 1" */
  where: string;
  pathImg?: string | null;
  badgesHref: string;
  settingsHref: string;
  unsubscribeHref: string;
};

export function badgeEmail(i: BadgeInput): EmailOut {
  const b = msgs(i.locale).badge;
  const out = emailLayout({
    locale: i.locale,
    preheader: fill(b.preheader, { skill: i.skill }),
    heading: b.heading,
    paragraphs: [b.body],
    box: { title: i.skill, body: i.where, img: i.pathImg || "path-forms" },
    button: { label: b.button, href: i.badgesHref },
    ill: "medal",
    illAlt: b.illAlt,
    footer: { unsubscribeHref: i.unsubscribeHref, kindLabel: b.off },
    why: b.why,
    links: ["unsubscribe", { label: b.all, href: i.settingsHref }],
  });
  return { subject: b.subject, ...out };
}

// ───────── account set to be deleted (30-day undo) ─────────

export type DeletedInput = {
  locale: EmailLocale;
  /** When the account is removed (profiles.delete_after). */
  deleteAfter: Date | string;
  signinHref: string;
};

export function deletedEmail(i: DeletedInput): EmailOut {
  const m = msgs(i.locale);
  const d = m.deleted;
  const date = longDate(i.deleteAfter, i.locale);
  const out = emailLayout({
    locale: i.locale,
    preheader: fill(d.preheader, { date }),
    heading: d.heading,
    paragraphs: [fill(d.body, { date })],
    button: { label: d.button, href: i.signinHref, showLink: true },
    notes: [fill(d.note, { date }), m.common.copyLink],
    safety: d.safety,
    ill: "gate",
    footer: "transactional",
  });
  return { subject: d.subject, ...out };
}
