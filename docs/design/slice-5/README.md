# Slice 5: subscriptions

Live boards: https://claude.ai/artifact/2QmAbtRYMcetPvvmCGEuCx, page "9 · Slice 5 · Subscriptions" (canvas v58, 10 rows and the moments board; PM review applied on 3 November 2026). Each row shows every state of one part in four frames: mobile 390 English light, mobile 390 Arabic night, desktop 1440 English light and desktop 1440 Arabic night (desktop shown at half size). Email rows show a 390 phone and a 760 desktop mail window. Captions name the region the frame is priced for.

Brief: `delivery/sprint-5/design-brief.md` in project files. Styles are in `../system/uxgate.css`, in the block that starts with "Slice 5". Prices come from the pricing doc approved by Eyad on 2 November 2026.

## Prices used

| Region | Monthly | Annual | Student (40%) | Founding member (30% on annual, year 1) |
| --- | --- | --- | --- | --- |
| Egypt (Paymob) | 249 EGP | 2,249 EGP (about 187 a month, save 739) | 149 / 1,349 EGP | 1,574 EGP |
| Gulf (Paddle) | $8 | $72 (save $24) | $4.80 / $43.20 | $50.40 |
| Other Arab countries (Paddle) | $5 | $45 (save $15) | $3 / $27 | $31.50 |

Welcome back (40% on annual for 2 years: 1,349 EGP, $43.20, $27) is applied by itself, with no code, for a learner whose Pro ended 60 or more days ago. The founding member discount stays a code. One discount per account; discounts never add up.

## Components

Both take `lang` (`en`, `ar`), `theme` (`light`, `dark`), `device` (`mobile` 390×844, `desktop` 1440×900), `region` (`eg`, `gulf`, `arab`) and `view`.

### `CheckoutPages.dc.html`

| `view` | What it shows |
| --- | --- |
| `paywallUnit` | The path map of a free learner with a sheet (dialog on desktop): "Unit 2 is part of Pro", what stays free and what Pro opens, Monthly or Annual, "Continue · price", Plan details, Not now |
| `paywallCert` | The same sheet from a locked certificate on Profile |
| `plans` | UXGate Pro: the region line, monthly and annual cards (annual saving shown), no trial, cancel any time and the 7-day refund, Free next to Pro, a code entry and the student price. A bar at the bottom on a phone; a summary card on desktop |
| `plansCode` | Founding member code applied: the annual price for the first year, the normal price struck through, and "then … a year" |
| `plansWelcome` | Welcome back, applied by itself after 60 or more days without Pro: 40% off annual for 2 years, shown as an applied discount with no code and no Remove |
| `studentAsk` | Student price at launch: a university email gets a link (24 hours); the price after the check; which addresses count |
| `studentId` | Student ID upload. **After the admin panel, not in slice 5**: nobody can approve uploads until the admin waterfall |
| `handoffPaymob` | Check and pay (Egypt): plan, today's amount, what happens after, billing country, Paymob's secure page with cards, Meeza and mobile wallets, statement name UXGATE |
| `handoffPaddle` | The same for Paddle: Paddle sells for us and handles tax, cards, Apple Pay and Google Pay, statement PADDLE.NET* UXGATE |
| `returning` | Back from the provider: confirming, keep the page open |
| `resultSuccess` | Welcome to Pro: receipt sent, what is open now, Start Unit 2 |
| `resultPending` | A wallet (Egypt) or bank (Paddle) is confirming: nothing is charged twice, keep learning, Check again |
| `resultFailed` | Nothing was charged, what to try (card details, online payments, another card or wallet), support@ |
| `resultCancelled` | Left the payment page: nothing charged, back to plans or keep learning free |
| `mapFree` | Path map of a free learner: Unit 1 done (Free), Units 2 to 5 locked with the PRO tag; on desktop a "Your plan: Free" card |
| `endFree` | Lesson end after the Unit 1 skill check: the normal celebration, then "Next unit · PRO" and See plans |
| `profileFree` | Profile on the free plan: Free with See plans, and the certificate locked with progress toward it |

### `BillingPages.dc.html`

| `view` | What it shows |
| --- | --- |
| `billing` | Plan and billing: plan, status, next charge and amount, Pro since, Change plan, the card (masked, Update opens the provider), billing country, receipts, Ask for a refund (with the last date), Cancel plan |
| `billingChange` | Change plan: monthly to annual starts when the paid month ends; nothing is charged today |
| `billingExpiring` | Card expires before the next charge: a calm notice with Update card |
| `billingFailed` | Renewal failed: Pro stays on during a 7-day grace period, retries on day 2 and day 5, Update card or Try now |
| `billingLapsed` | Grace period over: Pro paused, progress kept, Restart Pro |
| `billingWallet` | Wallet payer: "Pay for next month" by the period end, Pay with my wallet or use a card instead. **Used only if Paymob can't renew wallets** |
| `billingWalletLate` | Wallet payer missed the date: the same 7-day grace period as a failed renewal. **Used only if Paymob can't renew wallets** |
| `cancelAsk` | Cancel on one screen: what you keep, an optional reason, Cancel my plan (primary) and Keep my plan |
| `cancelDone` | After cancelling: "Ends 3 Dec", renewal off, Resume plan, and a toast |
| `refundAsk` | Refund within 7 days: the charge, what happens (team answers within 2 working days, money back to the same card in 5 to 10 working days, Pro ends when the refund is made), a short reason |
| `refundSent` | My requests with the refund on top, status Waiting |
| `refundLate` | After 7 days: why it can't be asked here, cancel is still open, support@uxgate.org |

### `../slice-4/EmailPages.dc.html`

Six billing views were added to the slice 4 template: `receipt`, `renewSoon` (annual plans, 7 days before), `payFailed`, `cancelled`, `refundYes`, `refundNo`, and `walletDue` (wallet payers, 3 days before the period ends; used only if Paymob can't renew wallets). Billing emails always arrive and can't be turned off. Refund answers are signed "The UXGate team". The template gained an optional key and value list (`rows`).

### `RowS5Moments.dc.html`

Every slice 5 moment with its illustration and sound. Billing plays no more than taps, toggles and sheets; the only bigger sound is gate-open on success. No error or wrong sounds on any payment problem. No new sound files. The payment, gift, calendar and shield illustrations come from `../system/illustrations/`.

## Also changed on earlier pages

- Landing (mobile and desktop): `[PRICE]` is now 249 EGP a month, with the annual and other-region prices under it.
- Public path pages: the price band and the terms text now describe monthly and annual plans priced by region.
- Settings: a "Plan and billing" row under Account, with the PRO tag.
- Inbox: the payment row shows 249 EGP; the help answer about cancelling points to Settings, Plan and billing.

## Student email domains

At launch the student price needs a university email. Addresses ending in `.edu`, `.edu.eg`, `.edu.sa`, `.ac.ae` and similar academic domains count (for example `.edu.jo`, `.edu.kw`, `.ac.ma`). The list becomes an admin setting with the admin panel; ID upload comes then too.

## PM calls (3 November 2026)

Accepted as written: 1, 2, 3, 4, 6, 7, 8 and 10 below. Changed:

- **5, wallets:** the wallet payer path is designed now (`billingWallet`, `billingWalletLate`, `walletDue`) and used only if Paymob can't renew wallets with a saved token.
- **9, student check:** university email only at launch; the ID upload frame is kept and marked "after the admin panel".
- **Welcome back:** applied by itself for a learner whose Pro ended 60 or more days ago; the founding member discount stays a code.

## Assumptions for the PM

1. The plan is called **UXGate Pro**, shown as a navy and cyan PRO tag. The brief says "Pro feature", so the name followed it.
2. Gulf and other Arab prices are shown in US dollars in the app; Paddle shows the local currency and any tax at checkout.
3. A failed renewal gets a 7-day grace period with retries 2 and 5 days later, and Pro stays on during it. After that Pro pauses; nothing is deleted.
4. A refund ends Pro when the money is returned. Refunds are answered by the team within 2 working days. Banks take 5 to 10 working days.
5. Paymob renewals use the saved card. If Paymob can't renew wallets, a wallet payer pays each month by hand: a "Pay for next month" state, an email 3 days before the period ends, and the same grace period if they miss it. The build checks this on the Paymob account.
6. Paddle is the merchant of record, so the statement reads PADDLE.NET* UXGATE and Paddle also sends its own receipt. Ours is still sent so every learner gets the same email.
7. Monthly to annual starts at the end of the paid month (no proration). Annual to monthly starts at the annual renewal.
8. Cancelling asks for a reason but doesn't require one, and shows no retention offer.
9. The student check is a university email link at launch, renewed each year. ID upload comes after the admin panel.
10. The annual renewal reminder goes 7 days before the charge. Monthly plans get no reminder, only the receipt.
