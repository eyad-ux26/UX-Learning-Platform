# Completed paths on the Paths tab (S3-17, 7 November 2026)

Eyad's request: when a path is done, the Paths tab doesn't show it. Show how a finished path looks.

Canvas: page "7 · Slice 3 · Progress", board **S3-17**, component `PathsPages`, view `pathsDone` (the `paths` view sits next to it as "before"). The CSS is the "Completed path cards (S3-17)" block in `system/uxgate.css`.

## When a path counts as completed

- A path is **completed when its certificate exists**, meaning every skill of the path is Shown. Do not use lesson %.
- This covers paths finished through retests, and paths whose certificate was granted directly in the database. Forms That Flow showed 10% for this reason.

## Paths tab

- **Your paths · N** now counts only paths that are joined and not completed. It keeps the current card, the % bar and "Unit now".
- A path whose lessons are all done (100%) but has skills left to show stays in Your paths. It gets an amber chip with a target icon: "N skills to show" / «باقي N مهارات لتثبتها». It tells the learner the skill check is what's left.
- A new section, **Completed · N** / «مكتملة · N», follows Your paths and comes before "Start a new path". It only shows when N is at least 1.
- "Start a new path" hides when there's no path left to join.

## Completed card (`.path-card.is-done`)

- A mint gradient background and a green border.
- A green check badge on the corner of the picture.
- In the meta row:
  - A filled green **Completed** / «مكتمل» chip with the seal-check icon.
  - The kind chip (Interactive or With videos) as usual.
- Under it, a green line with a certificate icon: "{n} skills Shown · Certificate ready" / «{n} مهارة «أثبتت» · الشهادة جاهزة». Use the plural rules for {n}.
- There's no % bar and no "Unit now" line.
- Accessible name: "{path}, completed. Certificate ready" / «{path}، مكتمل. الشهادة جاهزة». The badge is `aria-hidden`.
- Tapping it opens the path page in its finished state (S3-13: "Review this path" and "See your certificate").

## Data

- The page already loads certificates for the profile. Join them to the joined paths by `path_id`. No new column is needed.
