# multica-sandbox

A deliberately small React board app used as a safe target for Multica agent runs.

Stack: Vite 8, React 19, TypeScript, Tailwind CSS 4, oxlint.

## Develop

```bash
bun install
bun dev      # http://localhost:5173
bun run build
bun run lint
```

## Layout

- `src/types.ts` — `Task`, `Status`, column labels
- `src/storage.ts` — `localStorage` load/save with shape validation
- `src/App.tsx` — board UI: add a task, move it between Backlog / In progress / Done

State persists in `localStorage` under `multica-sandbox.tasks.v1`. There is no backend.

## Why it exists

Agents need a repository small enough to reason about end to end, but real enough
that changes are observable in a browser. Good starter work: drag-and-drop between
columns, task editing and deletion, due dates, filtering, keyboard navigation,
and accessibility passes on the column headers and card controls.
