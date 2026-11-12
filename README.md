# UX Learning Platform

A practice-first learning platform for UI/UX designers, in English and Arabic. Learners build skills through short lessons of small, auto-checked steps, in the style of Duolingo and Brilliant.

This repository holds the course content, the web app (learner app, public site and admin panel) and the database.

## Layout

| Folder | What's in it |
| --- | --- |
| `apps/web/` | The Next.js app, deployed to Cloudflare Workers. Start with the [developer guide](docs/tech/learner-app.md) |
| `packages/player/` | The lesson player used by the app and the preview |
| `packages/content/` | Content loader, validator and compiler (its `dist/` is generated) |
| `packages/tokens/` | Design tokens as CSS variables (its `dist/` is generated) |
| `supabase/` | SQL migrations, row-level security and the content seed ([supabase/README.md](supabase/README.md)) |
| `content/paths/` | One folder per path: `path.yaml`, shared `fixtures.yaml`, and one folder per unit with its lessons |
| `docs/` | Product, design, tech and content docs |
| `preview/` | The standalone lesson player used to review content PRs |
| `scripts/` | Content validation and the preview build |

## Working on the app

```bash
npm ci
npm run tokens
npm run dev               # http://localhost:3000
npm run typecheck && npm run lint && npm test
```

See the [developer guide](docs/tech/learner-app.md) for the folder layout, how a lesson is played and scored, strings
in English and Arabic, and where new code goes.

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
- [Architecture](docs/tech/architecture.md), [data model](docs/tech/data-model.md) and the [learner app developer guide](docs/tech/learner-app.md)
- [Deploying to Cloudflare](docs/deploy-cloudflare.md) and [billing keys](docs/billing-keys.md)
- [Delivery process](docs/delivery/process.md), [backlog and sprint plan](docs/delivery/backlog.md), [user stories](docs/delivery/user-stories.md), [Definition of Ready and Done](docs/delivery/definition-of-done.md)
- [Design brief](docs/design/brief.md) and the [Sprint 1 design handoff](docs/design/handoff/)

Content:

- [Learning model](docs/learning-model.md)
- [Content format](docs/content-format.md)
- [ID scheme](docs/id-scheme.md)
