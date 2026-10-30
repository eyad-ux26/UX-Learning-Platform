# User stories

Version 1, 30 October 2026. One entry per backlog story in [backlog.md](backlog.md), with who, what, why and the checks a reviewer runs. GitHub Issues hold the live copy; open each sprint's stories as issues at that sprint's planning. The [Definition of Done](definition-of-done.md) applies to every story on top of its own checks.

Roles: **guest**, **learner** (free or subscriber), **owner**, **content editor**, **support agent** (see [spec §3](../product/spec.md)). Engineering stories are written for the team that runs the platform.

---

## Sprint 1 · 29 Oct – 4 Nov · Design foundations (Claude Design)

Goal: an approved UXGate design system and the core learner screens, made in Claude Design. Inputs are in the design handoff pack (project files, `design-handoff/`).

### DS-01 Brand applied to the product · 3 pts

As a learner, I want UXGate to look and sound like the UXGate I already know from its posts and courses, so that I trust it straight away.

- Uses the original UXGate logo unchanged, in full colour, white, black, icon and vertical versions, with clear-space and minimum-size rules.
- The colour palette is taken from the UXGate Brand Resources (navy, UXGate blue, cyan, ice, mint, night), extended into a product palette with status colours that stay separate from brand colours.
- Arabic type is **Cairo** (Google Fonts, decided by Eyad on 30 Oct 2026). Latin type is **Titillium Web** (Google Fonts), the face Cairo's own Latin letters are based on, so both scripts match in shape, weight and height. No other UI fonts.
- One page of voice rules with examples in both languages: buttons, feedback, errors, empty states.
- Shows the brand applied to one marketing tile and one app screen side by side, so the link to the existing brand is visible.

### DS-02 Design tokens · 3 pts

As the team, I want every colour, size and timing as a named token, so that the app, admin panel and videos stay consistent and themeable.

- Semantic colour tokens for light and dark (ground, surfaces, text, lines, brand, highlight, status, focus), every text pair at WCAG AA 4.5:1 or better, measured.
- Type scale for Latin and Arabic in Cairo and Titillium Web (Arabic lines taller than Latin), spacing on a 4 px base, radius, elevation, motion durations and easing.
- Tokens exported as JSON and CSS variables with the same names.
- Light and dark shown side by side for every token group.

### DS-03 Core components · 5 pts

As the team, I want the basic components with every state, so that any screen can be built without inventing new parts.

- Button (primary, secondary, ghost, icon, sizes), text field, select, checkbox, radio, switch, chip, tabs, bottom nav, top bar, sheet, dialog, toast, progress bar, avatar, badge, empty state, skeleton.
- Each with default, hover, focus, pressed, selected, disabled, loading and error where they apply (U24).
- Shown in light and dark, LTR and RTL. Touch targets at least 44 px.
- Uses one free icon library throughout (Phosphor recommended), with one similar backup only for gaps.

### DS-04 Learning components · 5 pts

As a learner, I want lesson parts that make each decision clear and calm, so that I focus on the design problem, not the interface.

- Step frame with progress, choice card (with A–D keys), Check bar, feedback sheet (right, wrong, also works), hint, Show the answer, confidence tap, mock-screen frame, concept card, recap list.
- Motivation parts: XP, daily goal ring or bar, streak with freeze, skill state chips (Practiced, Shown, Kept), badge.
- Selecting never looks like right or wrong; only the feedback sheet after Check shows the verdict, with an icon and a word, not colour alone (U16, U25).
- Shown for at least three step types: choose, compare, spot.

### DS-05 Key screens · 5 pts

As a learner, I want the main journey designed end to end, so that the team can build it without guessing.

- Mobile at 360 to 390 px: landing, sign up, onboarding (3 questions), home, path map, lesson step (selected, wrong with hint, right), lesson end.
- Each screen in English (LTR) and Arabic (RTL), light and dark.
- Real copy from the handoff pack, never lorem ipsum.
- A clickable flow from landing to lesson end.

### DS-09 Logo motion review · 1 pt

As an admin, I want to approve the logo animations before the app uses them, so that the logo moves the way the brand should.

- The six animations in `docs/design/system/logo-motion/` (splash, gate opens, loading, checking, success, idle blink) are reviewed; each is approved, changed or dropped.
- Approved animations are placed in the design system's motion page.

### PM-01 Technical files · 2 pts · done

As the team, I want the spec, architecture, data model, backlog and templates written, so that sprints can start. Delivered in PR #9.

---

## Sprint 2 · 5 – 11 Nov · Full prototype and app skeleton

### DS-06 Remaining learner screens · 5 pts

As a learner, I want every screen I will meet designed, so that nothing in the beta looks improvised.

- Every step type (choose with reason, predict, words, fix, tune, sort, order, match, spot, compare, video, concept card).
- Skill check (no per-step verdict, summary at the end), mastery round, review session.
- Profile, settings (language, theme, goal, reminders, data export, delete account), paywall, checkout result, certificate, public achievement page.
- Empty, error, offline and loading states, including "your answers are saved".
- EN and AR, light and dark.

### DS-07 Admin panel screens · 5 pts

As an owner, I want the admin panel designed, so that we can run content, support and billing from day one.

- Desktop first, usable on a tablet: content browser (path → unit → skill → lesson → step → variants), lesson preview in both languages, content quality table, learner lookup and detail, appeals queue, prices and refunds, settings and feature flags, email templates, reports, admins and audit log.
- English interface with Arabic content shown side by side.
- Tables with sorting, filters and empty states.

### DS-08 Clickable prototype and desktop pass · 3 pts

As an admin, I want to click through the core loop on phone and desktop, so that I can approve the design before code starts.

- Prototype links guest sample lesson → sign up → onboarding → home → lesson → lesson end → paywall.
- Desktop layouts recompose (U47): home, path map, lesson, settings.

### EN-01 App skeleton · 5 pts

As the team, I want a Next.js app wired to the tokens, so that every screen is built on the same base.

- Monorepo with `apps/web` and `packages/tokens` generated from the approved tokens JSON.
- English and Arabic routes with `dir` set; theme switch (system, light, dark).
- Lint rule blocks physical CSS properties; CI runs typecheck, lint, tests and content validation.
- Deployed to a Vercel preview on every PR.

### EN-02 Supabase setup · 3 pts

As the team, I want staging and production databases with tested access rules, so that learner data is safe from the first table.

- Two Supabase projects, migrations in the repo, applied by CI to staging.
- A test harness that proves a learner cannot read another learner's rows.

---

## Sprint 3 · 12 – 18 Nov · Accounts and public site

### EN-03 Sign up and sign in · 5 pts

As a guest, I want to create an account the way I prefer, so that my progress is saved.

- Email and password, email link, Google and Apple.
- Password reset and email-link emails sent by Resend in the learner's language.
- Errors say what to do next, in both languages.

### EN-04 Profile and onboarding · 3 pts

As a new learner, I want a quick start that picks a path for me, so that I begin practising in under a minute.

- Three questions (goal, level, weekly time), skippable; a recommended path with the reason; any path can be chosen.
- Daily goal (1, 2 or 3 lessons) and reminder time saved to the profile.

### EN-05 Public landing and path pages · 5 pts

As a guest, I want to understand UXGate and its paths before I sign up, so that I know it is worth my time.

- Landing and one page per path, statically built, in both languages with `hreflang`.
- Price shown in local currency; FAQ; support email in the footer.
- LCP under 2.5 s on 4G.

### EN-06 Content compiler and publish · 5 pts

As a content editor, I want approved YAML to become a published, versioned lesson, so that learners always play a known version.

- Build step validates YAML and compiles it to JSON bundles in `content_versions`.
- Each attempt records the version it was played on.

---

## Sprint 4 · 19 – 25 Nov · Lesson player

### EN-07 Player core and first step types · 8 pts (split before the sprint)

As a learner, I want to play a lesson step by step, so that I practise one decision at a time.

- State machine: select → Check → feedback → try again or continue; hints after a wrong answer; Show the answer after 3 tries.
- Step types: card, choose (with reason), predict, words, fix, tune.
- Confidence tap on the steps that ask for it.
- Keyboard and screen reader work for every step; step change under 100 ms on a mid-range Android phone.

### EN-08 More step types · 5 pts

As a learner, I want sorting, ordering, matching, spotting and comparing steps, so that lessons test different kinds of judgement.

- sort, order (move up and down, no drag needed), match, spot (tap area or pick from list), compare.

### EN-09 Answers never lost · 5 pts

As a learner, I want every answer saved even on a bad connection, so that I never redo work.

- Attempts queue in IndexedDB, sync with retries to `POST /api/attempts`; server scores and stores the result.
- Killing the network mid-lesson loses no committed answer; reopening resumes at the same step.

### EN-10 Guest sample lesson · 3 pts

As a guest, I want to try a real lesson before signing up, so that I see how UXGate teaches.

- One sample lesson plays without an account; answers kept on the device.
- Signing up in the same session attaches those answers to the new account.

---

## Sprint 5 · 26 Nov – 2 Dec · Progress and mastery

### EN-11 Home and path map · 5 pts

As a learner, I want to see my next lesson and where I am in the path, so that I always know what to do next.

- Home: next lesson as the main action, today's goal, streak, review due, current path.
- Path map: units, lesson states, skill states; locked units say why and how to unlock them.

### EN-12 Skill checks and mastery round · 5 pts

As a learner, I want to prove a skill on a new case, so that my progress means I can really do it.

- Skill check: new scenario, no hints, no per-step verdict, summary at the end.
- End-of-unit mastery round brings back every missed skill with a fresh variant.
- Skill states move Practiced → Shown → Kept by the rules in the learning model.

### EN-13 XP, goal, streak and badges · 5 pts

As a learner, I want calm rewards for real effort, so that I keep coming back without pressure.

- XP 10 / 5 / 0 for independent, supported and revealed answers.
- Daily goal and streak; up to 2 freezes earned; no loss-framed messages.
- Skill badges at Shown and Kept. Each number explains why it changed.

### EN-14 Video steps · 3 pts

As a learner on a hybrid path, I want short video clips inside lessons, so that I see a pattern explained before I practise it.

- Bunny Stream playback with signed URLs, English and Arabic captions, transcript, no autoplay with sound.

---

## Sprint 6 · 3 – 9 Dec · Subscriptions

### EN-15 Plans and paywall · 5 pts

As a free learner, I want to know what is free and what a subscription unlocks, so that I can decide to pay.

- Entitlement decides access; unit 1 of every path stays free.
- Paywall shows the price in local currency and what is included.

### EN-16 Paymob for Egypt · 5 pts

As a learner in Egypt, I want to pay with local cards and wallets, so that paying is easy.

- Checkout, webhooks verified by signature, renewals by saved token, all in test mode.

### EN-17 Paddle for other countries · 5 pts

As a learner outside Egypt, I want to pay in my currency, so that I see a fair price.

- Paddle checkout and webhooks in sandbox; provider picked by billing country.

### EN-18 Cancel and refund · 3 pts

As a subscriber, I want to cancel or ask for a refund without contacting anyone, so that I stay in control.

- Cancel keeps access to the period end; refund request within 7 days of a charge.
- Emails for each billing event in the learner's language.

---

## Sprint 7 · 10 – 16 Dec · Admin panel v1

### AD-01 Admin shell, roles and audit log · 5 pts

As an owner, I want to give each admin only the access they need, so that the platform stays safe.

- Owner, content editor and support agent roles, checked on the server.
- Every admin action written to an audit log the owner can filter.

### AD-02 Content browser and publish · 5 pts

As a content editor, I want to browse and preview every lesson and publish a version, so that I control what learners see.

- Path → unit → skill → lesson → step → variants; preview in both languages; edit text and misconception messages with validation; publish a content version.

### AD-03 Content quality · 3 pts

As a content editor, I want statistics per step and variant, so that I can fix weak questions.

- Attempts, first-try success, hint use, reveal rate, common wrong answers, weak-question flags.

### AD-04 Learner support and appeals · 5 pts

As a support agent, I want to find a learner and fix their problem, so that support is fast.

- Search by email or name; see account, progress, attempts, subscription and emails sent.
- Reset progress, restore streak, grant access; answer appeals, with accepted appeals re-scoring the attempt.

### AD-05 Prices and refunds · 3 pts

As an owner, I want to manage prices and refunds, so that billing matches our rules.

- Price per currency, free-tier rules, payment history, cancel and refund within the 7-day rule.

---

## Sprint 8 · 17 – 23 Dec · Engagement and trust

### EN-19 Notifications · 5 pts

As a learner, I want reminders I chose, so that I keep my habit without spam.

- Inbox, email and push; each kind can be turned off; daily reminder at the learner's time; streak-at-risk sent once and never loss-framed.

### EN-20 Spaced review · 5 pts

As a learner, I want skills to come back before I forget them, so that I keep what I learned.

- Review queue from 3 days after Shown, confident errors first; review sessions use new scenarios.

### EN-21 Certificates and achievement pages · 3 pts

As a learner, I want a certificate and an optional public page, so that I can show my skills.

- Certificate when all units' skills are Shown; public page off by default with name, path, skills and date only.

### EN-22 Data and account settings · 3 pts

As a learner, I want to download or delete my data, so that I trust UXGate with it.

- JSON export; delete schedules removal within 30 days and signs out; notification choices.

### AD-06 Platform settings · 3 pts

As an owner, I want to change flags, templates and media without code, so that we can run the platform ourselves.

- Feature flags, email and notification templates in both languages, goal and streak rules, media library with captions.

---

## Sprint 9 · 24 – 30 Dec · Beta readiness

### QA-01 Accessibility self-review · 5 pts

As a learner using a keyboard or screen reader, I want every lesson to work for me, so that I can learn like anyone else.

- axe in CI with no serious issues; manual keyboard and screen-reader pass on every step type in both languages.

### QA-02 Security self-review · 5 pts

As an owner, I want the security checklist passed, so that learner data and payments are safe at launch.

- RLS tests on every learner table, rate limits, CSP, webhook signatures, secrets only in Vercel and Supabase.

### AD-07 Reports · 3 pts

As an owner, I want the beta numbers in one place, so that we can judge the beta.

- Sign-ups, active learners, lesson completion, paying learners, correction and transfer rates.

### PM-02 Beta plan · 2 pts

As an owner, I want a launch checklist and invite plan, so that the beta starts smoothly.

- Invite list, feedback form, support inbox, launch checklist.

### EN-23 Opt-in leaderboards · 3 pts

As a learner who likes competition, I want an opt-in weekly leaderboard, so that I can compare progress without pressure on others.

- Off by default for every learner and behind an admin flag.
