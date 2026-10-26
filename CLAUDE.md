# Notes for Claude

- Content lives in `content/paths/` as YAML; the format is in `docs/content-format.md`. Run `npm run validate` after any content change and fix every error.
- Write English and Arabic together in the same change. Arabic is simple MSA, keeping English UX terms with a short explanation.
- One pull request per unit. Build the preview with `npm run preview -- <unit id>` and publish `preview/dist/index.html` as the playable preview linked in the PR.
- Lessons follow `docs/learning-model.md`: 8 to 12 steps, try-first prediction, contrast step, an independent step on a new case, and a skill check ending each unit.
- Keep misconception IDs stable across a path; reuse an existing ID when the same mistake appears again.
