# How we deliver UXGate

Version 2, 30 October 2026. Agreed with Eyad: design runs one sprint ahead; each sprint's design is then built, secured and tested while the next sprint is designed. The learner web app comes first. The admin panel follows as one waterfall project once the web app is final.

## The pipeline

Each week is one sprint (Thursday to Wednesday). A **slice** is the set of screens and features designed together in one sprint and built in the next.

| Sprint | Design thread | Build thread | Verify thread (security and testing) |
| --- | --- | --- | --- |
| 1 · 29 Oct – 4 Nov | Slice 1 ✓ | Slice 1 starts after design approval | |
| 2 · 5 – 11 Nov | Slice 2 | Slice 1 | Slice 1 |
| 3 · 12 – 18 Nov | Slice 3 | Slice 2 | Slice 2 |
| 4 · 19 – 25 Nov | Slice 4 | Slice 3 | Slice 3 |
| 5 · 26 Nov – 2 Dec | Slice 5 | Slice 4 | Slice 4 |
| 6 · 3 – 9 Dec | Admin requirements (PM) | Slice 5 | Slice 5 |
| 7 · 10 – 16 Dec | | Web app release candidate fixes | Full regression, accessibility and security audit |

Then the **admin panel, waterfall**: requirements (sprint 6) → design of the whole admin panel (sprints 8–9) → build (sprints 10–12) → security and testing (sprint 13) → release. See [backlog.md](backlog.md) for what each slice holds.

## Gates

Nothing moves to the next stage without passing its gate. Eyad approves every gate; the PM thread checks it first and tells Eyad what to look at.

| Gate | Passed when |
| --- | --- |
| **Design ready** | Every screen and state in the slice exists in EN light and AR dark, mobile and desktop; the PM review finds no blocking gaps; Eyad approves the canvas |
| **Build ready for verify** | Every story's acceptance checks pass on a Vercel preview; CI green; the build thread posts the preview link and a story checklist |
| **Verified** | The verify thread's test and security checklists pass; every blocking bug is fixed and re-tested |
| **Done** | Eyad approves; the slice's PR is merged to `main` |

## Threads

| Thread | Lifetime | Job |
| --- | --- | --- |
| **PM** (this thread) | Whole project | Plans, writes requirements and start prompts, checks every gate, tells Eyad what to do next |
| **Design** | One thread for all slices, then the admin design | Designs each slice in Claude Design from the PM's design brief |
| **Build slice N** | One new thread per slice | Builds the slice from the PM's build brief; one PR per slice (stories as commits) |
| **Verify slice N** | One new thread per slice | Independent reviewer: writes automated tests, runs the security checklist, files bugs as GitHub issues |
| **Content** (P01, P10, P14 …) | One per path, as today | Lessons and videos; independent of the sprints |

Why separate build and verify threads: a fresh thread checks the work without the builder's assumptions, the way a QA team would. Why a new build thread per slice: each starts with a clean context and the repo as its memory, so it stays fast and cheap. Security and testing share one thread per slice because they use the same preview and the same checklist run; a dedicated security audit thread runs once more in sprint 7.

Credits: every thread follows `/mnt/project-files/delivery/credits-policy.md` (model and effort per kind of work, small contexts, batched feedback). At most two heavy threads run at once (design and build). Start the verify thread when the build thread says the preview is ready.

## Handoffs

- PM → Design: `docs/delivery/sprint-N/design-brief.md`
- Design → PM: canvas link and design PR; PM writes `design-review.md`
- PM → Build: `docs/delivery/sprint-N/build-brief.md` and the approved canvas
- Build → Verify: preview link, PR, story checklist
- PM → Verify: `docs/delivery/sprint-N/verify-plan.md`
- Verify → Build: GitHub issues labelled `bug` and `slice-N`; build fixes them on the same PR
- Start prompts for each new thread: `/mnt/project-files/delivery/prompts/`

## Merging

Decided by Eyad on 30 October 2026: product PRs (docs, design system, app code) merge to `main` after their gate passes. Eyad merges; Claude never does. Content PRs stay open until one interactive and one hybrid path are approved as the model (29 Oct).
