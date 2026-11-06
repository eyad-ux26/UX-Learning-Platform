# Content format

Every lesson is one YAML file. English and Arabic sit side by side, and `npm run validate` fails if either is missing, so a lesson can't ship half translated.

## Files

```
content/paths/P10/
  path.yaml          id, title, subtitle
  fixtures.yaml      shared scenario text, referenced as "@W1a"
  U01/
    unit.yaml        id, title, skill, free, skills
    P10-U01-L01-find-the-next-useful-thing.yaml
    P10-U01-B01-retests.yaml   re-test versions, never shown as a lesson
```

## Skills and re-tests

`unit.yaml` lists the unit's skills. Each is one thing a learner can be checked on:

```yaml
skills:
  - id: SK-P10-U01-01
    title: { en: "Put the deciding facts first", ar: "..." }
    can_do: { en: "Order a screen so the facts people decide with come before the main action.", ar: "..." }
```

Every graded step names the skill it measures with `skill: SK-P10-U01-01`. A skill needs **at least 4 versions in 4 different scenarios**, and at least 2 of them must be re-test versions held back in the unit's bank file. A version's scenario is its own `scenario`, or else its lesson's hook, so two steps on the same hook count as one scenario. `npm run validate` warns about any skill short of this, and the control board shows the gaps.

A bank file has `mode: bank`, an id like `P10-U01-B01`, a `title`, `sources` and `steps`. Each step is a full activity with its own `scenario`, `part: retest` and a `skill`. Write each re-test on a new case, testing the same finding as the lesson version, with its own `ref`.

## Text

Any text is either `{ en: "...", ar: "..." }` or a fixture reference such as `"@W1a"`. In longer text, a blank line starts a new paragraph and `**bold**` is supported.

Arabic is simple Modern Standard Arabic. Keep English UX terms and explain them in brackets the first time, for example "التسلسل البصري (Visual hierarchy)". Write times as words when they could flip in right-to-left text ("من 18:00 إلى 20:00", not "18:00–20:00").

## Lesson

```yaml
id: P10-U01-L01          # must match the file name
mode: lesson             # or "check" for a skill check
minutes: 7
title: { en: "...", ar: "..." }
summary: { en: "...", ar: "..." }   # optional, one line for the next-lesson card
speaker: hana            # the cast member who tells the scenarios, from content/cast.yaml
review_labels:           # optional short names for misconceptions, shown in the recap
  MC-P10-001: { en: "...", ar: "..." }
steps: [ ... ]
```

`summary` is one line of about 15 words (the validator allows 6 to 22 in each language) shown on the home screen's next-lesson card. Say what the learner will **do**, not what they will learn about. For example: "Three real sign-up forms. Decide which fields go, which wait, and which need a reason." Both `en` and `ar` are required when it is present. Lessons and skill checks without one get a warning; bank files don't need one.

## Steps

Fields every step can have:

| Field | Meaning |
| --- | --- |
| `id` | `S01`, `S02`, ... |
| `type` | `card`, `choose`, `predict`, `words`, `fix`, `tune`, `sort`, `order`, `match`, `spot`, `compare` |
| `part` | `hook`, `try`, `concept`, `guided`, `contrast`, `independent`, `recap`, `check` |
| `scenario` | Optional text shown in a box above the prompt |
| `prompt` | The question (not on cards) |
| `mock` | Optional screen to show (see Mocks) |
| `hints` | Up to 2, shown only after a wrong answer, never in skill checks |
| `correct` | One line shown when right |
| `explain` | The reasoning, shown under "Why?" and when the answer is revealed. Required on graded steps |
| `misconceptions` | `{ id: MC-P10-001, when: ..., feedback }`. The first one that matches the answer is shown |
| `confidence` | `true` to ask "How sure are you?" before Check. About 2 per lesson |
| `rules` | The research rules the step applies, such as `R11` or `U25` |
| `speaker` | A cast member from `content/cast.yaml` who tells this step's own `scenario`, when it isn't the lesson's speaker. The hook and every scenario are written in the speaker's first person, and one cast member always plays the same person. People they mention (a gym visitor, a patient) are not cast members |
| `skill` | The unit skill a graded step measures, such as `SK-P10-U01-02`. Required on graded steps once the unit lists skills |

By type:

| Type | Fields | `when` in a misconception |
| --- | --- | --- |
| `card` | `title`, `body`, optional `points` (concept cards). `points` is a list of 1 to 4 items `{ icon, en, ar }`, `icon` a Phosphor name such as `eye`. When `points` is present the body is not shown and may be left out. Icons used in `points` are added to the stylesheet by `npm run assets -w @uxgate/web` | none |
| `video` | `title`, `video` (Bunny Stream id), `duration` (seconds), `transcript` (list of `{ t, en, ar }`, `t` in seconds, increasing). Not graded. The captions are the transcript lines, so they exist in both languages. Never autoplays | none |
| `choose`, `words`, `fix` | `options`, `answer: [ids]`, optional `multi`, `also_ok`, `reason` | `[option ids]`, matches if any was picked |
| `predict` | as `choose`; with `any_ok: true` it's ungraded and needs `reveal`; `recall: S02` shows the learner's earlier answer | as `choose` |
| `tune` | as `choose`, each option has a `mock`; `start` is the option previewed first | as `choose` |
| `sort` | `items`, `buckets`, `answer: { bucket: [items] }`, `also_ok` | `{ item, bucket }` |
| `order` | `items` (in their starting order), `answer: [ids]`, `also_ok` | `{ before: [x, y] }`, matches when x is above y |
| `match` | `left`, `right`, `answer: { leftId: rightId }`, optional `headers: { left, right }` (column titles in en and ar, such as "Field" / "Used for") | `{ left, right }` |
| `spot` | `mock` with `region` on blocks, `regions` (labels for the list), `answer` | `[region ids]` |
| `compare` | `a: { mock, label? }`, `b: { ... }`, `answer: a` or `b`, optional `reason` | `[a]` or `[b]` |

`also_ok` lists other accepted answers, each with its own `feedback`. `reason` is a second question about why: `{ prompt, options, answer, misconceptions }`.

## Mocks

A mock is a phone-sized screen made of blocks, top to bottom. To make it look like a real app or site (product name and colour, status bar, app bar, tab bar, browser bar, lists, cards, chat, illustrations), use the vocabulary in [mock-screens.md](mock-screens.md).

```yaml
mock:
  blocks:
    - { kind: title, text: "@W1a" }
    - { kind: meta, text: "@W1b", gap: s }
    - kind: row
      blocks:
        - { kind: meta, text: "@W1d" }
        - { kind: chip, text: "@W1e" }
    - { kind: button, text: "@W1f", gap: m, region: button }
```

| Kinds | `title`, `heading`, `text`, `meta`, `small`, `chip`, `pill`, `line`, `button`, `link`, `image`, `banner`, `tip`, `iconbtn`, `field`, `select`, `radio`, `check`, `toggle`, `stepper`, `segmented`, `slider`, `calendar`, `wheel`, `chips`, `divider`, `group`, `row` |
| --- | --- |
| `gap` | Space above the block: `xs` (none), `s`, `m`, `l`, `xl` |
| `size` | `s`, `m`, `l`, `xl` (images: height) |
| `emphasis` | `high` or `low` |
| `tone` | `warn`, `bad` (chips, fields), `off` (button), `faint` (text), `plain`, `tint`, `night` (a dark panel) or `raised` (inside `night`) (group), `photo-light`, `photo-busy`, `photo-dark`, `photo-fade`, `photo-box` (image: a photo-like background, for text-on-image lessons) |
| `color` | Exact text colors on white, for contrast lessons: `ink` 16.8:1, `muted` 5.3:1, `pale` 3.0:1, `faint` 2.3:1, `brand` 6.8:1, plus `green`, `red`, `orange` |
| `weight` | `regular` or `bold` |
| `px` | Exact font size in pixels, when the size itself is being taught |
| `style` | Buttons: `plain` (text only), `danger` (filled red), `dangerlink` (red text) |
| `nowrap` | Cuts the text to one line with an ellipsis (to show truncation) |
| `height` | Fixed height in pixels; anything taller is cut off (to show clipping) |
| `overlap` | Pulls the block up over the one above it (to show overlapping controls) |
| `code` | A left-to-right fragment, such as a booking code, isolated inside right-to-left text |
| `region` | Makes the block tappable in a `spot` step |
| `field`, `select` | Have `label`, `text`, optional `hint` and `error`. `text` looks like a placeholder unless `filled: true`. `hintFirst: true` puts the hint between the label and the box. `focus: true` draws a focus ring. A `select` shows a ▾ |
| `radio`, `check` | One option with a round or square marker; `selected: true` fills it |
| `toggle` | A switch with `text` beside it; `selected: true` turns it on |
| `stepper` | `label` and a value in `text`, between − and + buttons |
| `segmented` | `options` (a list of texts) and `value`, the index of the selected one |
| `slider` | `label`, a two-handle range track, and the chosen range in `text`. With `min`, `max`, `from`, `to` and a `format` such as "From {a} to {b}", learners can drag it |
| `slider` (one thumb) | `value` instead of `from`/`to`. `bubble: above` shows the value over the thumb, `bubble: thumb` prints it on the thumb, `finger: true` (or the thumb's index) draws a fingertip over it, `ticks` is a list of labels under the track, `step` sets the drag step |
| `stepper` limits | `min`/`max` grey out − or + when `text` is at the limit; `size: s` is the small version; `editable: true` draws the value as a typing box; `hint` goes under it |
| `radio`, `check` extras | `marker: round` or `square` swaps the marker shape (to teach the wrong one); `hit: box` makes only the marker tappable |
| `calendar` | `months`: a list of `{ title, start, days }` (`start` is the empty cells before day 1). `from`/`to` are `[month index, day]` for a range, `pick` one day, `today` an outlined day, `weekdays` overrides the letters, `text` a line under it |
| `wheel` | `columns`: lists of 5 values each; the middle row is the chosen one. Optional `label` |
| `chips` | A wrapping row of UI chips. `items`: `{ text, on, x, icon }` (`on` is selected with ✓, `x` is removable with ✕). `boxed: true` draws a field around them; `label`, `lead` (text before) and `after` (text after) are optional |
| `tip` | A dark tooltip with a pointer, under the block above it |
| `iconbtn` | A small round icon button; `text` is the icon character |
| `ring` | A focus ring on any block, for keyboard lessons: `default`, `brand`, `flush`, `white`, `double`, `faint`, `tint` |

`npm run validate` rejects a prop that a block kind doesn't take, such as `options` on `chips` (it takes `items`). The props each kind takes are listed under `props` in `packages/player/src/mock-vocab.json`.

A mock can also set `height` (the screen's minimum height in pixels), `width` (pixels, to show a narrow screen), `frame: wide` (to show a desktop layout), `dir: rtl` or `ltr` (to fix the direction whatever the learner's language), `gray: true` (to show the screen in grayscale, as a colour-only check), and `caption` (a small label such as "360 px").

Any text in a mock can use `**bold**`.

A mock can show one layer over the screen with `overlay`:

```yaml
mock:
  width: 300
  blocks: [ ... ]            # the screen under the layer
  overlay:
    type: dialog             # dialog, sheet (bottom sheet), full, toast or banner (top)
    close: true              # optional ✕ in the corner
    blocks:
      - { kind: heading, text: { en: "Remove Visa ending 4821?", ar: "حذف Visa التي تنتهي بـ 4821؟" } }
      - { kind: button, text: { en: "Remove card", ar: "احذف البطاقة" }, style: danger, gap: m }
```

Dialogs and sheets dim the screen; set `scrim: false` to keep it bright, or `scrim: true` to dim under a toast or banner. A sheet has a grab handle unless `handle: false`, and `tall: true` makes it nearly full height. Blocks inside the overlay can carry a `region` for spot steps.

`fab` adds a floating action button in the bottom corner: `fab: { icon: "+", text: { en: "New", ar: "جديد" } }`. `text` makes it an extended FAB; a list stacks up to three.

In Arabic text anywhere in a lesson, the player keeps tokens that mix Latin letters and digits (such as `WS-204` or `A14`) and space-separated numbers (such as `010 1234 5678`) in left-to-right order automatically. To show a deliberately broken code inside a mock, put it in `code` so it displays exactly as written.

Use YAML anchors (`&name` / `*name`) to reuse a mock in the same lesson.

## Player behaviour worth knowing

- A `reason` question appears only after the main answer is right, so it can't give that answer away. Learners then answer it and press Check again.
- A lesson can list `sources` (each with `title` and `url`). Learners see them only in the path and unit reference lists on the home screen. Lesson content comes only from Nielsen Norman Group, the Interaction Design Foundation and Google's People + AI Research, but learner-facing text never names them or the studies, and examples are our own close variants, never copied from the articles.
- A mock with `blur` (pixels) is shown blurred, for squint-test questions.
- Any question step can have `ref: { url, quote }`: the source it rests on. `url` must be one of the lesson's `sources`, and `quote` is a short passage copied exactly from the article. The reviewer-only ⓘ note shows a **Source** link that opens the article with that passage highlighted (a URL text fragment, supported by Chrome, Edge and Safari; other browsers open the article at the top). Each unit and path on the home screen lists all its sources, with how many questions use each.
- Any question step can have `value` (`en`/`ar`): one sentence on what the question teaches. The preview shows it behind a small ⓘ toggle under the prompt, for reviewers.
- An `order` step with `onscreen: true` shows the items as blocks on a phone screen that learners drag into place (arrow keys work too). Give it a `caption`; items can set `kind`, `gap` and `emphasis`. It can also have its own `mock`, shown above the phone, for the screen the learner works from (such as the laptop layout that shows which item belongs to which group).
- A `tune` step can also have its own `mock`: the "Now" example. The player shows one screen that starts as this example and is replaced in place by the picked option's `mock`, so the example itself updates. Exception: when the step's `mock` is `frame: wide` (a laptop source) and the options are phone screens, the source stays above and the phone result appears under it once an option is picked.
- A `group` with `scroll: true` scrolls sideways inside the mock, with its `row` children at a fixed column width (`colw`, default 120). `sticky: true` keeps the first column in place.
- Mock screens respond to taps: switches, checkboxes, radio buttons, segmented controls and − / + buttons change state, empty fields accept typing, and a slider with `min`/`max` can be dragged. This is only for trying things out and never affects the answer.

- **Mastery round.** Each graded step's first result is kept per skill. After the skill check, any skill the learner missed anywhere in the unit (wrong first try, a hint, or a shown answer) comes back in a mastery round as an unseen re-test version. A miss there brings the next unseen version. The skill is mastered once a re-test is right on the first try; when the versions run out it's marked for later review. The preview keeps these results in the browser.
- **Control board.** `npm run board` builds `preview/dist/board.html`, which opens on the board: every path, unit, skill and activity with its coverage, the scenario of each version, where right answers sit, sources, mistakes tracked and your own test runs. Any activity can be played from there. Unit previews have a **Board** button on the home screen too.
- Every step after a lesson's hook card has a **Show the scenario** panel that reopens the hook (title, text and mock), so learners can re-check the situation at any time. A step with its own `scenario` is a new case, so it shows that scenario instead and doesn't offer the hook.
- The preview has a reviewer bar above each step (previous, next, and a list of all steps), so a reviewer can jump to any step without answering the ones before it.
- An `order` step without its own `mock` shows a **live preview** that updates as items move. Give items a `kind` (such as `title` or `button`) so the preview looks like the real screen; the default is `meta`. Set `preview: false` to turn it off.
