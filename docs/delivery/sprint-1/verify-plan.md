# Slice 1 verify plan: security and testing

For the **Verify slice 1** thread. Start it when the build thread posts the slice 1 preview link. You are an independent reviewer: you did not build this, so check it as a QA and security team would.

## Inputs

- The build PR and its Vercel preview
- `docs/delivery/sprint-1/build-brief.md` (acceptance checks 1–10)
- The design canvas https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx
- `docs/tech/architecture.md` (security checklist), `docs/delivery/definition-of-done.md`
- Credits: `/mnt/project-files/delivery/credits-policy.md` (tests on Sonnet high; security review and final verdict on Opus medium; scoped to the slice's diff)

## 1. Automated tests you add (to the build PR)

| Layer | Tool | Cover |
| --- | --- | --- |
| Unit | Vitest | Scoring for card, choose, tune and compare; XP rules (10 / 5 / 0); attempt queue retry and dedupe; content compiler validation errors |
| API | Vitest + Supabase local | `POST /api/attempts`: auth required, server-side scoring ignores client verdicts, idempotent on retry, stores the content version |
| Database | SQL tests | RLS: a learner reads and writes only their own profile, attempts and progress; anonymous gets nothing |
| End to end | Playwright | Checks 1, 3, 4, 5, 6, 7 from the build brief, in `en` and `ar`, at 360 px and 1440 px |
| Accessibility | axe in Playwright | Every slice 1 screen in light and dark: no serious or critical issues |
| Visual | Playwright screenshots | Each screen in EN light and AR night, attached to the report for Eyad's eye check against the canvas |

All of these run in CI and must pass.

## 2. Security checklist

- [ ] RLS on every table with learner data; no table readable by `anon` except published content
- [ ] Service role key used only on the server; nothing secret in client bundles (search the build output)
- [ ] Auth: email verification on, password rules as designed, sign-in link expiry ≤ 1 hour, OAuth redirect URLs limited to the app's domains
- [ ] Rate limits on sign up, sign in, sign-in link and `POST /api/attempts`
- [ ] Input validation (Zod) on every API route; attempts cannot set their own score or XP
- [ ] Security headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors none
- [ ] Cookies `Secure`, `HttpOnly`, `SameSite=Lax`; CSRF safe for state-changing routes
- [ ] No learner personal data in logs or Sentry events
- [ ] Dependencies: `npm audit` with no high or critical issues; lockfile committed
- [ ] Secrets only in Vercel and Supabase settings; none in the repo or its history

## 3. Manual checks

- Keyboard-only and screen-reader (VoiceOver or NVDA) run through sign up → lesson end, in both languages
- Real phone check (any Android or iPhone) on the preview: sound, ledge press, safe areas
- Network: offline mid-lesson, slow 3G, tab closed mid-lesson

## 4. Reporting

- File each problem as a GitHub issue with labels `bug`, `slice-1` and `blocking` or `minor`, with steps, expected, actual, screenshot.
- Post one report in your thread: a table of checks (pass or fail), the issues filed, and the screenshots. Re-test fixes when the build thread pushes them.
- The slice passes when every check passes and no `blocking` issue is open. Then tell Eyad it is ready for his approval.
