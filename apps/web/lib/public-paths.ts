// Public path pages (spec 4.1, EN-05): one static page per path at /{locale}/paths/{slug}, for visitors without an account.
// The 15 paths match slice 3's catalog. Names stay in English in both languages. A path is open only when it is marked open here
// AND the content bundle has lessons for it; the tests keep the two in step. Facts (units, lessons, skills) always come from the bundle.
import { content as defaultBundle, getCast, type ContentIndex, type Text } from "@uxgate/content";
import { routing, type Locale } from "../i18n/routing";

export type PathKind = "interactive" | "hybrid";

/** A step a visitor can answer on the page. `answer` is the index of the right option. Taken from a lesson (never a skill check). */
export type PublicSample = { unit: number; lesson: number; speaker: string; scenario: Text; question: Text; options: Text[]; answer: number; why: Text };
/** The sample clip area of a hybrid path: a poster with the clip's title. There is no video file on the public page. */
export type PublicClip = { unit: number; lesson: number; over: Text; title: Text; length: string; after: Text };

export type PublicPath = {
  id: string;
  slug: string;
  name: string;
  art: string;
  kind: PathKind;
  status: "open" | "soon";
  sub: Text;
  /** A shorter line for cards. Falls back to `sub`. */
  short?: Text;
  /** "What you'll be able to do". Falls back to each unit's skill line from the bundle. */
  can?: Text[];
  sample?: PublicSample;
  clip?: PublicClip;
};

const t = (en: string, ar: string): Text => ({ en, ar });

export const PUBLIC_PATHS: PublicPath[] = [
  {
    id: "P01", slug: "forms-that-flow", name: "Forms That Flow", art: "path-forms", kind: "interactive", status: "open",
    sub: t("Design forms people can finish, understand and recover from, in English and Arabic.", "صمّم نماذج يستطيع الناس إكمالها وفهمها والتعافي من أخطائها، بالعربية والإنجليزية."),
    short: t("Forms people finish, in English and Arabic.", "نماذج يُكملها الناس، بالعربية والإنجليزية."),
    can: [
      t("Cut the fields a form doesn’t need, and say why the rest stay.", "تحذف الحقول التي لا يحتاجها النموذج، وتشرح لماذا يبقى الباقي."),
      t("Pick the right control: one choice, many, a switch or a long list.", "تختار عنصر التحكم المناسب: اختيار واحد أو عدة اختيارات أو مفتاح أو قائمة طويلة."),
      t("Keep labels and hints visible while people type.", "تُبقي العناوين والتلميحات ظاهرة أثناء الكتابة."),
      t("Write error messages people can fix, in English and Arabic.", "تكتب رسائل خطأ يستطيع الناس إصلاحها، بالعربية والإنجليزية."),
      t("Make long forms everyone can finish, on a phone too.", "تصمّم نماذج طويلة يُكملها الجميع، على الهاتف أيضًا."),
    ],
    sample: {
      unit: 2, lesson: 1, speaker: "hana",
      scenario: t("New members pick one of my 3 plans when they sign up: Basic, Plus or Family.", "يختار الأعضاء الجدد باقة واحدة من باقاتي الثلاث عند التسجيل: أساسية أو بلس أو عائلية."),
      question: t("Which control fits the plan choice?", "أي عنصر تحكم يناسب اختيار الباقة؟"),
      options: [
        t("Three checkboxes", "ثلاثة مربعات اختيار (checkboxes)"),
        t("Three radio buttons", "ثلاثة أزرار اختيار (radio buttons)"),
        t("A dropdown list", "قائمة منسدلة (dropdown)"),
      ],
      answer: 1,
      why: t("One choice from a few visible options is a radio button job: people see all 3 plans and pick one.", "اختيار واحد من خيارات قليلة ظاهرة هو عمل أزرار الاختيار (radio buttons): يرى الناس الباقات الثلاث ويختارون واحدة."),
    },
  },
  {
    id: "P10", slug: "visual-hierarchy-in-action", name: "Visual Hierarchy in Action", art: "path-hierarchy", kind: "interactive", status: "open",
    sub: t("Help people see what matters first, on any screen and in any language.", "ساعد الناس على رؤية الأهم أولًا، على أي شاشة وبأي لغة."),
    short: t("Help people see what matters first.", "ساعد الناس على رؤية الأهم أولًا."),
    can: [
      t("Order a page so people can decide before they act.", "ترتّب الصفحة حتى يقرّر الناس قبل أن يتصرّفوا."),
      t("Group what belongs together with spacing, containers and headings.", "تجمع ما ينتمي معًا بالمسافات والحاويات والعناوين."),
      t("Give size, weight and colour a job, so the key thing stands out.", "تعطي الحجم وسُمك الخط واللون وظيفة، حتى يبرز الأهم."),
      t("Turn a wide layout into a narrow one and keep the meaning clear.", "تحوّل التخطيط العريض إلى ضيّق ويبقى المعنى واضحًا."),
      t("Keep a layout working with long text, Arabic and mixed directions.", "تُبقي التخطيط يعمل مع النصوص الطويلة والعربية والاتجاهات المختلطة."),
      t("Check a hierarchy claim by watching people use the design.", "تتحقّق من ادّعاء حول التسلسل البصري بمراقبة الناس وهم يستخدمون التصميم."),
    ],
    sample: {
      unit: 6, lesson: 1, speaker: "hana",
      scenario: t("I put “Book your free trial” at the top of my gym’s home page. Before testing it, I need a success rule for the task: “Try the gym for free this Friday morning.”", "وضعت «احجز تجربتك المجانية» في أعلى الصفحة الرئيسية لنادينا. وقبل اختبارها، أحتاج قاعدة نجاح للمهمة: «جرّب النادي مجانًا صباح الجمعة.»"),
      question: t("Which success rule should I use?", "أي قاعدة نجاح يجب أن أستخدم؟"),
      options: [
        t("They notice the free trial button", "يلاحظون زر التجربة المجانية"),
        t("They book a free trial for this Friday morning, without help", "يحجزون تجربة مجانية صباح الجمعة هذه، دون مساعدة"),
        t("They rate the page 4 or 5 out of 5", "يقيّمون الصفحة 4 أو 5 من 5"),
      ],
      answer: 1,
      // Split after "right" so scripts/lint-logical.mjs does not read "right:" as a CSS property.
      why: t("Success is the end of the task, done right" + ": the correct day, time and type, without help. Write it before the first session.", "النجاح هو نهاية المهمة، منجزة بشكل صحيح: اليوم والوقت والنوع الصحيح، دون مساعدة. اكتبه قبل الجلسة الأولى."),
    },
  },
  {
    id: "P14", slug: "patterns-that-fit", name: "Patterns That Fit", art: "rocket", kind: "hybrid", status: "open",
    sub: t("Pick the right interface pattern for the moment: dialogs, sheets, messages, search and filters.", "اختر نمط الواجهة المناسب للّحظة: النوافذ، والـ Bottom sheets، والرسائل، والبحث، والفلاتر."),
    short: t("The right pattern for the moment.", "النمط المناسب للموقف."),
    can: [
      t("Choose between a dialog, a toast and a banner.", "تختار بين نافذة الحوار والرسالة العابرة وشريط التنبيه."),
      t("Show only what’s needed and make the next step obvious.", "تعرض ما يلزم فقط وتجعل الخطوة التالية واضحة."),
      t("Set up search and filters people can use.", "تبني بحثًا وفلاتر يستطيع الناس استخدامها."),
      t("Offer choices people can trust.", "تقدّم اختيارات يثق بها الناس."),
      t("Build forms people finish.", "تبني نماذج يُكملها الناس."),
      t("Let people set numbers and dates fast.", "تتيح ضبط الأرقام والتواريخ بسرعة."),
    ],
    clip: {
      unit: 1, lesson: 1, length: "0:48",
      over: t("Interrupt only when it’s worth it", "قاطِع الناس فقط حين يستحق الأمر"),
      title: t("Dialog, toast or banner?", "نافذة حوار أم رسالة عابرة أم شريط تنبيه؟"),
      after: t("After the clip, you pick the right pattern for three new screens.", "بعد المقطع، تختار النمط المناسب لثلاث شاشات جديدة."),
    },
  },
  {
    id: "P02", slug: "find-and-fix-usability", name: "Find and Fix Usability", art: "path-usability", kind: "hybrid", status: "open",
    sub: t("Spot where people get stuck, and fix that first.", "اكتشف أين يتعثّر الناس، وأصلح ذلك أولًا."),
    sample: {
      unit: 1, lesson: 1, speaker: "sara",
      scenario: t("I'm designing an app for a parcel delivery company. Laila wants a courier to pick up a parcel from her home. She taps Book pickup. For four seconds nothing on the screen changes, so she taps again. Two couriers come to her door the next morning.", "أصمّم تطبيقًا لشركة توصيل طرود. تريد ليلى أن يأتي مندوب ليستلم طردًا من بيتها. ضغطت احجز الاستلام. ولمدة أربع ثوانٍ لم يتغيّر شيء على الشاشة، فضغطت مرة أخرى. وفي الصباح التالي جاء إلى بابها مندوبان."),
      question: t("Booking takes about four seconds. What should I change?", "الحجز يستغرق نحو أربع ثوانٍ. ماذا أغيّر؟"),
      options: [
        t("Add a line under the button: \"Booking can take a few seconds\"", "أضيف سطرًا تحت الزر: «قد يستغرق الحجز بضع ثوانٍ»"),
        t("Quietly ignore a second tap within ten seconds", "أتجاهل بهدوء أي ضغطة ثانية خلال عشر ثوانٍ"),
        t("Change the button to \"Booking…\" with a spinner, then show \"Pickup booked\" with the time", "أحوّل الزر إلى «جارٍ الحجز…» مع مؤشر دوّار، ثم أعرض «تم حجز الاستلام» مع الموعد"),
      ],
      answer: 2,
      why: t("The spinner tells Laila her tap was caught and the app is working, so she has no reason to tap again. The confirmation with the time tells her the result.", "المؤشر الدوّار يخبر ليلى أن ضغطتها وصلت وأن التطبيق يعمل، فلا يبقى سبب لتضغط مرة أخرى. والتأكيد مع الموعد يخبرها بالنتيجة."),
    },
  },
  { id: "P03", slug: "frame-the-right-problem", name: "Frame the Right Problem", art: "target", kind: "interactive", status: "soon", sub: t("Make sure you solve the problem that matters.", "تأكّد أنك تحلّ المشكلة التي تهمّ فعلًا.") },
  { id: "P04", slug: "user-flows-that-work", name: "User Flows That Work", art: "gate", kind: "interactive", status: "soon", sub: t("Plan the steps people take, from start to done.", "خطّط للخطوات التي يمرّ بها الناس من البداية حتى النهاية.") },
  { id: "P05", slug: "make-ux-accessible", name: "Make UX Accessible", art: "shield", kind: "interactive", status: "open", sub: t("Design that works for every ability and device.", "تصميم يناسب كل القدرات وكل الأجهزة."),
    sample: {
      unit: 1, lesson: 1, speaker: "hana",
      scenario: t("I'm choosing a class-booking system for my gym. The company selling it says it's \"fully accessible\" and shows a certificate. Two of our members are blind and use screen readers. One member uses a screen magnifier (a tool that makes part of the screen bigger).", "أختار نظامًا لحجز الحصص في النادي الذي أملكه. الشركة التي تبيعه تقول إنه «مناسب تمامًا لذوي الإعاقة» وتعرض شهادة. اثنان من أعضائنا مكفوفان ويستخدمان قارئ الشاشة. وعضوة تستخدم مكبّر الشاشة (Screen magnifier)، وهو أداة تكبّر جزءًا من الشاشة."),
      question: t("What should I do before I sign the contract?", "ماذا أفعل قبل أن أوقّع العقد؟"),
      options: [
        t("Ask those three members to book a class with it, on their own phones", "أطلب من هؤلاء الأعضاء الثلاثة أن يحجزوا حصة به، على هواتفهم"),
        t("Sign now; the certificate proves it works for them", "أوقّع الآن؛ فالشهادة تُثبت أنه يناسبهم"),
        t("Ask the company for the full list of points it passed", "أطلب من الشركة القائمة الكاملة للبنود التي نجح فيها"),
      ],
      answer: 0,
      why: t("One hour with a few members, on their own phones and tools, tells you more than any certificate. You'll see if they can book, and where they get stuck.", "ساعة واحدة مع بعض الأعضاء، على هواتفهم وبأدواتهم، تخبرك أكثر من أي شهادة. سترى هل يستطيعون الحجز، وأين يتوقّفون."),
    },
  },
  { id: "P06", slug: "better-user-interviews", name: "Better User Interviews", art: "bulb", kind: "interactive", status: "soon", sub: t("Ask, listen and learn what people really need.", "اسأل واستمع، واعرف ما يحتاجه الناس فعلًا.") },
  { id: "P07", slug: "turn-research-into-decisions", name: "Turn Research into Decisions", art: "key", kind: "interactive", status: "soon", sub: t("Go from findings to clear design choices.", "انتقل من النتائج إلى قرارات تصميم واضحة.") },
  { id: "P08", slug: "test-and-improve-usability", name: "Test and Improve Usability", art: "review", kind: "interactive", status: "soon", sub: t("Run quick tests and fix what they find.", "أجرِ اختبارات سريعة وأصلح ما تكشفه.") },
  { id: "P09", slug: "make-content-easy-to-find", name: "Make Content Easy to Find", art: "empty-box", kind: "interactive", status: "soon", sub: t("Menus and labels that lead to the right page.", "قوائم وعناوين تقود إلى الصفحة الصحيحة.") },
  { id: "P11", slug: "design-systems-in-action", name: "Design Systems in Action", art: "trophy", kind: "interactive", status: "soon", sub: t("Build components that stay consistent.", "ابنِ مكوّنات تبقى متّسقة.") },
  { id: "P12", slug: "design-better-ai-experiences", name: "Design Better AI Experiences", art: "bulb", kind: "interactive", status: "open", sub: t("AI features people understand and trust.", "ميزات ذكاء اصطناعي يفهمها الناس ويثقون بها."),
    sample: {
      unit: 1, lesson: 1, speaker: "karim",
      scenario: t("I build a bus ticket app. The team wants an AI chat assistant. Our top complaint: people can't find how to get a refund. The refund button is hidden in Settings.", "أبني تطبيقًا لتذاكر الحافلات. والفريق يريد مساعد محادثة بالذكاء الاصطناعي. وأكبر شكوى عندنا: الناس لا يجدون كيف يستردّون المال. وزر الاسترداد مخفي في الإعدادات."),
      question: t("What should we do first?", "ماذا يجب أن نفعل أولًا؟"),
      options: [
        t("Build the AI chat, so it can explain where the refund button is", "نبني محادثة الذكاء الاصطناعي، لتشرح مكان زر الاسترداد"),
        t("Put a \"Refund\" button on each ticket", "نضع زر «استرداد» على كل تذكرة"),
        t("Build AI that predicts who will ask for a refund", "نبني ذكاءً اصطناعيًا يتوقّع من سيطلب الاسترداد"),
      ],
      answer: 1,
      why: t("AI that explains a confusing design is a patch. First make the design clear.", "الذكاء الاصطناعي الذي يشرح تصميمًا مُربكًا مجرد ترقيع. اجعل التصميم واضحًا أولًا."),
    },
  },
  { id: "P13", slug: "ai-tools-for-better-ux", name: "AI Tools for Better UX", art: "rocket", kind: "interactive", status: "open", sub: t("Use AI tools to research and design faster.", "استخدم أدوات الذكاء الاصطناعي لتبحث وتصمّم أسرع."),
    sample: {
      unit: 1, lesson: 1, speaker: "youssef",
      scenario: t("I asked an AI tool to write the page for a new air fryer in my shop. It reads beautifully. It says \"5-year warranty\" and \"4.5-liter basket\". The box says 2 years and 3.5 liters.", "طلبت من أداة ذكاء اصطناعي أن تكتب صفحة قلّاية هوائية جديدة في متجري. وصياغتها رائعة. وهي تقول «ضمان 5 سنوات» و«سلة 4.5 لتر». والعلبة تقول سنتين و3.5 لتر."),
      question: t("What should I do before I publish?", "ماذا أفعل قبل النشر؟"),
      options: [
        t("Publish it. The writing is great, and buyers won't check", "أنشرها. فالصياغة رائعة، والمشترون لن يتحقّقوا"),
        t("Keep the writing, and check every number and claim against the box and the supplier's sheet", "أُبقي الصياغة، وأتحقّق من كل رقم وادعاء مقارنةً بالعلبة وورقة المورّد"),
        t("Fix the warranty and the basket size, and publish the rest", "أصلح الضمان وحجم السلة، وأنشر الباقي"),
      ],
      answer: 1,
      why: t("AI sounds just as sure when it's wrong. Check its facts against a source you trust.", "الذكاء الاصطناعي يبدو واثقًا بالقدر نفسه حين يخطئ. فتحقّق من معلوماته بمصدر تثق به."),
    },
  },
  {
    id: "P15", slug: "write-words-that-work", name: "Write Words That Work", art: "article", kind: "interactive", status: "open",
    sub: t("Write screen text people can scan, understand and act on, in a tone that fits the moment.", "اكتب نصوص الشاشات بحيث يتصفّحها الناس بسرعة ويفهمونها ويتصرّفون بها، وبنبرة تناسب الموقف."),
    short: t("Screen text people scan, understand and act on.", "نصوص شاشات يتصفّحها الناس ويفهمونها ويتصرّفون بها."),
    sample: {
      unit: 1, lesson: 1, speaker: "nour",
      scenario: t("I manage a clinic. A doctor is travelling, so we must move some appointments. Our SMS starts: \"Dear patient, as part of our commitment to the best care, and due to a change in Dr. Hazem's schedule…\"", "أدير عيادة. وأحد الأطباء مسافر، فلا بد أن نغيّر بعض المواعيد. ورسالتنا النصية تبدأ هكذا: «عزيزي المريض، حرصًا منّا على تقديم أفضل رعاية، ونظرًا لتغيّر في جدول د. حازم…»"),
      question: t("Which first sentence should the SMS have, so patients know what to do right away?", "بأي جملة يجب أن تبدأ الرسالة، حتى يعرف المرضى ما عليهم فورًا؟"),
      options: [
        t("\"Your Sunday visit with Dr. Hazem is now on Monday at 10:00. Reply 1 to confirm.\"", "«موعدك مع د. حازم يوم الأحد انتقل إلى الاثنين الساعة 10:00. أرسل 1 للتأكيد.»"),
        t("\"Thank you for trusting our clinic with your care.\"", "«شكرًا لثقتكم في عيادتنا.»"),
        t("\"Dr. Hazem will be at a medical conference next week.\"", "«د. حازم سيحضر مؤتمرًا طبيًا الأسبوع القادم.»"),
      ],
      answer: 0,
      why: t("Open with what changed for this person and what they should do. Thanks and reasons can follow.", "ابدأ بما تغيّر لهذا الشخص وما عليه أن يفعله. والشكر والأسباب تأتي بعد ذلك."),
    },
  },
];

export const SITE_URL = "https://uxgate.org";
export const artUrl = (p: Pick<PublicPath, "art">) => `/ill/uxgate-ill-${p.art}.png`;
export const publicPathBySlug = (slug: string) => PUBLIC_PATHS.find((p) => p.slug === slug);
export const publicPathById = (id: string) => PUBLIC_PATHS.find((p) => p.id === id);

/** The bundle has playable lessons for this path. */
export const isPublished = (pathId: string, b: ContentIndex = defaultBundle) => b.units.some((u) => u.pathId === pathId && u.lessons.length > 0);
/** Open on the public site: marked open and published. Anything else shows the Coming soon page, with nothing to sign up for. */
export const isOpen = (p: PublicPath, b: ContentIndex = defaultBundle) => p.status === "open" && isPublished(p.id, b);
/** Open paths first, in list order, then Coming soon. */
export const publicPathsInOrder = (b: ContentIndex = defaultBundle) => [...PUBLIC_PATHS.filter((p) => isOpen(p, b)), ...PUBLIC_PATHS.filter((p) => !isOpen(p, b))];

/** Every static path page: each path in every language. */
export function publicPathParams(locales: readonly string[] = routing.locales) {
  return locales.flatMap((locale) => PUBLIC_PATHS.map((p) => ({ locale, pathId: p.slug })));
}

/** Canonical and hreflang links for a public page. `path` starts with "/" and has no locale ("" for the home page). */
export function pageAlternates(locale: string, path: string) {
  return {
    canonical: `${SITE_URL}/${locale}${path}`,
    languages: { en: `${SITE_URL}/en${path}`, ar: `${SITE_URL}/ar${path}`, "x-default": `${SITE_URL}/en${path}` },
  };
}

export type UnitRow = { n: number; name: string; lessons: number; skills: number; free: boolean };
export type PathFacts = { units: number; lessons: number; skills: number; unitRows: UnitRow[]; can: string[] };

/** What the page shows about an open path, all counted from the bundle. */
export function pathFacts(p: PublicPath, locale: Locale, b: ContentIndex = defaultBundle): PathFacts {
  const units = b.units.filter((u) => u.pathId === p.id);
  const unitRows = units.map((u, i) => ({ n: i + 1, name: u.title[locale], lessons: u.lessons.length, skills: u.skills.length, free: u.free }));
  return {
    units: units.length,
    lessons: unitRows.reduce((s, u) => s + u.lessons, 0),
    skills: unitRows.reduce((s, u) => s + u.skills, 0),
    unitRows,
    can: p.can ? p.can.map((c) => c[locale]) : units.map((u) => u.skill[locale]),
  };
}

/** "Hana · Gym owner", from the cast. */
export function speakerLabel(id: string, locale: Locale) {
  const c = getCast(id);
  if (!c) return "";
  return locale === "ar" ? `${c.ar} · ${c.role_ar}` : `${c.en} · ${c.role_en}`;
}
