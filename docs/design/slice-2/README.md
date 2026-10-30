# Slice 2: the full lesson player

Live boards: https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx, page "6 · Slice 2 · Lesson player" (17 rows). Each row shows every state of one part in four frames: mobile 390 English light, mobile 390 Arabic night, desktop 1440 English light and desktop 1440 Arabic night (desktop shown at half size). The two components below are on "Screen parts" and are clickable there.

Styles are in `../system/uxgate.css`, in the block that starts at `.ug.lp`. Same tokens, 14 px radius on every button, Cairo and Titillium Web, no hearts, lives, energy or mascot.

## Components

### `LessonKinds.dc.html`: one lesson step

| Prop | Values |
| --- | --- |
| `lang`, `theme` | `en`/`ar`, `light`/`night` |
| `device` | `mobile` (390×844), `desktop` (1440×900) |
| `kind` | `predict`, `tryfirst`, `words`, `fix`, `reason`, `sort`, `order`, `match`, `spot` |
| `state` | `idle`, `select`, `wrong`, `hint2`, `reveal`, `right`, `why`, `also`, `confAsk`, `confWrong`, `list`, `noted`, `saved` |
| `mode` | `lesson`, `check` (skill check), `mastery` (mastery round), `guest` (sample lesson) |
| `overlay` | `none`, `exit`, `resume`, `saving`, `saved`, `offline`, `synced`, `review`, `sent` |

Layout: on mobile the order is question, example, answer area, bottom bar. On desktop the example sits in a 560 px column and the question and answers on the right; Check is inline under the answers, as in Sprint 1. Example screens keep the example product's own style inside the grey MOCK frame (Hana's Gym in Barlow and lime, Lunch To Go in Rubik and paprika) and are scaled down on mobile so the step fits one screen.

### `LessonPages.dc.html`: full pages around steps

`view`: `videoStart`, `video`, `videoTranscript`, `videoEnd`, `concept`, `checkIntro`, `checkSummary`, `masteryIntro`, `masteryDone`, `masteryNone`, `homeResume`, `offlineEnd`, `guestEnd`, `guestSignup`. Same `lang`, `theme`, `device` props.

## Step types

- **Predict (graded):** pick what will happen, then Check. Confidence chips (Guessing, Fairly sure, Sure) next to Check when the step asks for them.
- **Predict (try-first):** no right answer yet. "Any answer is fine" and "This one is not scored" sit under the options; after Check the sheet is a neutral "Noted" note that tells the learner to keep the guess in mind, never red.
- **Words:** pick the wording for a label. An answer in `also_ok` gets the right sheet titled "Also works" with a seal, and the main answer shown under it.
- **Fix:** the example has a problem; pick the change that fixes it.
- **Choose with reason:** the pick first, then the reason question under it, as in Sprint 1 compare. On mobile the example folds away for the reason part.
- **Sort:** tap an item, then tap a bucket (or "Put it here" in the bucket header). Drag also works on desktop. Items are cards with a grip; buckets show a dashed target when an item is held.
- **Order:** rows with up and down buttons and a grip. After Check each row is marked right or wrong with its number. A small live preview of the example follows the order.
- **Match:** tap a left tile, then a right tile; matched pairs share a number badge.
- **Spot:** tap a region of the example. Regions have a dashed outline at rest, the selection frame when picked and solid green or red after Check. "Use a list instead" switches to a plain radio list of the same regions (screen readers and small screens); in list mode the example is hidden.

## Feedback

- **Wrong:** "Not quite" sheet with "Try n of 3", the misconception line, hints as comment pins ("Hint 1 of 2", then 2), Try again. After the third wrong try, Try again goes away and "Show the answer" appears (hint 1, then hint 2, then the answer). When confidence was Sure: "You were sure, so this one comes first in your review." A flag link "Think your answer works too? Ask for a review" on every wrong sheet.
- **Revealed:** "The answer, step by step" with numbered worked steps; no XP.
- **Right:** XP, the answer and a "Why?" button that opens the explanation.
- **Skill check:** no hints, no verdict per step. Check leads to a quiet "Answer saved" sheet with progress dots and "No right or wrong during a skill check". The summary page lists each skill as Shown أثبتّ or "Try again later".
- **Mastery round:** only steps from skills missed in the unit. Wrong says "This skill comes back once more, with a new example" and shows only Continue; the end page shows which skills moved to Kept أتقنت. If nothing was missed, the round is skipped with its own page.

## Video and concept

- Video: night stage with the white mark, captions with an English/Arabic switch, CC, a scrubbable bar, a transcript where the current line is highlighted, and a replay page at the end. Never autoplays; the play button is the first focus.
- Concept card: illustration, one-line idea and up to four question cards, each with a short answer.

## Exit, saving, offline, guest, review

- **Exit:** the close button opens a sheet (mobile) or dialog (desktop): "Leave this lesson?", "Your answers are saved", Keep learning (primary) and Leave lesson.
- **Resume:** the home card "Pick up where you left off" with step count; inside the lesson a banner "Welcome back. You left off at this step." with Start over.
- **Saving:** a small chip in the header: Saving (turning sync icon), Saved (cloud check), Offline (wifi slash) with a banner "Answers are kept on this device and sync when you're back". When the connection returns, a toast says every answer is synced. Offline end page keeps the result and says it will sync.
- **Guest:** from the landing, with the banner "You're trying a sample lesson. Sign up at the end to keep your progress." on top and no XP saved. End page offers sign up to keep the result; sign up sheet over it.
- **Review:** form with four reasons (my answer also works, the question is unclear, something on the screen is broken, something else), an optional note (280 characters) and Send. A toast confirms: "Sent. We'll let you know what we decide." The reply arrives in notifications.

## Icons (Phosphor names for the app)

Canvas class to Phosphor: `replay` arrow-counter-clockwise, `arrow-down`, `arrow-up`, `sync` arrows-clockwise, `article`, `cc` closed-captioning, `cloud-up` cloud-arrow-up, `cloud-check-fill` cloud-check (fill), `corners-out`, `grip` dots-six-vertical, `eye-slash`, `flag`, `hand-tap`, `link` link-simple, `tray`, `list` list-bullets, `send` paper-plane-tilt, `pause-fill` pause (fill), `play-fill` play (fill), `also-fill` seal-check (fill), `user-plus`, `wifi-slash`.

## Illustrations

Uploaded on the canvas and reused from the illustration set: skill check, medal (all skills shown), target (mastery round), trophy (mastery done), empty (no mastery round), offline, gate (guest end), lesson card (concept), video, review, feedback, key, support, certificate. The app should take them from the same set, 100 px on mobile pages and 200 px on desktop.

## Content used

Sample content only. Fix uses P01-U01-L02 step 5; the rest use Hana's Gym and Lunch To Go examples written for the boards. Hints are sample hints until the content thread delivers the real ones. Field names follow `docs/content-format.md` (`also_ok`, `reason`, `confidence`, mastery round, skill check).

## Sprint 1 copy fixes in this change

- Second hint on Hana's gym step (`ScreenStep`, `DeskStep`).
- The five landing FAQs from the slice 2 brief (`ScreenLanding`, `DeskLanding`). The landing boards grew to fit them (mobile 2940, desktop 2640); all five show unclipped in English and Arabic.
