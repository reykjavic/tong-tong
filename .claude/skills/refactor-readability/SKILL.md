---
name: refactor-readability
description: Use when the user wants to refactor code for readability, extract repeated UI, or clean up a component without changing behavior — "refactor X for readability", "clean up this component", "extract the repeated wrapper", "make this easier to read". The patterns catalog lives in references/patterns.md.
---

# Readability refactor

Turning "it works" code into "it *reads*" code, with **zero behavior change**. Applicable to any codebase — the pattern catalog (`references/patterns.md`) uses this repo's examples but is generic.

## The contract

- **No behavior change. No visual change.** The only permitted diff is *structure and names*.
- If a change would alter rendering, output, or logic even slightly, it doesn't belong in a readability branch.
- This is **not** a rewrite, a bugfix, or a feature branch.

## Workflow (in order)

1. **Branch small.** One concern per branch. Find a second concern → note it and move on.
2. **Survey first.** Read the files and catalog repetition/complexity *before* writing anything. Ask: where is the same thing spelled out again and again? Where is a reader forced to do arithmetic or decode data to understand intent? Write the list down — it becomes the diff plan.
3. **One pattern per change.** Extract one repetition, commit, move to the next. Small commits keep the refactor reviewable and **revertible**.
4. **Extract, don't rewrite.** Create a shared component / constant / helper that captures what the repeated code *meant*, then swap call sites. Don't improve logic while extracting.
5. **Verify** — run the **verify-app** skill: `npm run build` (typecheck first — `noUnusedLocals`/`noUnusedParameters` catch dead imports), then eyeball the affected screens at desktop + mobile and in **both languages**. Renders must be identical.
6. **Commit** with a conventional message describing the *pattern*, not the files.

## Pick your pattern

Load `references/patterns.md` and match the problem you found:

- **P1** Repeated wrapper / `sx` object → shared component (`ContentCard`).
- **P2** Repeated styling props → opinionated primitives (`Title` / `BodyText`).
- **P3** Fragile string tricks → the framework's utility (`alpha()`).
- **P4** Anonymous mapped data → typed shape + stable keys.
- **P5** Magic values + cryptic data → named constants (next planned; `src/components/features/OpeningHours.tsx`).

## Rules of thumb

- Prefer the framework's own mechanism (theme, variants, components) over ad-hoc constants.
- Extract exactly what is repeated, no more — over-inclusion changes behavior; over-abstraction hides the original code.
- Don't rename public surface (exports, routes, i18n keys, URLs) — that's a breaking change with its own review.
- Don't touch data-fetching, state, or business logic. If the logic itself is the problem, that's a different (riskier) branch.

## Gotchas

- `npm run build` runs `tsc` first, so unused imports and type errors fail the build — let it be the safety net.
- Text primitives (P2) carry **no spacing** — vertical rhythm lives on the wrapping `Stack spacing={…}`, not on `mb` per instance.
- Only extract what's actually identical (P2's emoji in the About highlight card is an icon, not text — forcing it through `BodyText` mislabels it).
- `git add -A` won't stage deletions in `content/posts/` (sparse-checkout) — irrelevant here, but don't be surprised if those files never appear in a refactor diff.

**Reason:** the no-behavior-change contract is what makes a readability branch safe to review and merge fast; every rule above exists to protect that.
