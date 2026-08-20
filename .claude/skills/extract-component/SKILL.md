---
name: extract-component
description: Use when the user wants to pull a block of JSX out of an existing component into a new, properly typed subcomponent — "extract this into a component", "extract the nav links", "pull the drawer language list into its own file", "create a component for the …". Produces a TypeScript-typed component with correct imports and a working call site — the manual equivalent of Glean / VSCode React Refactor, which neither generate prop types nor reliably detect loop variables.
---

# Extract a typed component

Turn a JSX block inside a component into its own file, with **TypeScript-typed props**, correct imports and a working call site. Same contract as the **refactor-readability** skill: **zero behavior change, zero visual change** — only structure.

This repo is MUI + Wouter + a custom i18n context (`useI18n()`), so the rules below are specific to it.

## Workflow (in order)

1. **Read the source component first.** Identify the JSX block to extract and every free variable it references. Split them into two groups:
   - **Real props** → typed fields in `interface <Name>Props`. Typical case: a `.map()` item (e.g. `link` from `links.map((link) => …)`).
   - **Belongs inside the new component** → never a prop: imports (`Link` from `wouter`, MUI components) and hook values (`t` from `useI18n()`, `theme`, `isMobile`, …). Move them into the new file.
2. **Create the file** in the right folder (AGENTS.md classification):
   - Navbar/footer subcomponent → same folder as its parent, e.g. `src/components/layout/navbar/`.
   - Product-specific unit → `src/components/features/`.
   - Dumb presentational primitive → `src/components/ui/`.
3. **Write the component**:
   - Default export, PascalCase file name (repo convention).
   - `interface <Name>Props` with a typed field per real prop.
   - Copy the `sx` / structure **verbatim** — no visual change.
   - Get `t` via `const { t } = useI18n()` inside; import MUI components and wouter `Link` in the new file.
   - No `import React` (the new JSX transform is enabled).
4. **Wire the call site**: import the component and replace the JSX with `<Name … />`. In a `.map()`, the **`key` goes on the call site**, never inside the extracted component.
5. **Update the barrel** if the folder has one (`src/components/layout/navbar/index.ts`) — add a named export for the new component.
6. **Verify** (finish with the **verify-app** skill):
   - `npx tsc --noEmit` — `noUnusedLocals` / `noUnusedParameters` catch dead imports and unused props.
   - `npm run dev` → playground at `/playground.html`; eyeball the affected area at desktop + mobile (the navbar drawer) and in both languages (switch via the navbar).
7. **Commit** with a conventional message naming the extracted component.

## Rules of thumb

- Extract exactly the selected JSX — no more. Over-inclusion changes behavior; over-abstraction hides the original code.
- Props = only what genuinely differs per usage. `t`, `Link` and hook values stay inside the component.
- One component per file, default export, typed props.
- `key` at the call site, always.

## Gotchas (all hit in real extractions)

- **Loop variables must become typed props.** VS Code's Glean silently drops `.map()` variables — the extracted component referenced `link` without ever receiving it, and the call site passed nothing. Check every free variable by hand.
- **MUI imports don't travel.** Extractors add `import React` but not `import { Button } from '@mui/material'` — the new file must import every MUI component it uses.
- **`key` gets dropped.** Re-add it at the call site.
- **Hooks stay inside.** `useI18n()` (and any other hook) is called in the new component; it must never become a prop.

See `references/example.md` for a complete worked example — the navbar's `NavbarButton` extraction, including the broken output Glean produced and the correct typed result.

**Reason:** hand-typed extraction is the only way to get typed props in this repo — the available VS Code extensions neither generate TypeScript interfaces nor reliably detect loop variables. This skill standardizes the manual workflow so every extraction follows the same rules.
