# Idea cards (S2-15, 7 November 2026)

Eyad's request: text-only idea screens (a heading and plain paragraphs with bold leads, lots of empty space) look weak. Make them with cards and other elements on every path.

Canvas: page "6 · Slice 2 · Lesson player", board **S2-15 · Idea cards**, component `IdeaCards`. Each view uses the real content of one lesson card:

| View | Lesson card | Body shape |
| --- | --- | --- |
| `points` | P12-U01-L01 S03 (the screen Eyad sent) | intro paragraph + `- **Title:** text` points |
| `compare` | the same card with `layout: compare` | as above |
| `topics` | P13-U03-L01 S03 | `**Title (Term).** text` paragraphs, each followed by `- ` lines |
| `scales` | P15-U03-L01 S03 | intro + `- **A ↔ b**` points + closing paragraphs |
| `recap` | P01-U01-L01 S09 | `part: recap`, points, then `Next lesson: …` |

## Which cards

Every `card` step that has a `body` and no `mock`, except a video summary (a concept card right after a video, which keeps S2-14). On `main` that's 201 cards: 83 idea, 112 recap and 6 hook. Hook cards with a mock don't change.

## Rules (renderer only, no content changes)

Read the body the way `Rich` does (a blank line starts a block, `- ` lines make a list). Then draw each block:

1. **Paragraphs before the first list or bold-lead paragraph** become **The idea** card (`lp-sum-key` from S2-14, bulb icon, over-line "The idea" / «الفكرة»). Bold inside stays bold in the link colour.
2. **A list where every line starts with `**…**`** becomes **point cards**. The title is the bold part with its trailing `:` or `.` removed. The rest is the text, with the first letter capitalised in English (same parser as `readSummary`).
   - Icon: when `step.icons` has at least as many entries as there are points, point k uses `icons[k]` mapped through `summary-icons.json`. Otherwise every point shows its number (1, 2, 3) in the same tile. This avoids a wrong icon on a point.
   - Phones: one column, icon at the start, 8px gap.
   - Desktop: a grid of 3 columns for 3, 5 or 6 points, 2 columns for 2 or 4, 1 for 1. The icon sits on top (48px), the title is 17px and the text 15px. Cards align to the top (`align-content: start`).
   - Points whose English title starts with "Not" use the S2-14 do and don't groups, as the video summary does.
3. **A paragraph that starts with `**Title.**` or `**Title (Term).**` followed by a `- ` list** becomes a **topic card**:
   - A number badge (1, 2…) and the title as an h2.
   - A term in brackets at the end of the title becomes a small chip (`Hallucinations`). In Arabic, keep the English term in the chip.
   - The rest of the paragraph is the text.
   - The list goes under "What to do" / «ماذا تفعل» in a mint box with arrow bullets.
   - On desktop, 2 or more topic cards sit side by side and align to the top. This is the comparison block for two ideas.
4. **A point whose title contains `↔`** becomes a **scale row**: the start word (link colour), a track with 5 marks running from link to highlight colour, then the end word. A bracketed note after the title, such as "(teasing or mocking)", goes centred under the track in small type. Desktop shows 2 columns.
5. **Paragraphs after the last list** become one **Keep in mind** / «تذكّر» note: a panel colour with a 6px link-colour bar at the start edge. Each paragraph stays a paragraph.
6. **A last paragraph starting with "Next lesson:" / «الدرس التالي:»** becomes a **next row**: a dashed outline, a "Next lesson" chip with the path icon, and the text after the colon.
7. **Recap cards** (`part: recap`): the points become **done rows** (a green tick circle, the bold title, then the text) in place of point cards. They show in 2 columns on desktop.
8. **A plain list** (lines without bold) becomes point cards with numbers and no titles. Other paragraphs stay paragraphs inside the column.

The column is up to 1040px wide and centred on desktop (32px top padding, like `.lp-sum`). The Continue bar is the S2-14 `lp-sum-foot`.

## Optional `layout: compare` (content field)

`layout: compare` is a new optional field on `card`. When it's set and the card has at least 2 bold-lead points:

- The first two points sit side by side on desktop and are stacked on phones, with an "or" / «أم» badge between them. The first card is in link colours and the second in mint.
- Each side's text splits into items at the commas outside brackets. A leading "and" / «و» on an item is dropped, and so is the final full stop. Each item gets a check bullet.
- Any further points become **rule strips**: a flag icon on a highlight tile, then the title and text, in the panel colour with a highlight bar at the start edge.

Without the field, the card uses rule 2. Add it to the validator as optional: allowed only on `card`, and only when the card has 2 or more bold-lead points. The P12-U01-L01 S03 card is a good first use. Content threads can add it later in a one-line change.

## Accessibility

- Point and recap lists stay `ul` and `ol`, so the screen reader says how many items there are.
- Topic cards are `article` elements labelled by their h2.
- Icons, the "or" badge, the scale track and tick circles are `aria-hidden`. The words carry the meaning.
- Text contrast is unchanged from the current body text. The scale track is decorative.
- Focus goes to the h1 when the step loads, as now.
