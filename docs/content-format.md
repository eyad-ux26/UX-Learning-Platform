# Content format

Every lesson is one YAML file. English and Arabic sit side by side, and `npm run validate` fails if either is missing, so a lesson can't ship half translated.

## Files

```
content/paths/P10/
  path.yaml          id, title, subtitle
  fixtures.yaml      shared scenario text, referenced as "@W1a"
  U01/
    unit.yaml        id, title, skill, free
    P10-U01-L01-find-the-next-useful-thing.yaml
```

## Text

Any text is either `{ en: "...", ar: "..." }` or a fixture reference such as `"@W1a"`. In longer text, a blank line starts a new paragraph and `**bold**` is supported.

Arabic is simple Modern Standard Arabic. Keep English UX terms and explain them in brackets the first time, for example "التسلسل البصري (Visual hierarchy)". Write times as words when they could flip in right-to-left text ("من 18:00 إلى 20:00", not "18:00–20:00").

## Lesson

```yaml
id: P10-U01-L01          # must match the file name
mode: lesson             # or "check" for a skill check
minutes: 7
title: { en: "...", ar: "..." }
review_labels:           # optional short names for misconceptions, shown in the recap
  MC-P10-001: { en: "...", ar: "..." }
steps: [ ... ]
```

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

By type:

| Type | Fields | `when` in a misconception |
| --- | --- | --- |
| `card` | `title`, `body` | none |
| `choose`, `words`, `fix` | `options`, `answer: [ids]`, optional `multi`, `also_ok`, `reason` | `[option ids]`, matches if any was picked |
| `predict` | as `choose`; with `any_ok: true` it's ungraded and needs `reveal`; `recall: S02` shows the learner's earlier answer | as `choose` |
| `tune` | as `choose`, each option has a `mock`; `start` is the option previewed first | as `choose` |
| `sort` | `items`, `buckets`, `answer: { bucket: [items] }`, `also_ok` | `{ item, bucket }` |
| `order` | `items` (in their starting order), `answer: [ids]`, `also_ok` | `{ before: [x, y] }`, matches when x is above y |
| `match` | `left`, `right`, `answer: { leftId: rightId }` | `{ left, right }` |
| `spot` | `mock` with `region` on blocks, `regions` (labels for the list), `answer` | `[region ids]` |
| `compare` | `a: { mock, label? }`, `b: { ... }`, `answer: a` or `b`, optional `reason` | `[a]` or `[b]` |

`also_ok` lists other accepted answers, each with its own `feedback`. `reason` is a second question about why: `{ prompt, options, answer, misconceptions }`.

## Mocks

A mock is a phone-sized screen made of blocks, top to bottom:

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

| Kinds | `title`, `heading`, `text`, `meta`, `small`, `chip`, `pill`, `line`, `button`, `link`, `image`, `banner`, `field`, `select`, `radio`, `check`, `toggle`, `stepper`, `segmented`, `slider`, `divider`, `group`, `row` |
| --- | --- |
| `gap` | Space above the block: `xs` (none), `s`, `m`, `l`, `xl` |
| `size` | `s`, `m`, `l`, `xl` (images: height) |
| `emphasis` | `high` or `low` |
| `tone` | `warn`, `bad` (chips, fields), `off` (button), `faint` (text), `plain` or `tint` (group) |
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

A mock can also set `width` (pixels, to show a narrow screen), `frame: wide` (to show a desktop layout), `dir: rtl` or `ltr` (to fix the direction whatever the learner's language), and `caption` (a small label such as "360 px").

In Arabic text anywhere in a lesson, the player keeps tokens that mix Latin letters and digits (such as `WS-204` or `A14`) and space-separated numbers (such as `010 1234 5678`) in left-to-right order automatically. To show a deliberately broken code inside a mock, put it in `code` so it displays exactly as written.

Use YAML anchors (`&name` / `*name`) to reuse a mock in the same lesson.

## Player behaviour worth knowing

- A `reason` question appears only after the main answer is right, so it can't give that answer away. Learners then answer it and press Check again.
- A lesson can list `sources` (each with `title` and `url`). They show under its concept and recap cards. Lesson content comes only from Nielsen Norman Group, the Interaction Design Foundation and Google's People + AI Research.
- A mock with `blur` (pixels) is shown blurred, for squint-test questions.
- Any question step can have `value` (`en`/`ar`): one sentence on what the question teaches. The preview shows it behind a small ⓘ toggle under the prompt, for reviewers.
- An `order` step with `onscreen: true` shows the items as blocks on a phone screen that learners drag into place (arrow keys work too). Give it a `caption`; items can set `kind`, `gap` and `emphasis`.
- A `tune` step can also have its own `mock`, shown above the option's mock. Use it for a "before" screen, such as a desktop table, with each option showing the result on a phone.
- A `group` with `scroll: true` scrolls sideways inside the mock, with its `row` children at a fixed column width (`colw`, default 120). `sticky: true` keeps the first column in place.
- Mock screens respond to taps: switches, checkboxes, radio buttons, segmented controls and − / + buttons change state, empty fields accept typing, and a slider with `min`/`max` can be dragged. This is only for trying things out and never affects the answer.

- Every step after a lesson's hook card has a **Show the scenario** panel that reopens the hook (title, text and mock), so learners can re-check the situation at any time. A step with its own `scenario` is a new case, so it shows that scenario instead and doesn't offer the hook.
- The preview has a reviewer bar above each step (previous, next, and a list of all steps), so a reviewer can jump to any step without answering the ones before it.
- An `order` step without its own `mock` shows a **live preview** that updates as items move. Give items a `kind` (such as `title` or `button`) so the preview looks like the real screen; the default is `meta`. Set `preview: false` to turn it off.
