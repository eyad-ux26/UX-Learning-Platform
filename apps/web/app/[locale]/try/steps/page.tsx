import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Lesson, Locale } from "@uxgate/content/types";
import { LessonRunner, GUEST_ID } from "@/components/LessonRunner";

/** Dev only (UG_DEV_FIXTURE=1): one step of each type that no lesson uses yet, for screenshots and the keyboard and axe checks. */
const T = (en: string, ar: string) => ({ en, ar });
const base = { part: "guided", skill: "SK-DEV", hints: [T("Look at who needs it.", "انظر إلى من يحتاجه."), T("Think about the first screen.", "فكّر في الشاشة الأولى.")], correct: T("Right.", "صحيح."), explain: T("It follows the rule.", "هذا يتبع القاعدة.") };
const lesson: Lesson = {
  id: "DEV-STEPS", mode: "lesson", minutes: 5, title: T("Step types", "أنواع الخطوات"), speaker: "hana",
  steps: [
    { ...base, id: "S01", type: "sort", scenario: T("My gym's sign-up page has these fields.", "صفحة التسجيل في ناديّ فيها هذه الحقول."), prompt: T("Put each field where it belongs.", "ضع كل حقل في مكانه."),
      items: [{ id: "a", text: T("Email", "البريد الإلكتروني") }, { id: "b", text: T("Favourite colour", "اللون المفضّل") }, { id: "c", text: T("Phone", "الهاتف") }],
      buckets: [{ id: "keep", title: T("Keep", "أبقِ") }, { id: "drop", title: T("Remove", "احذف") }], answer: { keep: ["a", "c"], drop: ["b"] } },
    { ...base, id: "S02", type: "match", prompt: T("Match each field to its purpose.", "طابق كل حقل بغرضه."),
      left: [{ id: "l1", text: T("Email", "البريد") }, { id: "l2", text: T("Phone", "الهاتف") }], right: [{ id: "r1", text: T("Send the receipt", "إرسال الإيصال") }, { id: "r2", text: T("Call about a class change", "الاتصال عند تغيير حصة") }], answer: { l1: "r1", l2: "r2" } },
    { ...base, id: "S03", type: "spot", prompt: T("Tap the part that blocks people.", "اضغط على الجزء الذي يعيق الناس."),
      mock: { caption: T("Join form", "نموذج الانضمام"), blocks: [{ kind: "title", text: T("Join Hana's Gym", "انضم إلى نادي هنا") }, { kind: "field", label: T("Insurance number", "رقم التأمين"), text: "", region: "ins" }, { kind: "button", text: T("Join", "انضم"), region: "btn" }] },
      regions: [{ id: "ins", label: T("Insurance number field", "حقل رقم التأمين") }, { id: "btn", label: T("Join button", "زر الانضمام") }], answer: ["ins"] },
    { ...base, id: "S04", type: "predict", confidence: true, prompt: T("Which change will get more people to finish?", "أي تغيير سيجعل أناسًا أكثر يكملون؟"),
      options: [{ id: "o1", text: T("Remove optional fields", "إزالة الحقول الاختيارية") }, { id: "o2", text: T("Add a progress bar", "إضافة شريط تقدّم") }], answer: ["o1"] },
  ],
};

export const dynamic = "force-dynamic";

export default async function StepsDevPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.UG_DEV_FIXTURE !== "1") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <LessonRunner lesson={lesson} hash={"1".repeat(64)} locale={locale as Locale} pathLabel="UXGate" lessonNo={1} unitId="DEV" streak={0} userId={GUEST_ID} replay={null} guest />;
}
