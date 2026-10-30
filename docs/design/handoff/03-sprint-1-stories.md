# Sprint 1 design stories

Sprint 1 runs 29 Oct to 4 Nov 2026. These are the stories the design thread delivers. Full backlog: `docs/delivery/user-stories.md` in the repo.

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

