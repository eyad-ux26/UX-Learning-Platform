# Admin panel · Phase 1 design ("Run the business")

Live canvas: https://claude.ai/artifact/1y4y5vR8CAppxXZUFdsq5u ("UXGate Admin Panel", private until shared).
Requirements: https://claude.ai/artifact/FG7zf7gMgUNncmZR6jy7e9 (ids below, such as `LRN-2`, refer to it).
Board sources: [`phase-1-boards/`](phase-1-boards/) (`.dc.html` boards, `admin.css`, `canvas.json`). Icons and logos are canvas assets (`/_blob/…`).

Phase 1 covers the shell, dashboard, learners and Learner 360, customer support, billing, certificate lookup, global search, team and roles (with the single founding super admin), approvals and the audit log. Content editing, reports, communications, settings and system health are Phase 2. Their menu items are visible to roles that will have them and open a "Phase 2" placeholder (`#phase-2`).

All names, numbers and messages on the boards are sample data.

## How to review

The canvas has five pages:

1. **System and shell**: the Phase 1 map (start here, every board is linked), the admin design system, and the menu for three roles.
2. **Phase 1 screens**: four rows: overview, people and support, money, then find, team, roles and audit.
3. **Key flows**: eight clickable flows. Use the dark bar at the top of each board: step buttons, Back and Next. Buttons inside the screen also move the flow on.
4. **States and roles**: five states for ten lists, and Learner 360 for a support agent and an analyst side by side.
5. **Tablet and phone**: dashboard and support inbox at 1024, and the inbox at 390 (tap a ticket, then the back arrow).

## Design direction

- The UXGate tokens, Titillium Web and Cairo, in a calmer work-tool layer (`admin.css`). Text is 14 px, tables 13 px, controls 36 px and table rows 42 px. The logo is used as given.
- The design-tool idea comes from the learner app. The menu reads like a layers panel, and the current page wears the selection frame with four handles. Detail pages open a right inspector. There are no rewards, mascots or bounce.
- There is one status chip system (good, info, waiting, bad, off). Each chip has an icon and a word, never colour alone.
- Chart series are Paddle `--s1` and Paymob `--s2`, checked for colour-blind separation. Charts always have a legend, labels and a "Show as a table" link.
- The panel is in English. Anything a learner reads is shown in Arabic (RTL, Cairo) and English. Replies default to the learner's app language.
- The environment badge (Production or Staging) is always in the top bar.
- Light is the default. Night tokens exist (`.adm[data-theme="dark"]`), and the Dashboard board has a theme switch. The other boards are reviewed in light only.

## Screens and requirements

| Board | Shows | Requirement ids |
| --- | --- | --- |
| Main | Phase 1 map with links | all |
| DesignSystem | Principles, tokens, type EN/AR, buttons, status, roles, form controls, table with masking and inspector, confirm dialog, approval card, toast with undo, empty/loading/error/no access | layout standard, BIL-10 |
| ShellRoles, Nav, TopBar | Menu built from permissions for super admin (26 items), support agent (9) and content editor (8); top bar with search, env badge, bell, help, me | navigation, top bar |
| Dashboard (super admin), DashboardSupport | KPIs vs same day last week, needs attention, revenue by provider with hover, regions, linear funnel, paths; support version with queues and SLA | DSH-1 to DSH-6 |
| MyWork | Approvals for a support lead, then tickets by SLA | TEAM-5, SUP-6, SUP-7 |
| Learners | Saved views, filters, bulk bar, add-filter popover | LRN-1 |
| Learner360 | Facts, progress by unit, billing, tickets and emails, team notes with @mention, activity, quick actions gated by role, masked data | LRN-2, LRN-3, LRN-5 |
| ViewAsLearner | Read-only Arabic home with a "viewing as" banner | LRN-4 |
| SupportInbox | Queues, ticket list, Arabic ticket, system event, internal note, EN/AR composer, Learner 360 side panel | SUP-1 to SUP-4 |
| Macros | Macro list and editor, EN and AR side by side, placeholders and actions | SUP-5 |
| SupportSettings | SLA targets, business hours, assignment rules, satisfaction survey EN/AR, support reports | SUP-6, SUP-7, SUP-8, SUP-12 |
| Appeals | Step as the learner saw it in Arabic, her reasoning, context, Arabic reply macro, send to content quality | SUP-10, SUP-9 |
| Subscriptions | All, paid, comp, past due, cancelled, refunded; comp grant drawer | BIL-1, BIL-4 |
| Payments | Payments from verified webhooks, detail rail, linked records, no "mark as paid" | BIL-2, BIL-10 |
| Refunds | 7-day rule checked, agent limit, approve, send for approval, ask for an exception | BIL-3 |
| BillingProblems | Failed payments, past due, Egypt price paid with a foreign card, webhooks with retry | BIL-8 |
| Revenue | MRR, new, churned, refunds, fees, net; MRR by provider; MRR movement; by region and provider; accountant export | BIL-9 |
| Discounts | Codes with uses and revenue; create drawer with price preview | BIL-5 |
| StudentChecks | Proof hidden until opened, checklist, Arabic reject reply | BIL-6 |
| Prices | Read only: region, plan, provider price; changes go through approval in Phase 2 | BIL-7 |
| Certificates | Lookup by id, learner or path; preview; re-issue and revoke | CRT-1, CRT-2 |
| Search | Ctrl K results grouped by type, keyboard hints, masking for an analyst | SRC-1 |
| Team | Members, roles, status, two-step sign-in, last sign-in, invites, suspend; testing tools via the Viewer / QA tester role | TEAM-1, TEAM-2, TEAM-6 |
| Roles | Permission matrix from the requirements, custom role editor | TEAM-3 |
| SuperAdmins | Pending grant with 24-hour countdown, founding account protected, the rules | TEAM-4 |
| Approvals | Waiting for me, asked by me, decided; detail with before/after | TEAM-5 |
| AuditLog | Filters, entry with before/after, reason, IP, device, same-target history | AUD-1 to AUD-3 |
| AdminSignIn | Two steps (password or Google, then passkey or authenticator), lockout and no-access states | safeguards |
| AdminAccount | Roles, passkeys, sessions, sign out everywhere, notifications, theme, my recent actions | safeguards, top bar |

## Key flows

| Board | Flow | Steps |
| --- | --- | --- |
| FlowInvite | Invite an admin and give a role | Team, invite drawer with roles, passkey confirm, invited row plus invite email |
| FlowSuperAdmin | Grant super admin with re-auth and cooling period | Choose (only eligible admins), type GRANT SUPER ADMIN plus passkey, 24-hour pending card, two super admins after 24 h |
| FlowTicket | Answer a ticket in Arabic with a macro and an action | Ticket, macro picker with its actions, edited Arabic reply (feminine forms), sent with the action logged |
| FlowRefund | Approve a refund within and over the limit | $8 refund approved by the agent, $72 sent for approval, the support lead approves (the menu switches role), both tracked |
| FlowFindLearner | Find a learner from a payment id and open View as learner | Paste a Paddle id in Ctrl K, payment, Learner 360, reason, read-only view |
| FlowAppeal | Review an appeal | Read, reject with an Arabic reply, step sent to content quality |
| FlowRevoke | Revoke a certificate | Find, confirm with a public reason and the typed id, public page says "no longer valid" in EN and AR |
| FlowAudit | Read the audit trail of a change | Learner 360 activity, log filtered to her, entry with before/after, the whole session |

## States, roles and devices

- **ListStates**: empty, loading, error, no access and masked for Learners, Support inbox, Appeals, Subscriptions, Payments, Refunds, Billing problems, Certificates, Team and Audit log.
- **RoleCompare**: Learner 360 for a support agent and for an analyst, with a table of what differs.
- **DashboardTablet**, **InboxTablet**: the same pages at 1024. Below 1180 px the menu becomes an icon rail.
- **InboxPhone**: the inbox at 390 is view only. Replies, refunds and role changes say to use a tablet or computer.

## Rules the build must keep

- Every page, field and action is checked on the server (RLS or a server-only admin service). Hiding a button is never the only guard, and middleware is not used for access control.
- Personal data is masked by default. Reveal asks for a reason the first time in a session and is logged. Analysts never get reveal.
- Risky actions show their effects, ask for a reason and are logged. Re-authentication is needed within 10 minutes for role changes, super admin grants, refunds over the limit, exports and deletes.
- Payment state changes only from verified provider webhooks or the provider API. The panel never shows card numbers or secret keys.
- Toasts offer Undo only when the action can really be taken back before it leaves us.
- Sessions time out after 30 minutes idle or 12 hours in total.

## Judgment calls, answered by the Admins (9 Nov 2026)

1. **Region name.** The fourth region (countries outside the Arab world, charged the Gulf price until it gets its own) is named **"Rest of the world"**. "Other Arab countries" stays for the Arab League countries outside Egypt and the Gulf.
2. **Trials.** Design trials now. Phase 2 adds a trial status and tab on Subscriptions, an "Extend trial" action for support on Learner 360, trial-to-paid numbers in Reports and the trial length in Settings. The learner app has no trial yet, so the app needs its own work before these screens do anything.
3. **Phase 2 menu items** are shown to the roles that will get them and open a placeholder until they are built.
4. **Invite emails** are in English, like the panel.
5. **Gulf price** covers the GCC countries plus Iraq (UAE, Saudi Arabia, Kuwait, Qatar, Bahrain, Oman, Iraq). Iraq was on the Other Arab price, so the app's region list changes too; existing Iraqi subscribers keep the price they signed up at.
6. **Egypt price** shows "Amount set on our server", because Paymob has no provider price object.
7. **Time limits** stay as designed: view as learner ends after 30 minutes, unanswered approvals remind after 4 hours, student proof files are deleted 30 days after the decision, too many failed sign-ins pause sign-in for 15 minutes.
8. **Revoking a certificate** needs a reason and the typed certificate id.
9. **Discount codes on the boards are examples only.** The real offers are the ones in `apps/web/lib/billing/pricing.ts`: student 40% (student check valid for one year), welcome back 40% on annual for two years, and the FOUNDING code at 30% for the first annual year.

The boards in `phase-1-boards/` were updated to match these answers (Prices, Dashboard, Revenue, Discounts, Student checks, Appeals, Shell roles).
