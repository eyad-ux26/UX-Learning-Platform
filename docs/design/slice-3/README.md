# Slice 3: progress across several paths

Live boards: https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx, page "7 · Slice 3 · Progress" (canvas v42, 10 rows and the moments board). Each row shows every state of one part in four frames: mobile 390 English light, mobile 390 Arabic night, desktop 1440 English light and desktop 1440 Arabic night (desktop shown at half size). The three components below are on "Screen parts" and are clickable there.

Rules come from spec §4.4b (several paths), §4.6 (XP, freezes, replay, review, leaderboard) and §4.7 (certificate and achievement page). Styles are in `../system/uxgate.css`, in the blocks that start with "Slice 3". Same tokens, Cairo and Titillium Web, no hearts, lives, energy, timers or loss-framed copy, and freezes are never sold.

## Components

All three take `lang` (`en`, `ar`), `theme` (`light`, `dark`), `device` (`mobile` 390×844, `desktop` 1440×900) and `view`.

### `PathsPages.dc.html`

| `view` | What it shows |
| --- | --- |
| `paths` | Paths tab: joined paths first (current one wears the selection frame), then paths you can start, then the 11 Coming soon paths, which can't be opened |
| `pathNew`, `pathJoined` | Path detail. "Start this path" (joins and makes it current) or "Continue this path" (makes it current), with "Your other paths keep all their progress" next to the button |
| `pathStarted` | Confirmation: the new current path, the other paths listed as Saved with their progress |
| `home`, `homeResume`, `homeFreeze` | Home: the next lesson in the current path names its path; "Your paths" row with one-tap switch; resume card that names its path (here in Visual Hierarchy while the current path is Forms That Flow); review due "From 2 paths"; streak and goal. `homeFreeze` adds the calm note "A freeze kept your streak" |
| `mapSwitch` | Path map with the header switcher open (sheet on mobile, popover on desktop) |
| `mapLocked` | Locked unit sheet: every condition with its state (skill check to pass, subscription) and the way to open it now (test out) |
| `obRecommend`, `obAll`, `obGuest` | Onboarding: "Your starting path" comes from the Q2 answer and says so (Eyad, 2026-11-02: no goal-based suggestion); only when that path has no content yet do we offer one that does, with the reason; "See all paths" lists all 14 with Coming soon ones disabled; a guest from the sample lesson starts with P01 picked and a "Your sample lesson is saved" note |

### `ProgressPages.dc.html`

| `view` | What it shows |
| --- | --- |
| `endNext` | Lesson end: XP with its breakdown (on your own × 10, with a hint × 5), skill progress, "Next in Forms That Flow" |
| `endReplay` | Replay end: "Replay: half XP" tag, × 5 breakdown, "first replay today, so it counts for your goal and streak", skill states unchanged, "Replay again (no XP today)" |
| `endShown` | Skill check passed: each skill Practiced → Shown, Unit 3 open, 5 new badges |
| `endBadge` | Badge earned dialog: blue badge at Shown, and what turns it gold (Kept) |
| `endPath` | End of a path: certificate ready, then the next path to pick (continue a joined one or start a new one) |
| `streak`, `streakFull`, `freezeEarned` | Streak detail: this week, freezes held (2 slots), steps to the next freeze, how freezes work. `streakFull` is the state when the learner already holds 2: no progress bar, it says they hold the most and that goal days this week won't add a third. The earned-freeze dialog that reaches 2 says the same |
| `numbers` | Why each number changed today: XP (with its events), goal, streak, skills, next freeze, leaderboard rank |
| `skills` | Skill states in one path, by unit, with what each state means |
| `badges` | Badge gallery by path: gold Kept, blue Shown, outlined not yet; detail panel on desktop |
| `reviewQueue` | One queue for all joined paths, "You were sure, then missed it" first, every card names its path |
| `reviewSession` | A review step: a new case spoken by Youssef (shop owner), selected state before Check |
| `reviewDone` | What changed: right again → Kept, missed → back tomorrow with a new case; "Nothing you earned is taken away" |
| `reviewEmpty` | Nothing to review today, with what comes back and when |

### `ProfilePages.dc.html`

| `view` | What it shows |
| --- | --- |
| `profile` | Totals across paths (XP, streak, skills Shown, skills Kept, each tappable to see why), one card per joined path with skill counts, certificates per path with progress, badges and leaderboard links. Desktop shows settings beside it |
| `profileReminder` | The daily reminder reuses the onboarding picker: on by default at 8:00 PM. Desktop opens the `.tp` popover (presets Morning 8 AM, Midday 1 PM, Evening 8 PM, Night 10 PM); mobile opens the phone's own time picker (drawn as a neutral MOCK sheet) |
| `certificate` | One certificate per path, framed like an artboard; download, share, achievement page switch (off by default), verify link |
| `publicShare` | Achievement page turned on: link with Copy, what visitors see and what they never see, turn off at any time |
| `publicPage` | `uxgate.org/u/<handle>` as a visitor sees it: name, path, skills Shown and date only |
| `boardOptIn`, `board`, `boardLeave` | Opt-in leaderboard: off until joined, weekly XP from all paths, names and weekly XP only, leaving keeps everything else |

The reminder logic (`remVals`) is the same code as `DeskOnboarding` so the two stay in step.

## Badges

A skill badge is a component diamond: blue with a seal at Shown, gold with a star at Kept, outlined with a lock before. Kept skills reuse the same badge and turn it gold, so there is one badge per skill.

## Leaderboard

People appear as cursor-shaped avatars, as in a shared design file. There is no demotion zone, no red, and no copy about falling behind. The week starts again every Monday.

## Illustrations and sound (`RowS3Moments.dc.html`)

Every new moment is mapped to an illustration and a sound from `../sound/`; no new sound files. Calm moments (a freeze used, an empty review, a lock) are silent on purpose. Badges, a certificate and a finished path share the win sound family.

## Sample data and assumptions to confirm

- The learner is **Yasmin** (ياسمين), so she does not clash with the cast member Nour, who was the learner on the Sprint 1 and slice 2 boards.
- Forms That Flow: current path, Unit 2 of 5, 30%, 40 skills (8 a unit; Unit 1: 6 Shown and 2 Kept, Unit 2: 5 Practiced). Visual Hierarchy in Action: joined, Unit 1 skill check passed, Unit 2, 20%, 35 skills (7 Shown). Skill totals per path are assumed until the content thread fixes them.
- 14 paths are listed (P01 to P14, with P14 Patterns That Fit as the hybrid path); the spec now says 14.
- Leaderboard names are sample learners, not cast members.

## Fixes to earlier boards in this change

- `LearnMotivation`: Kept is أتقنت (was حافظت) and means "right again in review, 3 or more days later" (was "a week later"); the freeze note now says "meet your goal on 5 days".

## Loading between screens (`RowS3Loading.dc.html`, canvas v66)

Drawn from what PR #155 built, so the canvas matches the app. `PathsPages` takes a `loading` prop (`none`, `early`, `layer`, `reduced`, `full`) drawn over Home with the Paths tab just tapped.

- **Under 400 ms:** the tapped tab lights up at once, a 3 px line in the logo gradient runs along the top with a selection handle at its head (it grows from the right in Arabic), and the old screen dims to 55%. The rail and the phone toolbar never dim.
- **After 400 ms:** the artboard loader fills the content area only: a frame named "# Paths" / «# المسارات» with a selection outline, the logo's `loading` eye motion and a cursor sketching a wireframe, then one tip line ("Snapping layers to the grid…" / «نضبط الطبقات على الشبكة…»). A hidden status says "Loading" / «جارٍ التحميل».
- **Reduced motion:** the line stands still near the end, and the eye and the cursor stop.
- **Lesson first load:** the same loader full screen, named "UXGate".
- **Lesson video:** a spinner over the frame while the clip loads or buffers (`LessonPages` view `videoLoad`).
- **Busy buttons:** `aria-busy="true"` adds a spinner after the label and keeps the button's colour, not the disabled grey. The components board's Loading column now shows this.

## Start or continue a path (`RowS3PathGo.dc.html`, canvas v66)

The path map opens with one main action card above the units (`PathsPages` views `mapStart`, `mapContinue`, `mapDone`; the switcher and locked views show the Continue card too).

- **Not started:** "Start here · Unit 1, Lesson 1", the lesson name, **Start path** → Unit 1, Lesson 1.
- **Started:** "Next up · Unit N, Lesson M", the next unfinished lesson, the path progress bar, **Continue path** → the learner's next unfinished step (a half-done lesson resumes at its step).
- **Finished (proposed, the build thread confirms):** a green trophy, "Path complete", **Review this path** → a review session of this path's skills, and a quiet link **See your certificate**.
- Arabic: ابدأ المسار / تابع المسار / راجع هذا المسار / اعرض شهادتك.
