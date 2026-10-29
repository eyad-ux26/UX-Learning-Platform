# «هتحلها ازاي؟» Remotion project (template)

    npm i
    npx remotion studio      # DebuggerPreview-Full / -Visual / -Captions, Design/ThemeBoard

- `src/brand/`: tokens + series identity (copies of ../config/; keep them in sync); colours are CSS variables, themeVars(t) switches a subtree to the dark palette
- `src/debugger/`: UX Debugger kit: shell (modes live/paused/inspect/change/replay/compare), inspect cursor, user touch, selection, focus dim, note, inspector, change tag, tag, checklist, scan path, camera
- `src/demo/`: illustrative product screens (always shown with «مثال توضيحي»): CategoryScreen, MeetingTasksScreen, OptionsCompare, SearchScreen (+ EmphasisCompare), RefineScreens
- `src/components/`: Captions, RefMedia (reference media, muted by default), Icons
- `src/episodes/`: registry (3 compositions per episode), index.ts (register episodes), one folder per episode
Pipeline: ../references/workflow.md and ../scripts/episode.sh.
If Chrome Headless Shell can't be downloaded, pass --browser-executable=<path> (REMOTION_BROWSER for episode.sh).
