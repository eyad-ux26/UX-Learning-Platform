# UX Learning Platform

A practice-first learning platform for UI/UX designers, in English and Arabic. Learners build skills through short lessons of small, auto-checked steps, in the style of Duolingo and Brilliant.

This repository currently holds the **course content** and a **preview player** for reviewing it. The product app will be added here once the stack is chosen.

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

- [Learning model](docs/learning-model.md)
- [Content format](docs/content-format.md)
- [ID scheme](docs/id-scheme.md)
