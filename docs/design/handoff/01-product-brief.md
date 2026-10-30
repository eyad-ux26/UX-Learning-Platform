# UXGate product brief for design

## What UXGate is

UXGate (uxgate.org) is a practice-first learning platform for junior and working UI/UX designers in Arabic-speaking countries, in Arabic and English. Learners get better at UX by making real design decisions in short lessons of 5 to 10 minutes: they fix real screens, get feedback that explains why, and prove each skill on a new case.

UXGate already exists as a brand (Instagram posts, articles, UI/UX courses). This is a relaunch of the product on the same brand, not a new brand.

## Who uses it

| Who | What they need |
| --- | --- |
| Junior designer (main user), 20 to 30, mostly on a phone, Arabic first, reads English UX terms | Short practice that fits a commute, clear feedback, visible progress |
| Working designer filling gaps | Jump straight to a path, skip what they know |
| Guest | Try one real lesson before signing up |
| Admins (owner, content editor, support agent) | Run content, learners, billing and settings from an admin panel (designed in Sprint 2) |

## How learning works

- **Path** (a job-ready ability, e.g. "Forms That Flow") → **Unit** (one skill) → **Lesson** (8 to 12 steps, 5 to 10 min) → **Step** (one decision, then Check).
- Lesson order: hook (a real scenario) → try first (an ungraded prediction) → short concept card → guided steps → contrast (two close versions, pick the better one) → independent step on a new case → recap.
- **Selecting an answer never shows if it is right.** Only the Check button does. Then a feedback sheet explains the result.
- Wrong answer: feedback for that specific mistake, up to 2 hints, "Show the answer" after 3 tries. The first answer is kept.
- About 2 steps per lesson ask "How sure are you?" before Check.
- Each unit ends with a **skill check**: new scenario, no hints, no per-step verdict, a summary at the end.
- Skill states: **Practiced** → **Shown** (skill check passed) → **Kept** (passed again in review days later).
- Step types: choose (with reason), predict, words (microcopy), fix, tune (live preview), sort, order, match, spot (tap the problem on a screen), compare (two screens), video clip, concept card. Many steps show a **mock screen** (a small UI the learner judges).
- Some paths include short video clips (reels style) between steps.

## Motivation, calmly

XP (10 for a first-try answer, 5 with help, 0 when revealed), daily goal of 1 to 3 lessons, streak with up to 2 earned freezes, skill badges, review reminders. Weekly leaderboards only if the learner opts in.

**Never:** hearts or lives, energy, timers on thinking steps, paid streak repairs, guilt or loss messages ("You'll lose your streak!"), shaming wrong answers, mascots or cartoon worlds.

## Business

- Free: guest sample lesson, and unit 1 of every path. One monthly subscription unlocks everything ($5 to $10, shown in local currency; final price not set, show it as a placeholder).
- Payments: Paymob in Egypt, Paddle elsewhere.
- Certificate per path; optional public achievement page.

## Platform rules the design must meet

- **Mobile first** (360 to 390 px), installable web app. Desktop layouts recompose, they do not stretch.
- **Arabic is first class.** RTL is designed, not mirrored after the fact. Arrows and progress flip; logo, numbers, media controls and check marks do not.
- **Light and dark** themes from the same tokens.
- **WCAG 2.2 AA**: 4.5:1 text contrast, never colour alone for meaning (right/wrong always has an icon and a word), visible focus, 44 px touch targets, no drag-only interactions, respects reduced motion.
- Every component has its full state set: default, hover, focus, pressed, selected, disabled, loading, error.

## Inspiration, not copying

The team studied Duolingo and Brilliant for cleanliness, organisation, usability and motivation. **Do not copy their look, layouts, mascots or colours.** UXGate must look like UXGate: its own brand, its own components.

## Voice

A good senior designer in a review: calm, specific, encouraging. Short sentences, sentence case. Buttons are verbs that name the result ("Check", "Try again", "Continue", "Start lesson"). Feedback explains the consequence, not just the verdict. No emoji in the interface.

Arabic is simple Modern Standard Arabic. Keep English UX terms with a short Arabic explanation the first time, e.g. "التسلسل البصري (Visual hierarchy)". Check → تحقّق, Try again → حاول مرة أخرى, Continue → متابعة, Hint → تلميح.
