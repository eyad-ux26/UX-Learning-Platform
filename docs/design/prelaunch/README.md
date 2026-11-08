# Pre-launch: Coming soon page on uxgate.org (canvas v73, matches PR #173)

Canvas page "10 · Pre-launch · Coming soon": boards PL-1, PL-2 and PL-3. The component is `ComingSoonPages.dc.html` (props `view`, `part`, `device`, `lang`, `theme`). The CSS is the "Pre-launch" block at the end of `../system/uxgate.css`. The launch emails are the `launchConfirm` and `launchLive` views of `EmailPages` (slice 4 and 5 email layout).

## Who sees what

| Visitor | What uxgate.org shows |
| - | - |
| Not signed in | The Coming soon page (every public route redirects to it, except Privacy, Terms, Refund policy, the team page and the confirm link). |
| Signed in, not an admin | The same page with "You're on the list, Yasmin" and **Sign out** (`view=member`). |
| Signed in with the admin role | The full tool, with a **Pre-launch · team view** badge on every screen (`PathsPages team="on"`: a bar on top on phones, a pill under the logo in the desktop rail). The badge links to the public page. |

There is no team link on the public page. The team opens a hidden page, `/en/team` or `/ar/team` (`view=team`): a "Team only" / «للفريق فقط» chip, the title "Team access" / «دخول الفريق», one team password field with show/hide, **Continue** / **متابعة** and "Back to UXGate" / «العودة إلى UXGate». A wrong password shows the error under the field (`view=teamWrong`) and keeps focus there. The right password opens the normal sign-in, where each admin signs in with their own account. Admin access still comes from the admin role, checked on the server for every request; the team password and the hidden page are not the protection.

## The page

- Header: logo and the language switch (عربي / English). A signed-in member also sees their avatar.
- Hero: "Opening soon" chip, "Practise real design decisions." and the landing lead (copy reused from the landing page).
- Launch-notify form: label "Get one email when we open" / «نرسل لك رسالة واحدة عند الإطلاق», one email field, **Notify me** / **أخبرني عند الإطلاق**, and the consent line with a link to the Privacy Policy. Phones stack the field and button. Desktop puts them in one row.
- "What you'll get": the three landing points, plus a fourth: Arabic and English, switch at any time.
- No prices block on the public page (PR #195, Eyad, 6 Nov 2026). The page is the hero, the waitlist form, "What you'll get" and the footer only. Prices were added earlier for Paddle's website review; only the public Coming Soon page dropped them.
- Footer: © 2026 UXGate, Privacy Policy, Terms, Refund policy / «سياسة الاسترداد», support@uxgate.org. No team link.
- Desktop art: the artboard loader frame with the logo's `loading` eye motion (from PR #155), named "# UXGate · launch".

## Form states (PL-1)

| `view` | What happens |
| - | - |
| `idle` | Empty field with placeholder name@example.com. |
| `busy` | The button gets `aria-busy="true"` (spinner after the label, colour kept). A hidden status says "Adding you to the list…". |
| `invalid` | Checked on submit. The error sits under the field: "Enter an email like name@example.com." The field gets `aria-invalid="true"` and `aria-describedby` for the error and the consent line. The value is kept and focus moves to the field. |
| `network` | A `role="alert"` box above the field: "We couldn't add you. Check your connection and try again. What you typed is still here." |
| `tooMany` | Same alert box with an hourglass: "Too many tries. Wait a few minutes, then try again. What you typed is still here." |
| `sent` | The form is replaced by a status panel: "Check your inbox to confirm". It shows the email, a note about spam and the 7-day link, and "Use a different email". |
| `already` | "You're already on the list", only for a confirmed address. Any other address sees `sent` (and an unconfirmed one gets the confirmation email again). |

## Double opt-in (PL-2)

1. Submit stores the email as unconfirmed, with the language it was entered in, and sends `launchConfirm` in that language. The link works for 7 days.
2. The link opens `view=confirmed`. A link older than 7 days opens `view=expired`: the empty form with a clock alert, "This link has expired. Confirmation links work for 7 days. Enter your email again and we'll send a new one." Otherwise: "You're on the list. We'll email yasmin.adel@example.com once, when UXGate opens."
3. On launch day, confirmed addresses get `launchLive` once. It has a "Leave the launch list" link. Nothing else goes to this list.
4. Submits are rate-limited per network and per address (`tooMany`). Unconfirmed addresses are deleted after 30 days; the Privacy Policy should say so.

## Copy keys

EN and AR are in the component's `C` object. Arabic keeps "UXGate" in Latin script. Emails are wrapped in `<bdi>` so they read correctly inside Arabic sentences.

## Build notes (PR #224, Pricing page for Paddle LIVE approval)

Noted on board PL-1. The frames don't show this yet.

- **New public Pricing page** at `/en/pricing` and `/ar/pricing`, with the public header and footer. It has two cards:
  - **Free**, $0: Unit 1 of every path, plus skill checks on the free units.
  - **UXGate Pro**: $8 a month or $72 a year, with a "save" line.
- Each card lists what's included, the billing period and a cancel-any-time note.
- **Under the cards:**
  - Notes on USD, tax and the student discount.
  - Links to Terms, Privacy and Refund.
  - A contact line for support@.
- **Footers:**
  - The Coming Soon footer links Pricing, Privacy, Terms, Refund and Contact. The contact entry used to show the email address and is now labelled "Contact".
  - Coming Soon itself still has no pricing section.
  - The shared public footer's Pricing link goes to `/pricing` instead of `/#plan`.
