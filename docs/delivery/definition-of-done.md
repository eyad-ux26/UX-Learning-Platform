# Definition of Ready and Done

## Ready (before a story enters a sprint)

- The story says who, what and why, and has acceptance checks a reviewer can test.
- Designs exist in Claude Design for any new screen or state, in both languages.
- Dependencies (keys, accounts, decisions) are in place or tracked as their own task.
- Estimated at 5 points or less; 8-point stories are split.

## Done (before a story closes)

- Acceptance checks pass on a Cloudflare preview (Vercel until the switch lands), linked in the PR.
- Works at 360 px wide and on desktop, in English (LTR) and Arabic (RTL), in light and dark.
- Keyboard and screen-reader pass for new interactive parts; axe shows no serious issues.
- No physical CSS properties; every string is in both message files.
- Typecheck, lint, tests and content validation pass in CI.
- Learner data is protected by RLS, with a test when a new table is added.
- Docs updated where behaviour changed (spec, architecture or data model).
- An admin reviewed and approved the PR. Claude never merges on its own.

## Tech gate (every slice, checked by the verify thread)

Added 1 November 2026 from the stack review (https://claude.ai/artifact/9g1GkaEXm2mip4BsMPof8F).

- Next.js is on a patched release and Dependabot is on.
- No access control lives in middleware alone; every protected route and API checks the session on the server, and RLS backs it.
- RLS cross-learner tests pass: one learner cannot read or write another's rows.
- Performance: page load under 2.5 s on a mid-range Android phone on 4G, measured with Cloudflare Web Analytics and a Lighthouse 4G run on the preview.
- Infra: Supabase in Frankfurt (eu-central-1) and the Cloudflare Worker placed near Frankfurt; HSTS header on.
