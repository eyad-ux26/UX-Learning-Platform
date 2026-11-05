# Slice 5 design brief: subscriptions

For the **Design** thread (a fresh thread for slice 5, started from the handoff). Written by the PM thread, 3 November 2026, after Eyad approved the slice 4 design.

Slice 5 is how a learner pays: the paywall, checkout, managing the plan, cancelling, asking for a refund, and the billing emails.

## Before you start

Slice 4 was approved by Eyad on 3 November 2026 (canvas v53, PR #67). Keep building on the same canvas and design system. Add a new page, "9 · Slice 5 · Subscriptions".

## Prices (approved by Eyad, 2 November 2026)

| Region | Monthly | Annual (about 25% off) |
| --- | --- | --- |
| Egypt | 249 EGP | 2,249 EGP |
| Gulf | $8 | $72 |
| Other Arab countries | $5 | $45 |

Discounts: student 40%, welcome back 40% on annual for 2 years, founding members 30% on annual in year 1. Replace every `[PRICE]` on the canvas with these. Source: the finance thread's pricing doc https://claude.ai/artifact/MwDZVGvHVRJ7p98rb3smy3.

## Deliver

All in mobile (390) and desktop (1440), EN light and AR night.

| # | Screen or state | What to show | Rules |
| --- | --- | --- | --- |
| 1 | **Paywall** | Reached from a locked unit (Unit 2 or later) and from a Pro feature like certificates; what's free (Unit 1 of every path, review, profile) and what the plan opens; monthly or annual; price in the learner's region | EN-15 |
| 2 | **Plans page** | Monthly and annual, the annual saving, the discount entry (student, welcome back, founding), no trial, cancel any time, 7-day refund | Spec §4.8 |
| 3 | **Checkout hand-off** | Egypt goes to Paymob (cards and wallets); others go to Paddle; a short "you'll pay on a secure page" step, then return | EN-16, EN-17 |
| 4 | **Checkout result** | Success (what's open now), pending (wallet or bank confirming), failed (what to try), cancelled | EN-16 |
| 5 | **Billing in settings** | Current plan, next charge date and amount, payment method (masked), invoices and receipts, change plan, cancel | EN-18 |
| 6 | **Cancel** | What the learner keeps (access to the period end, all progress), a reason picker, a confirm, the after-cancel state with "Resume plan" | EN-18 |
| 7 | **Refund request** | Within 7 days of a charge; a short reason; the status in "My requests"; outside 7 days, an explanation with support@ | EN-18 |
| 8 | **Payment problems** | Renewal failed, card expiring, grace period; calm wording, no lockout panic | EN-16 |
| 9 | **Billing emails** | Receipt, renewal reminder for annual, renewal failed, cancelled, refund approved or declined; EN and AR, same layout as the slice 4 emails | EN-18 |
| 10 | **Locked states** | How locked units and certificates look for a free learner on the path map, lesson end and profile | EN-15 |

## Copy

Write EN and AR together. Learners see the price in their region's currency. No countdown timers, fake scarcity or guilt wording on any billing screen. The card statement name is still being checked on the Paymob account; use "UXGATE" for now.

## Credits

Follow `/mnt/project-files/delivery/credits-policy.md`: new screens on Opus high. Republish the canvas at milestones, and take feedback in one batched message per review.

## Gate

Post the canvas link and open a draft design PR when done. The PM thread reviews against this list, then Eyad approves.
