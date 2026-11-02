import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Lesson, Locale } from "@uxgate/content/types";
import { LessonRunner, GUEST_ID } from "@/components/LessonRunner";

/** Test page for the video step, with the 8-second test clip. Hidden once real clips are in lessons (set UG_VIDEO_TEST=0). */
const lesson: Lesson = {
  id: "TEST-VIDEO", mode: "lesson", minutes: 1, title: { en: "Video step test", ar: "اختبار خطوة الفيديو" },
  steps: [{
    id: "S01", type: "video", part: "concept", video: "test-clip", duration: 8,
    title: { en: "Watch the clip", ar: "شاهد المقطع" },
    transcript: [
      { t: 0, en: "This is the test clip.", ar: "هذا هو المقطع التجريبي." },
      { t: 3, en: "It has captions in English and Arabic.", ar: "فيه ترجمة نصية بالإنجليزية والعربية." },
      { t: 6, en: "The transcript follows along.", ar: "والنص الكامل يتابع معك." },
    ],
  }],
};

export default async function VideoTestPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.UG_VIDEO_TEST === "0") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <LessonRunner lesson={lesson} hash={"0".repeat(64)} locale={locale as Locale} pathLabel="UXGate" lessonNo={0} unitId="TEST" streak={0} userId={GUEST_ID} replay={null} guest />;
}
