# Definition of Ready and Done

## Ready (before a story enters a sprint)

- The story says who, what and why, and has acceptance checks a reviewer can test.
- Designs exist in Claude Design for any new screen or state, in both languages.
- Dependencies (keys, accounts, decisions) are in place or tracked as their own task.
- Estimated at 5 points or less; 8-point stories are split.

## Done (before a story closes)

- Acceptance checks pass on a Vercel preview, linked in the PR.
- Works at 360 px wide and on desktop, in English (LTR) and Arabic (RTL), in light and dark.
- Keyboard and screen-reader pass for new interactive parts; axe shows no serious issues.
- No physical CSS properties; every string is in both message files.
- Typecheck, lint, tests and content validation pass in CI.
- Learner data is protected by RLS, with a test when a new table is added.
- Docs updated where behaviour changed (spec, architecture or data model).
- An admin reviewed and approved the PR. Claude never merges on its own.
