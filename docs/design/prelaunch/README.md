# Pre-launch: Coming soon page on uxgate.org (canvas v70)

Canvas page "10 · Pre-launch · Coming soon": boards PL-1, PL-2 and PL-3. The component is `ComingSoonPages.dc.html` (props `view`, `part`, `device`, `lang`, `theme`). The CSS is the "Pre-launch" block at the end of `../system/uxgate.css`. The launch emails are the `launchConfirm` and `launchLive` views of `EmailPages` (slice 4 and 5 email layout).

## Who sees what

| Visitor | What uxgate.org shows |
| - | - |
| Not signed in | The Coming soon page (every public route redirects to it, except Privacy, Terms, sign-in and the confirm link). |
| Signed in, not an admin | The same page with "You're on the list, Yasmin" and **Sign out** (`view=member`). |
| Signed in with the admin role | The full tool, with a **Pre-launch · team view** badge on every screen (`PathsPages team="on"`: a bar on top on phones, a pill under the logo in the desktop rail). The badge links to the public page. |

Admin access comes from the admin role, checked on the server for every request. The footer link only opens the normal sign-in page; hiding it is not the protection.

## The page

- Header: logo and the language switch (عربي / English). A signed-in member also sees their avatar.
- Hero: "Opening soon" chip, "Practise real design decisions." and the landing lead (copy reused from the landing page).
- Launch-notify form: label "Get one email when we open" / «نرسل لك رسالة واحدة عند الإطلاق», one email field, **Notify me** / **أخبرني عند الإطلاق**, and the consent line with a link to the Privacy Policy. Phones stack the field and button. Desktop puts them in one row.
- "What you'll get": the three landing points, plus a fourth: Arabic and English, switch at any time.
- Footer: © 2026 UXGate, Privacy Policy, Terms, support@uxgate.org, **Team sign-in** / «دخول الفريق». It has the same weight as the other links, and is never labelled Admin.
- Desktop art: the artboard loader frame with the logo's `loading` eye motion (from PR #155), named "# UXGate · launch".

## Form states (PL-1)

| `view` | What happens |
| - | - |
| `idle` | Empty field with placeholder name@example.com. |
| `busy` | The button gets `aria-busy="true"` (spinner after the label, colour kept). A hidden status says "Adding you to the list…". |
| `invalid` | Checked on submit. The error sits under the field: "Enter an email like name@example.com." The field gets `aria-invalid="true"` and `aria-describedby` for the error and the consent line. The value is kept and focus moves to the field. |
| `network` | A `role="alert"` box above the field: "We couldn't add you. Check your connection and try again. What you typed is still here." |
| `sent` | The form is replaced by a status panel: "Check your inbox to confirm". It shows the email, a note about spam and the 7-day link, and "Use a different email". |
| `already` | "You're already on the list". If that address never confirmed, send the confirmation email again quietly and show `sent` instead. Assumption: showing "already on the list" for a confirmed address is acceptable, and the PM can switch it to always show `sent` to avoid revealing who signed up. |

## Double opt-in (PL-2)

1. Submit stores the email as unconfirmed, with the language it was entered in, and sends `launchConfirm` in that language. The link works for 7 days.
2. The link opens `view=confirmed`: "You're on the list. We'll email yasmin.adel@example.com once, when UXGate opens."
3. On launch day, confirmed addresses get `launchLive` once. It has a "Leave the launch list" link. Nothing else goes to this list.
4. Rate-limit submits per IP and per address. Unconfirmed addresses are deleted after 30 days (assumption, the Privacy Policy should say so).

## Copy keys

EN and AR are in the component's `C` object. Arabic keeps "UXGate" in Latin script. Emails are wrapped in `<bdi>` so they read correctly inside Arabic sentences.
