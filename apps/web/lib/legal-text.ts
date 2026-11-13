// Privacy policy, terms of use and refund policy, in English and Arabic. One file, so the approved text replaces this one in a single change.
// SAMPLE TEXT: this is the design's suggested draft (canvas v63). It is not approved. Keep every [PLACEHOLDER] until the admins
// fill it in. When the admins sign off, paste the approved text, set `approved: true` and set `updated` to the date it applies.
import type { Locale } from "../i18n/routing";

export type LegalSection = {
  /** Heading, without its number. */
  h: string;
  ps: string[];
  list?: string[];
  /** A highlighted paragraph after the list. */
  key?: string;
};
export type LegalDoc = { title: string; sections: LegalSection[] };
export type LegalKind = "privacy" | "terms" | "refund";

/** false while the text is the sample draft: the pages show the "SAMPLE TEXT" cap and ask search engines not to index them. */
export const LEGAL_STATUS: { approved: boolean; updated: string } = { approved: false, updated: "[DATE]" };

export const LEGAL: Record<LegalKind, Record<Locale, LegalDoc>> = {
  privacy: {
    en: {
      title: "Privacy policy",
      sections: [
        {
          h: "Who we are",
          ps: [
            "UXGate (uxgate.org) is a place to practise UX design in Arabic and English. It is run by [COMPANY LEGAL NAME], [ADDRESS]. This policy explains what we keep about you, why we keep it, and how you control it.",
          ],
        },
        {
          h: "What we collect",
          ps: ["We keep only what the service needs:"],
          list: [
            "Your account: your name, your email, and how you sign in (email and password, an email link, Google or Apple). We never see your Google or Apple password.",
            "Your learning: your answers, attempts, hints used, XP, goal, streak and freezes, skill states, badges and certificates.",
            "Your settings: language, theme, daily goal, reminder time, sound, and your notification choices.",
            "What you send us: review requests on a step, the reason you give, and emails to support.",
            "Payments: your plan, its status and dates. Our payment providers handle your card; we never see or keep your full card number.",
            "Technical data: browser type, device type, language and time zone, and error reports. Error reports never include your name or email.",
          ],
        },
        {
          h: "How we use it",
          ps: ["We use your data to:"],
          list: [
            "run your lessons, save your progress and plan your reviews;",
            "send the reminders and emails you chose, and the account emails that keep your account safe;",
            "answer your support emails and review requests;",
            "improve lessons using answer counts that don’t name you, for example how many people picked each choice;",
            "keep UXGate safe and working, for example by stopping abuse and fixing errors.",
          ],
        },
        {
          h: "What we never do",
          ps: [],
          key: "We never show ads and never use advertising trackers. We never sell your data or share it for advertising. Our analytics count visits without third-party cookies.",
        },
        {
          h: "Cookies",
          ps: [
            "We use only the cookies the service needs: one to keep you signed in, and small ones that remember your language and theme. There are no advertising or social media cookies, so there is nothing to accept or refuse.",
          ],
        },
        {
          h: "Who else handles it",
          ps: [
            "These services run parts of UXGate for us. Each one gets only what its job needs, and may use it only for that job:",
          ],
          list: [
            "Supabase: database and sign-in, hosted in Frankfurt, Germany.",
            "Vercel: website hosting, in its Frankfurt region.",
            "Resend: sending our emails.",
            "Bunny Stream: playing lesson videos.",
            "Sentry: error reports, without your name or email.",
            "Paymob (in Egypt) and Paddle (elsewhere): payments.",
            "Google and Apple: only if you choose to sign in with them.",
          ],
        },
        {
          h: "What other people can see",
          ps: ["Your profile is private. Two things are off until you turn them on in Settings:"],
          list: [
            "Achievement page: visitors see your name, your path, your skills Shown and the date. Never your email, answers or mistakes.",
            "Leaderboard: other learners see your name and your XP this week.",
            "Certificate links: anyone with the link can check that the certificate is real.",
          ],
        },
        {
          h: "Your choices and rights",
          ps: [],
          list: [
            "See and download all your data as one JSON file from Settings.",
            "Correct your name and email in Settings.",
            "Turn off any notification, the achievement page or the leaderboard at any time.",
            "Delete your account from Settings. We remove your personal data within 30 days. Sign in before then to undo.",
            "Ask us any question about your data, or object to how we use it, at support@uxgate.org. You can also complain to your data protection authority.",
          ],
        },
        {
          h: "How long we keep it",
          ps: [
            "We keep your data while your account is open. After you delete it, your personal data is removed within 30 days. We keep payment records for as long as tax law requires ([PERIOD]). Backups are deleted on a rolling basis within [N] days.",
          ],
        },
        {
          h: "How we protect it",
          ps: [
            "Every connection uses HTTPS. Our providers encrypt stored data. Your sign-in session cookie can’t be read by page scripts. Only a few team members can reach learner data, and only to run the service or answer you.",
          ],
        },
        {
          h: "Age",
          ps: [
            "UXGate is for people aged [MINIMUM AGE] or older. If you think a younger child has an account, write to us and we will delete it.",
          ],
        },
        {
          h: "Changes to this policy",
          ps: [
            "If we change something important, we tell you by email before it applies. The date at the top shows the last change.",
          ],
        },
        {
          h: "Contact us",
          ps: ["Write to support@uxgate.org. A person reads every email."],
        },
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      sections: [
        {
          h: "من نحن",
          ps: [
            "UXGate ‏(uxgate.org) مكان للتدرّب على تصميم UX بالعربية والإنجليزية، وتديره شركة [اسم الشركة القانوني]، ‏[العنوان]. توضّح هذه السياسة ما نحتفظ به عنك ولماذا، وكيف تتحكم فيه.",
          ],
        },
        {
          h: "ما الذي نجمعه",
          ps: ["نحتفظ فقط بما تحتاجه الخدمة:"],
          list: [
            "حسابك: اسمك وبريدك الإلكتروني وطريقة دخولك (البريد وكلمة المرور، أو رابط بالبريد، أو Google، أو Apple). لا نرى أبدًا كلمة مرورك في Google أو Apple.",
            "تعلّمك: إجاباتك ومحاولاتك والتلميحات التي استخدمتها ونقاط XP والهدف والسلسلة (streak) وأيام التجميد وحالات المهارات والشارات والشهادات.",
            "إعداداتك: اللغة والمظهر والهدف اليومي ووقت التذكير والصوت واختيارات الإشعارات.",
            "ما ترسله لنا: طلبات المراجعة على خطوة، والسبب الذي تكتبه، ورسائلك إلى الدعم.",
            "الدفع: باقتك وحالتها وتواريخها. يتولّى مزوّدو الدفع بطاقتك، ولا نرى رقمها كاملًا ولا نحتفظ به أبدًا.",
            "بيانات تقنية: نوع المتصفح والجهاز واللغة والمنطقة الزمنية وتقارير الأخطاء. تقارير الأخطاء لا تتضمن اسمك أو بريدك أبدًا.",
          ],
        },
        {
          h: "كيف نستخدمه",
          ps: ["نستخدم بياناتك من أجل:"],
          list: [
            "تشغيل دروسك وحفظ تقدّمك وتنظيم مراجعاتك؛",
            "إرسال التذكيرات والرسائل التي اخترتها، ورسائل الحساب التي تحافظ على أمانه؛",
            "الردّ على رسائلك إلى الدعم وطلبات المراجعة؛",
            "تحسين الدروس بأرقام إجابات لا تذكر اسمك، مثل عدد من اختار كل إجابة؛",
            "الحفاظ على أمان UXGate وعمله، مثل منع إساءة الاستخدام وإصلاح الأخطاء.",
          ],
        },
        {
          h: "ما لا نفعله أبدًا",
          ps: [],
          key: "لا نعرض إعلانات ولا نستخدم متتبّعات إعلانية. لا نبيع بياناتك ولا نشاركها لأغراض إعلانية. أدوات التحليل لدينا تحسب الزيارات بدون ملفات تعريف ارتباط (cookies) من طرف ثالث.",
        },
        {
          h: "ملفات تعريف الارتباط (cookies)",
          ps: [
            "نستخدم فقط ما تحتاجه الخدمة: ملفًا يُبقيك مسجّل الدخول، وملفات صغيرة تتذكّر لغتك ومظهرك. لا توجد ملفات إعلانية أو لمواقع التواصل، لذلك لا يوجد ما تقبله أو ترفضه.",
          ],
        },
        {
          h: "من يتعامل معها أيضًا",
          ps: [
            "هذه الخدمات تشغّل أجزاء من UXGate لنا. كل خدمة تحصل فقط على ما يحتاجه عملها، ولا تستخدمه إلا لهذا العمل:",
          ],
          list: [
            "Supabase: قاعدة البيانات وتسجيل الدخول، في فرانكفورت بألمانيا.",
            "Vercel: استضافة الموقع، في منطقة فرانكفورت.",
            "Resend: إرسال رسائلنا بالبريد.",
            "Bunny Stream: تشغيل فيديوهات الدروس.",
            "Sentry: تقارير الأخطاء، بدون اسمك أو بريدك.",
            "Paymob (في مصر) وPaddle (خارجها): الدفع.",
            "Google وApple: فقط إن اخترت الدخول بهما.",
          ],
        },
        {
          h: "ما يراه الآخرون",
          ps: ["ملفك الشخصي خاص. شيئان متوقفان حتى تفعّلهما من الإعدادات:"],
          list: [
            "صفحة الإنجازات: يرى الزوّار اسمك ومسارك ومهاراتك التي أثبتّها والتاريخ. لا يرون أبدًا بريدك أو إجاباتك أو أخطاءك.",
            "لوحة المتصدّرين (leaderboard): يرى المتعلّمون الآخرون اسمك ونقاطك هذا الأسبوع.",
            "روابط الشهادات: يستطيع أي شخص لديه الرابط التأكّد من أن الشهادة حقيقية.",
          ],
        },
        {
          h: "اختياراتك وحقوقك",
          ps: [],
          list: [
            "شاهد كل بياناتك ونزّلها في ملف JSON واحد من الإعدادات.",
            "صحّح اسمك وبريدك من الإعدادات.",
            "أوقف أي إشعار أو صفحة الإنجازات أو لوحة المتصدّرين في أي وقت.",
            "احذف حسابك من الإعدادات، ونحذف بياناتك الشخصية خلال 30 يومًا. سجّل الدخول قبلها للتراجع.",
            "اسألنا أي سؤال عن بياناتك، أو اعترض على طريقة استخدامها، على support@uxgate.org. ويمكنك أيضًا تقديم شكوى إلى جهة حماية البيانات في بلدك.",
          ],
        },
        {
          h: "مدة الاحتفاظ",
          ps: [
            "نحتفظ ببياناتك طالما حسابك مفتوح. بعد حذفه، تُحذف بياناتك الشخصية خلال 30 يومًا. نحتفظ بسجلات الدفع للمدة التي يطلبها قانون الضرائب ([المدة]). وتُحذف النسخ الاحتياطية تباعًا خلال [عدد] يومًا.",
          ],
        },
        {
          h: "كيف نحميها",
          ps: [
            "كل اتصال يستخدم HTTPS. ومزوّدونا يشفّرون البيانات المخزّنة. وملف جلسة الدخول لا تستطيع سكربتات الصفحة قراءته. وعدد قليل فقط من الفريق يصل إلى بيانات المتعلّمين، فقط لتشغيل الخدمة أو الردّ عليك.",
          ],
        },
        {
          h: "العمر",
          ps: ["UXGate لمن عمره [الحد الأدنى للعمر] عامًا أو أكثر. إن ظننت أن لطفل أصغر حسابًا، راسلنا وسنحذفه."],
        },
        {
          h: "تغيير هذه السياسة",
          ps: ["إن غيّرنا شيئًا مهمًا، نخبرك بالبريد قبل أن يبدأ العمل به. ويُظهر التاريخ أعلى الصفحة آخر تغيير."],
        },
        {
          h: "تواصل معنا",
          ps: ["راسلنا على support@uxgate.org، ويقرأ شخص من الفريق كل رسالة."],
        },
      ],
    },
  },
  terms: {
    en: {
      title: "Terms of use",
      sections: [
        {
          h: "About these terms",
          ps: [
            "These terms are an agreement between you and [COMPANY LEGAL NAME], which runs UXGate. By creating an account or using UXGate, you agree to them.",
          ],
        },
        {
          h: "The service",
          ps: [
            "UXGate gives you short practice lessons in UX design, skill checks, reviews and certificates, in Arabic and English. Some paths include short videos.",
          ],
        },
        {
          h: "Your account",
          ps: [],
          list: [
            "You must be [MINIMUM AGE] or older.",
            "One account per person. Keep your sign-in safe; you are responsible for what happens in your account.",
            "Use your real name if you want it on a certificate.",
          ],
        },
        {
          h: "Free and paid parts",
          ps: [
            "Unit 1 of every path, review and your profile are free. A subscription opens every other unit and the certificates.",
          ],
        },
        {
          h: "Subscription, cancelling and refunds",
          ps: [],
          key: "A monthly or an annual plan, priced by region: in Egypt 249 EGP a month or 2,249 EGP a year, in the Gulf $8 or $72, in other Arab countries $5 or $45, and in all other countries $8 or $72. No trial. A plan renews at the end of each period until you cancel. Payments go through Paymob in Egypt and Paddle elsewhere. Cancel any time in Settings and keep access until the end of the period you paid for. Ask for a refund within 7 days of a charge.",
        },
        {
          h: "Fair use",
          ps: ["Use UXGate to learn. Please don’t:"],
          list: [
            "share your account or sell access to it;",
            "copy lessons, videos or questions to publish them elsewhere;",
            "use bots or scripts to answer lessons or collect content;",
            "try to break, overload or get around the security of the service.",
          ],
        },
        {
          h: "Our content and yours",
          ps: [
            "Lessons, videos, illustrations and characters belong to UXGate or to the instructors who made them. You may use them for your own learning. Your answers and messages stay yours; you let us store and use them to run the service, as the privacy policy explains.",
          ],
        },
        {
          h: "Certificates",
          ps: [
            "A certificate says you passed every skill check in a path, on new cases with no hints. Anyone with its link can check it. We may withdraw a certificate earned by breaking these terms.",
          ],
        },
        {
          h: "Changes to the service",
          ps: [
            "We improve lessons and features over time. We may pause UXGate for maintenance and say when it will be back. If we remove something you pay for, we tell you first and you can cancel.",
          ],
        },
        {
          h: "Ending your account",
          ps: [
            "You can delete your account in Settings at any time. We may suspend or close an account that breaks these terms, and we tell you why. You can reply to us if you think we made a mistake.",
          ],
        },
        {
          h: "Our responsibility",
          ps: [
            "UXGate is a learning service. We work hard to keep it accurate and available, but we can’t promise it will never have errors or downtime. As far as the law allows, our responsibility to you is limited to what you paid us in the last 12 months. Nothing here limits rights you have by law.",
          ],
        },
        {
          h: "Law",
          ps: [
            "These terms follow the laws of [GOVERNING LAW]. Disputes go to the courts of [PLACE], unless the law of your country gives you another choice.",
          ],
        },
        {
          h: "Changes to these terms",
          ps: ["If we change something important, we tell you by email before it applies."],
        },
        {
          h: "Contact",
          ps: ["Write to support@uxgate.org."],
        },
      ],
    },
    ar: {
      title: "شروط الاستخدام",
      sections: [
        {
          h: "عن هذه الشروط",
          ps: [
            "هذه الشروط اتفاق بينك وبين شركة [اسم الشركة القانوني] التي تدير UXGate. بإنشاء حساب أو استخدام UXGate، أنت توافق عليها.",
          ],
        },
        {
          h: "الخدمة",
          ps: [
            "يقدّم لك UXGate دروس تدريب قصيرة في تصميم UX واختبارات مهارة ومراجعات وشهادات، بالعربية والإنجليزية. وبعض المسارات تتضمن فيديوهات قصيرة.",
          ],
        },
        {
          h: "حسابك",
          ps: [],
          list: [
            "يجب أن يكون عمرك [الحد الأدنى للعمر] عامًا أو أكثر.",
            "حساب واحد لكل شخص. حافظ على أمان بيانات دخولك، فأنت مسؤول عمّا يحدث في حسابك.",
            "استخدم اسمك الحقيقي إن أردته على الشهادة.",
          ],
        },
        {
          h: "الجزء المجاني والمدفوع",
          ps: ["الوحدة الأولى من كل مسار والمراجعة وملفك الشخصي مجانية. الاشتراك يفتح باقي الوحدات والشهادات."],
        },
        {
          h: "الاشتراك والإلغاء والاسترداد",
          ps: [],
          key: "خطة شهرية أو سنوية، بسعر حسب المنطقة: في مصر 249 ج.م شهريًا أو 2,249 ج.م سنويًا، وفي الخليج 8$ أو 72$، وفي باقي الدول العربية 5$ أو 45$، وفي كل الدول الأخرى 8$ أو 72$. بدون فترة تجريبية. تتجدّد الخطة في نهاية كل مدة حتى تلغيها. يتم الدفع عبر Paymob في مصر وPaddle خارجها. ألغِ متى شئت من الإعدادات ويبقى وصولك حتى نهاية المدة المدفوعة. اطلب استرداد المبلغ خلال 7 أيام من الدفع.",
        },
        {
          h: "الاستخدام العادل",
          ps: ["استخدم UXGate لتتعلّم. ونرجو ألا:"],
          list: [
            "تشارك حسابك أو تبيع الوصول إليه؛",
            "تنسخ الدروس أو الفيديوهات أو الأسئلة لنشرها في مكان آخر؛",
            "تستخدم برامج آلية للإجابة عن الدروس أو جمع المحتوى؛",
            "تحاول تعطيل الخدمة أو إثقالها أو تجاوز حمايتها.",
          ],
        },
        {
          h: "محتوانا ومحتواك",
          ps: [
            "الدروس والفيديوهات والرسوم والشخصيات ملك لـUXGate أو للمدرّبين الذين صنعوها، ويمكنك استخدامها لتعلّمك الشخصي. إجاباتك ورسائلك تبقى لك، وتسمح لنا بتخزينها واستخدامها لتشغيل الخدمة كما توضّح سياسة الخصوصية.",
          ],
        },
        {
          h: "الشهادات",
          ps: [
            "الشهادة تعني أنك اجتزت كل اختبارات المهارة في المسار، على حالات جديدة وبدون تلميحات. يستطيع أي شخص لديه رابطها التحقّق منها. وقد نسحب شهادة حُصل عليها بمخالفة هذه الشروط.",
          ],
        },
        {
          h: "تغييرات الخدمة",
          ps: [
            "نطوّر الدروس والمزايا باستمرار. وقد نوقف UXGate مؤقتًا للصيانة ونخبرك متى يعود. وإن أزلنا شيئًا تدفع مقابله، نخبرك أولًا ويمكنك الإلغاء.",
          ],
        },
        {
          h: "إنهاء حسابك",
          ps: [
            "يمكنك حذف حسابك من الإعدادات في أي وقت. وقد نوقف أو نغلق حسابًا يخالف هذه الشروط، ونخبرك بالسبب. ويمكنك الردّ علينا إن ظننت أننا أخطأنا.",
          ],
        },
        {
          h: "مسؤوليتنا",
          ps: [
            "UXGate خدمة تعليمية. نعمل جاهدين ليبقى دقيقًا ومتاحًا، لكن لا نستطيع أن نعد بأنه لن تحدث أخطاء أو توقفات أبدًا. وفي حدود ما يسمح به القانون، تقتصر مسؤوليتنا تجاهك على ما دفعته لنا في آخر 12 شهرًا. ولا شيء هنا يقيّد حقوقك التي يمنحها لك القانون.",
          ],
        },
        {
          h: "القانون",
          ps: [
            "تخضع هذه الشروط لقوانين [الدولة]. وتُنظر النزاعات أمام محاكم [المدينة]، ما لم يمنحك قانون بلدك خيارًا آخر.",
          ],
        },
        {
          h: "تغيير الشروط",
          ps: ["إن غيّرنا شيئًا مهمًا، نخبرك بالبريد قبل أن يبدأ العمل به."],
        },
        {
          h: "التواصل",
          ps: ["راسلنا على support@uxgate.org."],
        },
      ],
    },
  },
  // The refund policy Paddle's website approval asks for. Drafted from the terms' refund section and the in-app refund
  // form (7 days, asked in Plan and billing, answered by email). Sample text until the admins sign it off.
  refund: {
    en: {
      title: "Refund policy",
      sections: [
        {
          h: "Seven days to change your mind",
          ps: [
            "You can ask for a refund within 7 days of any charge: your first payment or a renewal, on a monthly or an annual plan.",
            "A refund gives back that charge in full. We don’t refund part of a period.",
          ],
        },
        {
          h: "How to ask",
          ps: ["Ask from your account, so we can find the charge quickly:"],
          list: [
            "Open Settings, then Plan and billing, then Ask for a refund.",
            "Ask for a refund for your latest charge and tell us why in a few words. One line is enough.",
            "Or write to support@uxgate.org from the email on your account.",
          ],
          key: "You get an email when the team answers. Pro stays on until then.",
        },
        {
          h: "After a refund",
          ps: [
            "The money goes back to the card or wallet you paid with. Your bank or wallet decides how long it takes to show, usually [N] business days.",
            "Pro ends and the plan stops renewing. Your progress, streak, badges and certificates stay in your account, and Unit 1 of every path stays open.",
          ],
        },
        {
          h: "After the 7 days",
          ps: [
            "A charge older than 7 days can’t be refunded, but you can cancel any time in Plan and billing. Nothing more is charged, and Pro stays on until the end of the period you paid for.",
            "Charged twice, or a charge you don’t recognise? Write to support@uxgate.org at any time and we’ll look into it.",
          ],
        },
        {
          h: "Who takes your payment",
          ps: [
            "In Egypt, payments go through Paymob, in Egyptian pounds. Everywhere else, Paddle (paddle.com) is our reseller and merchant of record: it takes the payment, and its name may appear on your statement. Paddle’s buyer terms also apply to those payments.",
            "Whichever provider took the payment, you ask for a refund the same way, from Plan and billing.",
          ],
        },
        {
          h: "Contact",
          ps: ["[COMPANY LEGAL NAME], [ADDRESS]. Email support@uxgate.org."],
        },
      ],
    },
    ar: {
      title: "سياسة الاسترداد",
      sections: [
        {
          h: "سبعة أيام لتغيير رأيك",
          ps: [
            "يمكنك طلب استرداد المبلغ خلال 7 أيام من أي دفعة: الدفعة الأولى أو التجديد، في الخطة الشهرية أو السنوية.",
            "الاسترداد يعيد مبلغ تلك الدفعة كاملًا. لا نسترد جزءًا من مدة.",
          ],
        },
        {
          h: "كيف تطلب الاسترداد",
          ps: ["اطلبه من حسابك حتى نجد الدفعة بسرعة:"],
          list: [
            "افتح الإعدادات، ثم «الخطة والدفع»، ثم «اطلب استرداد المبلغ».",
            "اطلب استرداد مبلغ آخر دفعة واكتب السبب في كلمات قليلة. سطر واحد يكفي.",
            "أو راسل support@uxgate.org من البريد المسجَّل في حسابك.",
          ],
          key: "تصلك رسالة بالبريد عندما يردّ الفريق. ويبقى Pro مفعّلًا حتى ذلك الوقت.",
        },
        {
          h: "بعد الاسترداد",
          ps: [
            "يعود المبلغ إلى البطاقة أو المحفظة التي دفعت بها. يحدّد البنك أو المحفظة مدة ظهوره، وهي عادةً [N] أيام عمل.",
            "ينتهي Pro ويتوقف تجديد الخطة. ويبقى تقدّمك وسلسلتك وشاراتك وشهاداتك في حسابك، والوحدة 1 من كل مسار متاحة.",
          ],
        },
        {
          h: "بعد مرور 7 أيام",
          ps: [
            "لا يمكن استرداد دفعة مرّ عليها أكثر من 7 أيام، لكن يمكنك الإلغاء في أي وقت من «الخطة والدفع». لن يُخصم منك شيء بعد ذلك، ويبقى Pro مفعّلًا حتى نهاية المدة التي دفعتها.",
            "خُصم منك مرتين، أو ترى دفعة لا تعرفها؟ راسل support@uxgate.org في أي وقت وسنراجعها.",
          ],
        },
        {
          h: "من يستلم دفعتك",
          ps: [
            "في مصر يتم الدفع عبر Paymob بالجنيه المصري. وفي باقي الدول، Paddle (paddle.com) هو الموزّع والبائع المسجَّل (merchant of record، أي الجهة التي تبيع وتستلم الدفع رسميًا)، وقد يظهر اسمه في كشف حسابك. وتنطبق شروط المشتري في Paddle على هذه الدفعات.",
            "أيًّا كانت الجهة التي استلمت الدفع، تطلب الاسترداد بالطريقة نفسها من «الخطة والدفع».",
          ],
        },
        {
          h: "التواصل",
          ps: ["[COMPANY LEGAL NAME]، [ADDRESS]. البريد: support@uxgate.org."],
        },
      ],
    },
  },
};
