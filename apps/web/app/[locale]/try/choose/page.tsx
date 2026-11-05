import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Lesson, Locale } from "@uxgate/content/types";
import { LessonRunner, GUEST_ID } from "@/components/LessonRunner";

/** Dev only (UG_DEV_FIXTURE=1): a choose step with an example screen. On a phone the example folds into a "Show the example again" bar once feedback is up; the axe check opens this page to see that bar. */
const T = (en: string, ar: string) => ({ en, ar });
const lesson: Lesson = {
  id: "DEV-CHOOSE", mode: "lesson", minutes: 2, title: T("Choose step", "خطوة اختيار"), speaker: "hana",
  steps: [
    {
      part: "guided", skill: "SK-DEV", hints: [T("Think about who needs it.", "فكّر في من يحتاجه.")], correct: T("Right.", "صحيح."), explain: T("The colour does not help anyone join.", "اللون لا يساعد أحدًا على الانضمام."),
      id: "S01", type: "choose", prompt: T("Which field can go?", "أي حقل يمكن حذفه؟"),
      mock: { caption: T("Join form", "نموذج الانضمام"), blocks: [{ kind: "title", text: T("Join the gym", "انضم إلى النادي") }, { kind: "field", label: T("Name", "الاسم"), text: "" }, { kind: "field", label: T("Favourite colour", "اللون المفضّل"), text: "" }] },
      options: [{ id: "o1", text: T("Name", "الاسم") }, { id: "o2", text: T("Favourite colour", "اللون المفضّل") }], answer: ["o2"],
    },
  ],
} as unknown as Lesson;

export const dynamic = "force-dynamic";

export default async function ChooseDevPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.UG_DEV_FIXTURE !== "1") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <LessonRunner lesson={lesson} hash={"2".repeat(64)} locale={locale as Locale} pathLabel="UXGate" lessonNo={1} unitId="DEV" streak={0} userId={GUEST_ID} replay={null} guest />;
}
