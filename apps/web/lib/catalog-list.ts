// The 15 paths a learner can see (spec 4.4b), with no content bundle import, so client components can use the list
// without shipping lesson text to the browser (scripts/check-static.mjs). English names stay English in both languages; the 8 authored
// paths also have an Arabic name (nameAr, the content title.ar, kept in step by catalog.test.ts) shown on /ar pages.
export type CatalogEntry = { id: string; name: string; nameAr?: string; art: string; kw?: { en: string[]; ar: string[] }; kind: "interactive" | "hybrid"; sub: { en: string; ar: string } };

export const CATALOG: CatalogEntry[] = [
  { id: "P01", name: "Forms That Flow", nameAr: "نماذج يُكملها الناس بسهولة (Form Design)", kw: { en: ["forms", "input fields", "validation", "error messages", "checkout", "sign up", "labels", "autofill", "required fields", "dropdown", "date picker"], ar: ["نماذج", "حقول الإدخال", "التحقق", "رسائل الخطأ", "الدفع", "التسجيل", "التسميات", "الملء التلقائي", "الحقول المطلوبة", "قائمة منسدلة", "اختيار التاريخ", "فورم", "فورمز", "تسجيل"] }, art: "path-forms", kind: "interactive", sub: { en: "Design forms people can finish, understand and recover from, in English and Arabic.", ar: "صمّم نماذج يستطيع الناس إكمالها وفهمها والتعافي من أخطائها، بالعربية والإنجليزية." } },
  { id: "P10", name: "Visual Hierarchy in Action", nameAr: "اجعل الأهم يُرى أولًا (Visual Hierarchy)", kw: { en: ["visual hierarchy", "contrast", "typography", "font size", "colors", "spacing", "layout", "emphasis", "scanning", "attention", "white space"], ar: ["التسلسل البصري", "التباين", "الخطوط", "حجم الخط", "الألوان", "المسافات", "التخطيط", "التركيز", "القراءة السريعة", "الانتباه", "المساحات البيضاء", "هيراركي", "كونتراست"] }, art: "path-hierarchy", kind: "interactive", sub: { en: "Help people see what matters first, on any screen and in any language.", ar: "ساعد الناس على رؤية الأهم أولًا، على أي شاشة وبأي لغة." } },
  { id: "P14", name: "Patterns That Fit", nameAr: "اختر عنصر الواجهة الصحيح (UI Patterns)", kw: { en: ["UI patterns", "dialog", "modal", "bottom sheet", "toast", "snackbar", "search", "filters", "navigation", "empty state", "components"], ar: ["أنماط الواجهة", "نافذة حوار", "Modal", "Bottom sheet", "Toast", "إشعار", "البحث", "الفلاتر", "التنقل", "الحالة الفارغة", "المكوّنات", "مودال", "بوتوم شيت", "توست", "ديالوج", "نافذة منبثقة"] }, art: "rocket", kind: "hybrid", sub: { en: "Pick the right interface pattern for the moment: dialogs, sheets, messages, search and filters.", ar: "اختر نمط الواجهة المناسب للّحظة: النوافذ، والـ Bottom sheets، والرسائل، والبحث، والفلاتر." } },
  { id: "P02", name: "Find and Fix Usability", nameAr: "مبادئ سهولة الاستخدام العشرة (Usability Heuristics) عمليًا", kw: { en: ["usability", "heuristics", "Nielsen", "usability testing", "friction", "pain points", "audit", "feedback", "consistency", "error prevention"], ar: ["قابلية الاستخدام", "المبادئ الإرشادية", "Heuristics", "اختبار الاستخدام", "العوائق", "نقاط الألم", "تدقيق", "التغذية الراجعة", "الاتساق", "منع الأخطاء", "يوزابيليتي", "هيوريستكس", "هيوريستيكس"] }, art: "path-usability", kind: "hybrid", sub: { en: "Spot where people get stuck, and fix that first.", ar: "استخدم مبادئ سهولة الاستخدام العشرة (Usability heuristics) لتكتشف ما يجعل الشاشة صعبة الاستخدام، وتختار الإصلاح الذي يساعد." } },
  { id: "P03", name: "Frame the Right Problem", art: "target", kind: "interactive", sub: { en: "Make sure you solve the problem that matters.", ar: "تأكّد أنك تحلّ المشكلة التي تهمّ فعلًا." } },
  { id: "P04", name: "User Flows That Work", art: "gate", kind: "interactive", sub: { en: "Plan the steps people take, from start to done.", ar: "خطّط للخطوات التي يمرّ بها الناس من البداية حتى النهاية." } },
  { id: "P05", name: "Make UX Accessible", nameAr: "تصميم يناسب الجميع (Accessibility)", kw: { en: ["accessibility", "a11y", "WCAG", "contrast", "screen reader", "color blindness", "keyboard", "tap target", "alt text", "inclusive design"], ar: ["إتاحة الوصول", "Accessibility", "WCAG", "التباين", "قارئ الشاشة", "عمى الألوان", "لوحة المفاتيح", "حجم اللمس", "النص البديل", "تصميم شامل", "اكسسبيليتي", "سكرين ريدر"] }, art: "shield", kind: "interactive", sub: { en: "Design that works for every ability and device.", ar: "تصميم يناسب كل القدرات وكل الأجهزة." } },
  { id: "P06", name: "Better User Interviews", art: "bulb", kind: "interactive", sub: { en: "Ask, listen and learn what people really need.", ar: "اسأل واستمع، واعرف ما يحتاجه الناس فعلًا." } },
  { id: "P07", name: "Turn Research into Decisions", art: "key", kind: "interactive", sub: { en: "Go from findings to clear design choices.", ar: "انتقل من النتائج إلى قرارات تصميم واضحة." } },
  { id: "P08", name: "Test and Improve Usability", art: "review", kind: "interactive", sub: { en: "Run quick tests and fix what they find.", ar: "أجرِ اختبارات سريعة وأصلح ما تكشفه." } },
  { id: "P09", name: "Make Content Easy to Find", art: "empty-box", kind: "interactive", sub: { en: "Menus and labels that lead to the right page.", ar: "قوائم وعناوين تقود إلى الصفحة الصحيحة." } },
  { id: "P11", name: "Design Systems in Action", art: "trophy", kind: "interactive", sub: { en: "Build components that stay consistent.", ar: "ابنِ مكوّنات تبقى متّسقة." } },
  { id: "P12", name: "Design Better AI Experiences", nameAr: "صمّم تجارب ذكاء اصطناعي أفضل (AI Experiences)", kw: { en: ["AI", "artificial intelligence", "chatbot", "LLM", "trust", "explainability", "human in the loop", "feedback", "confidence", "PAIR"], ar: ["الذكاء الاصطناعي", "AI", "روبوت محادثة", "LLM", "الثقة", "التفسير", "الإنسان في الحلقة", "التغذية الراجعة", "درجة الثقة", "PAIR", "شات بوت", "ايه اي"] }, art: "bulb", kind: "interactive", sub: { en: "AI features people understand and trust.", ar: "ميزات ذكاء اصطناعي يفهمها الناس ويثقون بها." } },
  { id: "P13", name: "AI Tools for Better UX", nameAr: "استعن بالذكاء الاصطناعي في تصميم الـ UX (AI Tools)", kw: { en: ["AI tools", "ChatGPT", "Figma AI", "prompts", "research synthesis", "automation", "wireframes", "personas", "productivity"], ar: ["أدوات الذكاء الاصطناعي", "ChatGPT", "Figma AI", "الأوامر", "تحليل الأبحاث", "الأتمتة", "Wireframes", "الشخصيات", "الإنتاجية", "شات جي بي تي"] }, art: "rocket", kind: "interactive", sub: { en: "Use AI tools to research and design faster.", ar: "استخدم أدوات الذكاء الاصطناعي لتبحث وتصمّم أسرع." } },
  { id: "P15", name: "Write Words That Work", nameAr: "كلمات تُفهم من أول قراءة (UX Writing)", kw: { en: ["UX writing", "microcopy", "content design", "tone of voice", "button labels", "error messages", "empty state", "onboarding copy", "clarity"], ar: ["كتابة UX", "Microcopy", "تصميم المحتوى", "نبرة الصوت", "نصوص الأزرار", "رسائل الخطأ", "الحالة الفارغة", "نصوص الترحيب", "الوضوح", "مايكروكوبي"] }, art: "article", kind: "interactive", sub: { en: "Write screen text people can scan, understand and act on, in a tone that fits the moment.", ar: "اكتب نصوص الشاشات بحيث يتصفّحها الناس بسرعة ويفهمونها ويتصرّفون بها، وبنبرة تناسب الموقف." } },
];

export const catalogEntry = (id: string) => CATALOG.find((p) => p.id === id);
export const pathArtUrl = (id: string) => `/ill/uxgate-ill-${catalogEntry(id)?.art ?? "gate"}.png`;

/** The path name for a language: Arabic on /ar when the path has one, English otherwise (and always on /en). */
export const localPathName = (id: string, locale: string) => { const e = catalogEntry(id); return (locale === "ar" && e?.nameAr) || e?.name || id; };

/** Lower-case and fold Arabic variants so a search matches however it is typed: أ إ آ -> ا, ى -> ي, ة -> ه, tashkeel and tatweel removed. */
export const foldSearch = (s: string) => s.toLowerCase().replace(/[ً-ٰٟـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();

/** Which paths match a search, in catalog order: the name, the description or a keyword, in the current language. `hit` is the matched keyword when the match came from keywords only. */
export function searchPaths(query: string, locale: "en" | "ar", ids: string[]): { id: string; hit?: string }[] {
  const q = foldSearch(query);
  if (!q) return ids.map((id) => ({ id }));
  const out: { id: string; hit?: string }[] = [];
  for (const id of ids) {
    const e = catalogEntry(id);
    if (!e) continue;
    const text = foldSearch(`${locale === "ar" && e.nameAr ? e.nameAr : e.name} ${e.sub[locale]}`);
    if (text.includes(q)) { out.push({ id }); continue; }
    const hit = e.kw?.[locale].find((k) => foldSearch(k).includes(q));
    if (hit) out.push({ id, hit });
  }
  return out;
}
