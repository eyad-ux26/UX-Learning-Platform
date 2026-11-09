// The 15 paths a learner can see (spec 4.4b), with no content bundle import, so client components can use the list
// without shipping lesson text to the browser (scripts/check-static.mjs). English names stay English in both languages; the 8 authored
// paths also have an Arabic name (nameAr, the content title.ar, kept in step by catalog.test.ts) shown on /ar pages.
export type CatalogEntry = { id: string; name: string; nameAr?: string; art: string; kind: "interactive" | "hybrid"; sub: { en: string; ar: string } };

export const CATALOG: CatalogEntry[] = [
  { id: "P01", name: "Forms That Flow", nameAr: "نماذج يُكملها الناس بسهولة (Form Design)", art: "path-forms", kind: "interactive", sub: { en: "Design forms people can finish, understand and recover from, in English and Arabic.", ar: "صمّم نماذج يستطيع الناس إكمالها وفهمها والتعافي من أخطائها، بالعربية والإنجليزية." } },
  { id: "P10", name: "Visual Hierarchy in Action", nameAr: "اجعل الأهم يُرى أولًا (Visual Hierarchy)", art: "path-hierarchy", kind: "interactive", sub: { en: "Help people see what matters first, on any screen and in any language.", ar: "ساعد الناس على رؤية الأهم أولًا، على أي شاشة وبأي لغة." } },
  { id: "P14", name: "Patterns That Fit", nameAr: "اختر عنصر الواجهة الصحيح (UI Patterns)", art: "rocket", kind: "hybrid", sub: { en: "Pick the right interface pattern for the moment: dialogs, sheets, messages, search and filters.", ar: "اختر نمط الواجهة المناسب للّحظة: النوافذ، والـ Bottom sheets، والرسائل، والبحث، والفلاتر." } },
  { id: "P02", name: "Find and Fix Usability", nameAr: "مبادئ سهولة الاستخدام العشرة (Usability Heuristics) عمليًا", art: "path-usability", kind: "hybrid", sub: { en: "Spot where people get stuck, and fix that first.", ar: "استخدم مبادئ سهولة الاستخدام العشرة (Usability heuristics) لتكتشف ما يجعل الشاشة صعبة الاستخدام، وتختار الإصلاح الذي يساعد." } },
  { id: "P03", name: "Frame the Right Problem", art: "target", kind: "interactive", sub: { en: "Make sure you solve the problem that matters.", ar: "تأكّد أنك تحلّ المشكلة التي تهمّ فعلًا." } },
  { id: "P04", name: "User Flows That Work", art: "gate", kind: "interactive", sub: { en: "Plan the steps people take, from start to done.", ar: "خطّط للخطوات التي يمرّ بها الناس من البداية حتى النهاية." } },
  { id: "P05", name: "Make UX Accessible", nameAr: "تصميم يناسب الجميع (Accessibility)", art: "shield", kind: "interactive", sub: { en: "Design that works for every ability and device.", ar: "تصميم يناسب كل القدرات وكل الأجهزة." } },
  { id: "P06", name: "Better User Interviews", art: "bulb", kind: "interactive", sub: { en: "Ask, listen and learn what people really need.", ar: "اسأل واستمع، واعرف ما يحتاجه الناس فعلًا." } },
  { id: "P07", name: "Turn Research into Decisions", art: "key", kind: "interactive", sub: { en: "Go from findings to clear design choices.", ar: "انتقل من النتائج إلى قرارات تصميم واضحة." } },
  { id: "P08", name: "Test and Improve Usability", art: "review", kind: "interactive", sub: { en: "Run quick tests and fix what they find.", ar: "أجرِ اختبارات سريعة وأصلح ما تكشفه." } },
  { id: "P09", name: "Make Content Easy to Find", art: "empty-box", kind: "interactive", sub: { en: "Menus and labels that lead to the right page.", ar: "قوائم وعناوين تقود إلى الصفحة الصحيحة." } },
  { id: "P11", name: "Design Systems in Action", art: "trophy", kind: "interactive", sub: { en: "Build components that stay consistent.", ar: "ابنِ مكوّنات تبقى متّسقة." } },
  { id: "P12", name: "Design Better AI Experiences", nameAr: "صمّم تجارب ذكاء اصطناعي أفضل (AI Experiences)", art: "bulb", kind: "interactive", sub: { en: "AI features people understand and trust.", ar: "ميزات ذكاء اصطناعي يفهمها الناس ويثقون بها." } },
  { id: "P13", name: "AI Tools for Better UX", nameAr: "استعن بالذكاء الاصطناعي في تصميم الـ UX (AI Tools)", art: "rocket", kind: "interactive", sub: { en: "Use AI tools to research and design faster.", ar: "استخدم أدوات الذكاء الاصطناعي لتبحث وتصمّم أسرع." } },
  { id: "P15", name: "Write Words That Work", nameAr: "كلمات تُفهم من أول قراءة (UX Writing)", art: "article", kind: "interactive", sub: { en: "Write screen text people can scan, understand and act on, in a tone that fits the moment.", ar: "اكتب نصوص الشاشات بحيث يتصفّحها الناس بسرعة ويفهمونها ويتصرّفون بها، وبنبرة تناسب الموقف." } },
];

export const catalogEntry = (id: string) => CATALOG.find((p) => p.id === id);
export const pathArtUrl = (id: string) => `/ill/uxgate-ill-${catalogEntry(id)?.art ?? "gate"}.png`;

/** The path name for a language: Arabic on /ar when the path has one, English otherwise (and always on /en). */
export const localPathName = (id: string, locale: string) => { const e = catalogEntry(id); return (locale === "ar" && e?.nameAr) || e?.name || id; };
