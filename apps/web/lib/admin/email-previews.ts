import "server-only";
import { badgeEmail, deletedEmail, goalEmail, reminderEmail, trialEmail, welcomeEmail, type EmailOut } from "@/lib/server/email/templates";
import { launchConfirmEmail } from "@/lib/server/email/launch";
import { campaignEmail } from "@/lib/server/email/campaign";
import type { EmailLocale } from "@/lib/server/email/layout";

// COM-1: every email the app sends, rendered with sample data, so the team can check both languages before a change
// ships. The wording lives in messages/s4/emails.*.json and is changed in a reviewed code change, not here.

const SITE = "https://uxgate.org";
const U = `${SITE}/en/app/settings/notifications`;
type Preview = { id: string; label: string; when: string; kind: "reminder" | "transactional" | "news"; render: (l: EmailLocale) => EmailOut };

export const PREVIEWS: Preview[] = [
  { id: "welcome", label: "Welcome", when: "After sign-up and onboarding", kind: "transactional",
    render: (locale) => welcomeEmail({ locale, name: locale === "ar" ? "سارة" : "Sara", pathTitle: locale === "ar" ? "نماذج سلسة" : "Forms That Flow", unitTitle: locale === "ar" ? "الوحدة 1" : "Unit 1", pathImg: "path-forms", startHref: `${SITE}/${locale}/app`, time: "8:00 PM", settingsHref: U }) },
  { id: "reminder", label: "Daily reminder", when: "At the learner's reminder time, if no lesson yet today", kind: "reminder",
    render: (locale) => reminderEmail({ locale, name: locale === "ar" ? "سارة" : "Sara", lessonTitle: locale === "ar" ? "اختر عنصر التحكم المناسب · الدرس 2" : "Pick the right control · Lesson 2", lessonLead: locale === "ar" ? "أزرار اختيار أم قائمة منسدلة؟" : "Radio buttons or a dropdown?", lessonImg: "path-forms", minutes: 4, lessonHref: `${SITE}/${locale}/app`, time: "8:00 PM", settingsHref: U, unsubscribeHref: `${SITE}/api/notifications/unsubscribe` }) },
  { id: "goal", label: "Goal still open", when: "Instead of the reminder, one lesson before the daily goal", kind: "reminder",
    render: (locale) => goalEmail({ locale, done: 1, goal: 2, streak: 6, minutes: 4, lessonHref: `${SITE}/${locale}/app`, reviewDue: 3, time: "8:00 PM", settingsHref: U, unsubscribeHref: `${SITE}/api/notifications/unsubscribe` }) },
  { id: "badge", label: "Badge earned", when: "When a skill is kept", kind: "reminder",
    render: (locale) => badgeEmail({ locale, skill: locale === "ar" ? "احذف الحقول غير اللازمة" : "Cut fields you do not need", where: locale === "ar" ? "نماذج سلسة · الوحدة 1" : "Forms That Flow · Unit 1", pathImg: "path-forms", badgesHref: `${SITE}/${locale}/app/profile`, settingsHref: U, unsubscribeHref: `${SITE}/api/notifications/unsubscribe` }) },
  { id: "trial-reminder", label: "Trial ends in 2 days", when: "2 days before a free trial ends", kind: "transactional",
    render: (locale) => trialEmail({ locale, kind: "reminder", endsOn: locale === "ar" ? "12 نوفمبر 2026" : "12 November 2026", plansHref: `${SITE}/${locale}/app/plans` }) },
  { id: "trial-ended", label: "Trial ended", when: "When a free trial ends without a payment", kind: "transactional",
    render: (locale) => trialEmail({ locale, kind: "ended", endsOn: locale === "ar" ? "12 نوفمبر 2026" : "12 November 2026", plansHref: `${SITE}/${locale}/app/plans` }) },
  { id: "deleted", label: "Account deletion started", when: "When a learner deletes their account (30 days to undo)", kind: "transactional",
    render: (locale) => deletedEmail({ locale, deleteAfter: new Date(Date.now() + 30 * 86_400_000), signinHref: `${SITE}/${locale}/signin` }) },
  { id: "launch", label: "Launch list confirmation", when: "When someone joins the Coming Soon list", kind: "transactional",
    render: (locale) => launchConfirmEmail({ locale, href: `${SITE}/${locale}/coming-soon/confirm` }) },
  { id: "campaign", label: "Campaign (news)", when: "Written in Communications, sent to an audience", kind: "news",
    render: (locale) => campaignEmail({ locale, subject: locale === "ar" ? "مسار جديد: الكتابة لتجربة المستخدم" : "New path: UX writing", body: locale === "ar" ? "أضفنا مسارًا جديدًا عن الكتابة لتجربة المستخدم (UX writing)، أي اختيار الكلمات في الواجهة.\n\nابدأ الوحدة الأولى مجانًا." : "We added a new path on UX writing: choosing the words in an interface.\n\nThe first unit is free.", button: { label: locale === "ar" ? "ابدأ الآن" : "Start now", href: `${SITE}/${locale}/paths` }, unsubscribeHref: `${SITE}/api/notifications/unsubscribe` }) },
];
