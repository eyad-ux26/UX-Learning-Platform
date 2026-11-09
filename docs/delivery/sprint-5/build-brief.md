# Slice 5 build brief: subscriptions

For the **Build slice 5** thread (a new thread). Written by the PM thread, 5 November 2026. Eyad asked on 5 November to build, test and merge as much as possible while he is away and left the calls to the team, so this build starts on the slice 5 design as recommended to him (canvas v63, PR #83). If he changes any product call on his return, it is a small follow-up.

## Branch and order

- Branch from `main` (slice 1 is merged). Merge `main` in again after slice 2 (#69) and slice 3 (#66) merge.
- Slice 4 builds in parallel. Talk to "Build slice 4" before touching shared files (settings, emails, migrations). Migration numbers: slice 4 uses 0026 to 0035, slice 5 starts at 0036.
- Previews come from Cloudflare Workers Builds. Push in batches. Never merge; Eyad merges after the verify gate.

## Goal

A free learner sees what is free and what Pro opens, pays through Paymob (Egypt) or Paddle (everyone else) in test mode, and gets Pro at once. A subscriber can manage, change and cancel the plan, ask for a refund within 7 days, and gets the right email for every billing event. The rest of the app only checks one entitlement.

## Sources of truth

| What | Where |
| --- | --- |
| Design | Canvas https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx v63, page "9 · Slice 5 · Subscriptions" and the audit boards; PR #83 `docs/design/slice-5/README.md` (prices, components, "PM calls") and `docs/design/audit-fixes.md` |
| Product rules | `docs/product/spec.md` §4.8; design review calls below |
| Stories | EN-15, EN-16, EN-17, EN-18 in `docs/delivery/user-stories.md` |
| Prices | 249 EGP / $8 Gulf (GCC plus Iraq, from 9 Nov 2026; existing subscribers keep their price) / $5 other Arab countries monthly; 2,249 EGP / $72 / $45 annual; student 40%, welcome back 40% on annual for 2 years, founding 30% on annual in year 1 |
| Done rules | `docs/delivery/definition-of-done.md` with the tech gate |
| Credits | `/mnt/project-files/delivery/credits-policy.md`: Sonnet high |

## Product calls (PM, 3 November 2026, in the design README)

1. Plan name UXGate Pro. Unit 1 of every path, review and profile stay free.
2. Gulf and other Arab prices show in USD in the app; Paddle shows local currency and tax at checkout.
3. Failed renewal: 7-day grace with retries on day 2 and day 5, Pro stays on; then Pro pauses, nothing is deleted.
4. Refund ends Pro when the refund is made; the team answers within 2 working days (admin side comes with the admin panel, so for now a refund request is stored and emailed to support@uxgate.org).
5. Paymob renewals use the saved card token. If wallets can't renew by token, a wallet payer gets the "Pay for next month" state and a reminder email 3 days before; same grace period.
6. Paddle is merchant of record; our receipt is still sent.
7. Plan changes take effect at the period end; no proration.
8. Cancel asks for an optional reason; no retention offer.
9. Student price: university email link only (.edu, .edu.eg, .edu.sa, .ac.ae and similar; a config list now, an admin setting later). ID upload waits for the admin panel.
10. Welcome back applies by itself after 60 or more days without Pro. Founding member is a code.
11. One discount per account; discounts never add up.

## In scope

| ID | Story | Notes |
| --- | --- | --- |
| EN-15 | Entitlement, paywall, plans, locked states | One `entitlements` table driven only by webhooks; server-side gate on Unit 2+ and certificates; paywall sheet, plans page, codes, student and welcome back, locked path map, lesson end and profile |
| EN-16 | Paymob (test mode) | Checkout hand-off, HMAC-verified webhooks, idempotent event log, saved-token renewal, wallet fallback |
| EN-17 | Paddle (sandbox) | Paddle.js checkout, signed webhooks, provider picked by billing country |
| EN-18 | Billing, cancel, refund | Plan and billing in settings, change plan, cancel and resume, refund request within 7 days, "My requests" entry, payment problem states |
| — | Billing emails | Receipt, annual renewal reminder, wallet due, payment failed, cancelled, refund approved or declined; EN and AR on the slice 4 email layout; always on |

Secrets (Paymob and Paddle test keys, webhook secrets) are Cloudflare secrets and GitHub never sees them. When you need them, add one line each to the PM thread's list for Eyad. Until then, build against recorded test payloads and a fake provider in tests.

## Acceptance checks

1. A free learner can open Unit 1 of every path, and is stopped at Unit 2 by the server (API and page), not only the UI.
2. Test-mode subscribe, renew, failed renewal (grace, retries, pause), cancel (access to period end, resume) and refund each update the entitlement through webhooks only, and send the right email in the learner's language.
3. Webhooks with a bad signature are rejected; a repeated event changes nothing.
4. Egypt goes to Paymob and every other country to Paddle; prices match the table per region, and every discount computes as listed with no stacking.
5. A refund can be asked only within 7 days of a charge; after that the screen explains and links support@uxgate.org.
6. No card data touches our servers; only provider ids and the last 4 digits are stored. RLS: a learner reads only their own billing rows; webhooks write with the service role.
7. Every screen matches canvas v63 in EN light and AR night, mobile and desktop; axe has no serious issues; the tech gate passes.
8. CI green and a Cloudflare preview link in the PR.

## How to work

One PR, commits per story, the PR body lists each story with its checks ticked. Post the preview link when checks 1–8 pass, then stop for the verify thread. Report to the PM thread "Mgmt · Lead UXGate product delivery".
