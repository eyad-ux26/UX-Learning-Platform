# UX Learning Platform

A practice-first learning platform for UI/UX designers, in English and Arabic. Learners build skills through short lessons of small, auto-checked steps, in the style of Duolingo and Brilliant.

This repository currently holds the **course content** and a **preview player** for reviewing it. The product app (Next.js, Supabase, Vercel) will be added here; see the architecture doc.

## Layout

| Folder | What's in it |
| --- | --- |
| `content/paths/` | One folder per path: `path.yaml`, shared `fixtures.yaml`, and one folder per unit with its lessons |
| `docs/` | The learning model, the content format, and the ID scheme |
| `preview/` | The lesson player used for review (`player.html`) |
| `scripts/` | Content validation and the preview build |

## Working with content

```bash
npm install
npm run validate          # checks every lesson; fails on errors
npm run preview           # builds preview/dist/index.html with every lesson
npm run preview -- P10-U01  # builds only one unit
```

Open `preview/dist/index.html` in a browser to play the lessons. The language button switches between English and Arabic.

## How content is reviewed

Each unit arrives in its own pull request with a link to a playable preview. Play the lessons on a phone, comment on the PR, and merge when the unit is ready.

## Docs

Product and delivery:

- [Product spec](docs/product/spec.md)
- [Metrics and events](docs/product/metrics.md)
- [Decisions and risks](docs/product/decisions-and-risks.md)
- [Architecture](docs/tech/architecture.md) and [data model](docs/tech/data-model.md)
- [Backlog and sprint plan](docs/delivery/backlog.md), [user stories](docs/delivery/user-stories.md), [Definition of Ready and Done](docs/delivery/definition-of-done.md)
- [Design brief](docs/design/brief.md) and the [Sprint 1 design handoff](docs/design/handoff/)

Content:

- [Learning model](docs/learning-model.md)
- [Content format](docs/content-format.md)
- [ID scheme](docs/id-scheme.md)
