# Decisions and risks

The plan doc "Learning Platform: Full Plan" holds the full history. This log keeps the decisions that shape the build.

## Decisions

| Date | Decision |
| --- | --- |
| 26 Oct 2026 | Learning model approved: path → unit → lesson → step, try-first, contrast, independent step, skill check |
| 26 Oct 2026 | Private beta = Paths 1 and 10 complete, full core loop, subscription in test mode |
| 28 Oct 2026 | Mastery learning: every skill has 4+ variants in 4+ scenarios; missed skills retested at unit end |
| 29 Oct 2026 | Stack: Next.js on Vercel, Supabase, Bunny Stream, Resend |
| 29 Oct 2026 | Name UXGate (relaunch, new look), domain uxgate.org |
| 29 Oct 2026 | Full-control admin panel in the first release |
| 29 Oct 2026 | Achievement pages opt-in; data export and deletion in settings |
| 29 Oct 2026 | No paid outside review; Claude self-review with automated checks |
| 29 Oct 2026 | Payments: assume Paymob (Egypt) and Paddle (elsewhere); can change later |
| 29 Oct 2026 | Design in Claude Design; own identity, never copying Duolingo or Brilliant |
| 29 Oct 2026 | Content PRs stay open until one interactive and one hybrid path are approved as the model |
| 30 Oct 2026 | Colours follow the UXGate Brand Resources (navy, UXGate blue, cyan, ice, mint, night); the earlier ultraviolet and coral palette is dropped |
| 30 Oct 2026 | The original UXGate logo stays unchanged; logo animations are added on top of it |
| 30 Oct 2026 | Icons: Phosphor Icons, with Tabler Icons outline only where Phosphor has a gap |
| 30 Oct 2026 | The design system also drives the lesson videos (Remotion theme and logo kit) |
| 30 Oct 2026 | Type: Cairo for Arabic, Titillium Web for English |
| 30 Oct 2026 | Sprint 1 design is run by the admins in Claude Design from the handoff pack in `docs/design/handoff/`; the earlier draft design system and screens are dropped |

## Open

| Question | Needed by |
| --- | --- |
| Final monthly price (within $5 to $10) and local prices | Sprint 6 |
| Final payment provider confirmation | Sprint 6 |
| Which path is the approved hybrid path for the beta | Sprint 5 |
| Support email inbox (support@uxgate.org) and sender domain for Resend | Sprint 3 |
| Apple developer account for Sign in with Apple ($99/yr) | Sprint 3 |

## Risks

| Risk | Likelihood | Impact | Response |
| --- | --- | --- | --- |
| One builder at 10–20 h/week | High | Dates slip | Claude builds, admins review; cut scope before dates; re-plan weekly |
| Paymob recurring needs saved-card tokens and our own renewal job | Medium | Missed renewals | Daily renewal cron with retries and dunning emails; Paddle handles its own |
| Paymob or Paddle rejects an Egypt-registered seller | Medium | No international payments | Start with Paymob; add Paddle or Lemon Squeezy when approved |
| Arabic RTL bugs in interactive steps | Medium | Broken lessons for the main market | Logical properties lint, RTL screenshots in CI, every story checked in AR |
| Content not ready for the beta | Medium | Beta delayed | Content runs in parallel; beta can start with fewer units |
| Video editing slower than writing | Medium | Hybrid path late | At most one clip per lesson; lessons ship without clips if needed |
| Cost grows with video traffic | Low | Budget over $100 | Bunny caps and alerts; clips are short |
