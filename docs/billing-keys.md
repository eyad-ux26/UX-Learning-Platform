# Billing keys and settings (slice 5)

Every value below is a **Cloudflare Worker secret** (`wrangler secret put NAME`, or Workers > Settings > Variables and Secrets, type "Secret"), unless the table says "variable". None of them goes in git, chat or the browser. Until they are set the site keeps working: payments show "Payments open soon", and preview hosts use the test payment page (`BILLING_MOCK=1`, set by the preview deploy command only).

## Paymob (Egypt, EGP)

From the Paymob dashboard (test mode first, then live). Settings > Account info, and Developers > Payment integrations.

| Name | What it is |
| --- | --- |
| `PAYMOB_SECRET_KEY` | Secret key (Unified Checkout / Intention API) |
| `PAYMOB_PUBLIC_KEY` | Public key (used to build the hosted checkout link) |
| `PAYMOB_API_KEY` | Legacy API key. Needed for every webhook (each transaction is read back from Paymob before it counts), saved-card renewals and refunds of refused payments |
| `PAYMOB_HMAC_SECRET` | HMAC secret that signs callbacks |
| `PAYMOB_CARD_INTEGRATION_ID` | Online card integration id |
| `PAYMOB_WALLET_INTEGRATION_ID` | Mobile wallet integration id |
| `PAYMOB_MOTO_INTEGRATION_ID` | MOTO (card-not-present) integration id, for charging the saved card at renewal. Ask Paymob support to turn on card tokenisation ("save card") and MOTO for the account. |
| `PAYMOB_BASE_URL` | Variable, optional. Default `https://accept.paymob.com`. |
| `PAYMOB_EG_CARDS_ONLY` | Variable, optional, **off by default** (an admin decision). `1` refuses and refunds an Egypt-price card payment when Paymob reports a card issued outside Egypt; the learner sees why and gets an email. Change it in Cloudflare (Settings > Variables), no code deploy. Before turning it on: run `0037_billing_refused.sql`, and cut `CARD_COUNTRY_PATHS` to the confirmed field (below). |

In the Paymob dashboard, set each integration's **Transaction processed callback** and **Transaction response callback** to:
- processed (server to server): `https://uxgate.org/api/webhooks/paymob`
- response (the learner's browser): `https://uxgate.org/en/app/checkout/return` (the app also sends its own return link per checkout)

## Paddle (every other country, USD)

From Paddle (sandbox first: sandbox-vendors.paddle.com).

| Name | What it is |
| --- | --- |
| `PADDLE_API_KEY` | Developer tools > Authentication > API key |
| `PADDLE_CLIENT_TOKEN` | Developer tools > Authentication > Client-side token (safe in the page, but kept as a secret for one place to manage) |
| `PADDLE_WEBHOOK_SECRET` | Developer tools > Notifications > the destination's secret key |
| `PADDLE_ENV` | Variable: `sandbox` or `production` |
| `PADDLE_PRICE_GULF_MONTH`, `PADDLE_PRICE_GULF_YEAR` | Catalog price ids (`pri_...`) for $8 / $72 |
| `PADDLE_PRICE_ARAB_MONTH`, `PADDLE_PRICE_ARAB_YEAR` | $5 / $45 |
| `PADDLE_PRICE_WORLD_MONTH`, `PADDLE_PRICE_WORLD_YEAR` | Countries outside the Arab world. Until admins set a price these can be the Gulf ids. |
| `PADDLE_DISCOUNT_STUDENT` | Discount id (`dsc_...`): 40%, recurring |
| `PADDLE_DISCOUNT_WELCOME_BACK` | 40%, annual only, recurring for 2 billing periods |
| `PADDLE_DISCOUNT_FOUNDING` | 30%, annual only, first period only |

Paddle notification destination: `https://uxgate.org/api/webhooks/paddle`, events: `transaction.completed`, `transaction.payment_failed`, `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.paused`, `subscription.canceled`, `subscription.past_due`, `subscription.resumed`, `adjustment.created`, `adjustment.updated`. Approve the domain `uxgate.org` in Paddle (Checkout > Website approval) before going live.

## Shared

| Name | What it is |
| --- | --- |
| `BILLING_TOKEN_KEY` | 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts saved Paymob card tokens. Required once Paymob keys are set; never change it after cards are saved. |
| `RESEND_API_KEY` | Resend API key for billing emails from `hello@uxgate.org` (receipts, renewal notices, failed payments, refunds, student links). The domain must be verified in Resend. |
| `CRON_SECRET` | Already set for slice 3; the billing job uses the same one. |
| `SITE_URL` | Variable, optional. Links in emails. Default the production workers.dev address; set `https://uxgate.org` when the domain moves. |
| `BILLING_MOCK` | Preview versions only, from the non-production branch deploy command: `cd apps/web && npx wrangler versions upload --var BILLING_MOCK:1`. Never in `wrangler.jsonc` or the Worker's variables (they reach production). The code also refuses it on uxgate.org and the production workers.dev host, and Pro bought with it is stored as test-mode Pro that production ignores. |

## Before real learners pay

- Previews must not share the production database: give previews the staging Supabase project.
- Paymob live mode and Paddle production keys, then one real payment and refund on each.
- `support@uxgate.org` must receive mail (refund requests go there).
- **Paymob card country (before `PAYMOB_EG_CARDS_ONLY=1`):** the paths in `CARD_COUNTRY_PATHS` (`apps/web/lib/billing/paymob.ts`) are guesses, because Paymob's docs couldn't be reached when this was written. Pay once in Paymob test mode with a test card, then open that transaction (Paymob dashboard, or `GET /api/acceptance/transactions/<id>`), find the field that holds the country that issued the card, and cut the list to that one path. Only a real ISO 3166-1 two-letter code other than EG refuses a payment. Placeholders such as NA, XX, ZZ and UNK are ignored, so a missing value never refunds an Egyptian card.
