# Slice 2 design brief: full lesson player

For the **Design** thread, sprint 2 (5 to 11 November 2026; start as soon as Sprint 1 is approved). Written by the PM thread.

Slice 2 completes everything that happens inside a lesson. Build follows in sprint 3, so every state the build needs must be on the canvas.

## Before you start

Sprint 1 design was approved by Eyad on 30 October 2026, with the three fixes done in canvas v23. Keep building on that canvas and PR #34.

## Deliver

All of these come in mobile (390) and desktop (1440), in English light and Arabic night, using the Sprint 1 design system without new styles unless they are needed.

| # | Screen or state | What to show |
| --- | --- | --- |
| 1 | **Remaining step types** | **predict** (graded, plus the ungraded try-first version with "any answer is fine"), **words** (pick the best microcopy), **fix** (pick the change that fixes a broken mock), **sort** (2 to 4 groups, tap to place, no drag needed), **order** (move up and move down), **match** (two lists, tap to pair), **spot** (tap the faulty area on a mock, with a list fallback), **choose with reason** (option, then reason). Each one selected, wrong with hint, and right |
| 2 | **Video step** | Player with English and Arabic captions, transcript panel, no autoplay with sound, replay, the clip's UXGate frame (see handoff 06) |
| 3 | **Concept card** | Under about 60 words, optional small diagram or illustration, Continue |
| 4 | **Feedback variants** | Right, "Also works" (a defensible alternative), wrong with the misconception message, hint 1 and 2, Show the answer with worked reasoning, "Why?" expanded |
| 5 | **Confidence tap** | Before Check on about 2 steps per lesson; Guessing, Fairly sure, Sure |
| 6 | **Skill check** | Intro (new case, no hints), steps with no per-step verdict, summary at the end with each skill's result |
| 7 | **Mastery round** | End of unit: "A few skills need one more try", fresh variants, finishing state |
| 8 | **Exit and resume** | Exit sheet ("Your answers are saved"), resume prompt on home and at the step |
| 9 | **Saving and offline in a lesson** | Saving, saved, offline banner ("Answers are kept on this device and sync when you're back"), sync done |
| 10 | **Guest sample lesson** | Entry from landing, the lesson as a guest, the result and the hand-off to sign up |
| 11 | **Ask for human review** | Entry point on a graded step and the short reason form (the support side comes with the admin panel) |
| 12 | **Illustrations** | Use the UXGate illustration set on lesson end, skill check summary, mastery round, offline and empty states |

Use real lesson content where you can: P01 Unit 1 and P10 Unit 1 (branches `content/p01-u01`, `content/p10-u01`) and `preview/player.html` for how each step behaves.

## Copy for the open Sprint 1 placeholders

- **Second hint** (Hana's gym step): EN "Name is for the welcome, email for the schedule, phone for urgent changes. Which field is left with no job?" AR «الاسم للترحيب، والبريد لجدول الحصص، والهاتف للتغييرات العاجلة. أي حقل لا يبقى له عمل؟»
- **Skill states:** Practiced تدرّبت · Shown أثبتّ · Kept أتقنت (approved by Eyad, 30 Oct).
- **FAQ** (landing):

| Question | Answer |
| --- | --- |
| Do I need design experience? · هل أحتاج خبرة في التصميم؟ | No. Paths start with everyday screens and build up. If you already work as a designer, onboarding points you to a path that fits. · لا. تبدأ المسارات بشاشات يومية ثم تتدرّج. وإن كنت تعمل مصممًا، يقترح عليك الإعداد مسارًا يناسبك. |
| How long is a lesson? · كم مدة الدرس؟ | 5 to 10 minutes. You can stop at any step; your answers are saved. · من 5 إلى 10 دقائق. يمكنك التوقف عند أي خطوة، وإجاباتك محفوظة. |
| What is free? · ما المجاني؟ | The first unit of every path, review, and your profile. The subscription unlocks every other unit and certificates. · الوحدة الأولى من كل مسار، والمراجعة، وملفك الشخصي. والاشتراك يفتح باقي الوحدات والشهادات. |
| Can I cancel? · هل يمكنني الإلغاء؟ | Yes, any time. You keep access until the end of the month you paid for, and you can ask for a refund within 7 days of a charge. · نعم، في أي وقت. يبقى وصولك حتى نهاية الشهر المدفوع، ويمكنك طلب استرداد خلال 7 أيام من الدفع. |
| Is it in Arabic? · هل المحتوى بالعربية؟ | Every lesson is in Arabic and English. Switch the language any time; UX terms stay in English with a short explanation. · كل درس بالعربية والإنجليزية. بدّل اللغة في أي وقت، وتبقى مصطلحات UX بالإنجليزية مع شرح قصير. |

- **Sound:** on by default in lessons (approved by Eyad, 30 Oct). Show the mute button in the lesson header on every new lesson screen.
- **Hints:** the content side is writing up to 2 hints for every graded step. Until then, use the sample hints already on the canvas.

## Credits

Follow `/mnt/project-files/delivery/credits-policy.md`: new screens on Opus high. Republish the canvas at milestones (for example after each group of step types), not after every small change. Take feedback in one batched message per review.

## Gate

Post the canvas link and update the design PR when done. The PM thread reviews against this list, then Eyad approves.
