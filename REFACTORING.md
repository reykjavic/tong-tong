# Readability Refactoring — Playbook

A reusable method for turning "it works" code into "it *reads*" code, with zero behavior change.
Applicable to any codebase — examples below are from this repo, but the patterns are generic.

## Goal

Readable code is code a future developer (including you, in 6 months) can open and understand
without diffing against the old version. This is **not** a rewrite, a bugfix, or a feature branch.

**The contract:**
- No behavior change. No visual change. The only permitted diff is *structure and names*.
- If a change would alter rendering, output, or logic even slightly — it doesn't belong in a readability branch.

## Workflow (do this, in order)

1. **Branch small.** One concern per branch. If you find a second concern, note it and move on.
2. **Survey first.** Read the files and catalog repetition and complexity *before* writing anything.
   Ask: where is the same thing spelled out again and again? Where is a reader forced to do arithmetic
   or decode data to understand intent? Write the list down — it becomes your diff plan.
3. **One pattern per change.** Extract one repetition, commit, move to the next. Small commits make
   the refactor reviewable and, crucially, **revertible**.
4. **Extract, don't rewrite.** Create a shared component / constant / helper that captures what the
   repeated code *meant*, then swap call sites. Do not improve logic while extracting it.
5. **Verify.** Run the typecheck/build (or tests). Then eyeball the affected screens at desktop +
   mobile width, and in every language the app supports. Renders must be identical.
6. **Commit** with a conventional message describing the *pattern*, not the files.

## Patterns catalog

Each pattern: problem → before → after → where applied.

### P1 — Repeated wrapper / sx object → shared component

**Problem:** The same wrapper markup + `sx` is copy-pasted character-for-character into several
places. Changing the style once means editing every copy; a reader can't tell if copies have drifted.

**Before:**
```tsx
<Paper elevation={3} sx={{ borderRadius: 3, p: { xs: 3, sm: 5 }, bgcolor: theme.palette.background.paper }}>
  {/* ... */}
</Paper>
```

**After:**
```tsx
// components/ContentCard.tsx
export default function ContentCard({ children }) {
  return <Paper elevation={3} sx={{ borderRadius: 3, p: { xs: 3, sm: 5 } }}>{children}</Paper>
}
```
Note the extraction also revealed a redundancy: `bgcolor: theme.palette.background.paper` is the
MUI `Paper` default, so it could be dropped — a small correctness/simplification win that falls out
of reading the repeated code once.

**Where applied:** `src/components/ContentCard.tsx`, used by `src/pages/About.tsx`,
`src/pages/Impressum.tsx`, `src/pages/Datenschutz.tsx`.

### P2 — Repeated styling props → two opinionated primitives (Title + BodyText)

**Problem:** The same `sx` bundle appears on dozens of instances of a primitive (here:
`Typography variant="body1"` with `color: 'text.secondary'` + `lineHeight`). The style's *intent*
("a standard body paragraph") is invisible; it reads as noise.

**Before:**
```tsx
<Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
  {t('impressum.address')}
</Typography>
```

**After:** two opinionated primitives — one for titles, one for body text. Every heading and
paragraph is built from them, so the site speaks one typographic language.
```tsx
// components/typography/Title.tsx — brand heading: primary accent color + semibold
<Typography variant={variant} sx={{ fontWeight: 700, color: 'primary.main' }}>…

// components/typography/BodyText.tsx — body paragraph: secondary color, one consistent line height
<Typography variant={variant} sx={{ color: 'text.secondary', lineHeight: 1.7 }}>…
```
Call sites read as intent: `<Title variant="h5">…</Title>`, `<BodyText>…</BodyText>`.

**Spacing rule:** text components carry **no** spacing (`mb`/`lineHeight` per-instance). Vertical
rhythm lives on the wrapping `Stack spacing={…}` instead, so gaps are uniform and nothing is repeated.
A rare non-accented heading (e.g. the restaurant name in the Impressum) overrides via a `color` prop
rather than an sx block.

**Where applied:** `src/components/typography/{Title,BodyText}.tsx`, used by `src/pages/About.tsx`,
`src/pages/Impressum.tsx`, `src/pages/Datenschutz.tsx`.

**Watch out:** only extract what's actually identical. The About highlight-card emoji is *not* text —
it stays a raw `Typography` (an icon, not a heading). Forcing everything through the two primitives
would mislabel it.

### P3 — Fragile string tricks → the framework's utility

**Problem:** A color + opacity is faked by appending a hex suffix to a hex color:
`` `${primary}15` ``. It only works because the theme happens to return hex; a reader must know the
trick; and the same intent is expressed with raw magic numbers.

**Before:**
```tsx
boxShadow: `0 4px 20px ${theme.palette.primary.main}15`,
'&:hover': { boxShadow: `0 8px 30px ${theme.palette.primary.main}25` },
```

**After:**
```tsx
import { alpha } from '@mui/material/styles'
boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
'&:hover': { boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.15)}` },
```
Hex `15` ≈ 8% alpha, `25` ≈ 15% — same visuals, self-documenting, and robust if the theme ever
switches to `rgb()`.

**Where applied:** `src/pages/About.tsx` (highlight card shadows).

### P4 — Anonymous mapped data → typed shape + stable keys

**Problem:** A `map` over an inline object literal leaves the data's shape undocumented, and
`key={index}` forces React to guess identity.

**Before:**
```tsx
const highlights = [
  { icon: '🥡', title: t('about.buffet.title'), text: t('about.buffet.text') },
  // ...
]
{highlights.map((item, i) => <Grid key={i}>…</Grid>)}
```

**After:**
```tsx
interface Highlight { icon: string; title: string; text: string }
const highlights: Highlight[] = [ … ]
{highlights.map((item) => <Grid key={item.title}>…</Grid>)} // titles are unique
```

**Where applied:** `src/pages/About.tsx` (`Highlight`), `src/pages/Datenschutz.tsx` (`Section`).

### P5 — (next branch, documented here) Magic values + cryptic data → named constants

**Problem:** Meaningful numbers are inline arithmetic (`11 * 60 + 30`), and a data array like
`[false, true, true, true, true, true, true, true]` forces the reader to count columns to decode it.
This is the same *class* of problem as P1–P4, still pending in `src/components/OpeningHours.tsx`.

**Planned shape:**
```tsx
const SCHEDULE = { lunch: { start: '11:30', end: '14:30' }, dinner: { start: '17:30', end: '22:30' } }
const SAT = 5, SUN = 6
const onDays = (...days) => [false, false, false, false, false, true, true, true]  // illustrative
```
Not applied in this branch — it is the next, separate concern.

## Rules of thumb

- **Prefer the framework's own mechanism** for cross-cutting styles (theme, variants, components) over
  ad-hoc constants — it's documented and other devs already know it.
- **Extract exactly what is repeated**, no more. Over-inclusion changes behavior and over-abstraction
  hides the original code.
- **Don't rename public surface** (exports, routes, i18n keys, URLs) in a readability pass — that's a
  breaking change with its own review.
- **Don't touch data-fetching, state, or business logic** in a readability branch. If the logic itself
  is the problem, that's a different (riskier) branch.
- **Small PRs, one pattern each.** A 10-line diff that renames one concept is reviewable; a 300-line
  "cleanup" is not.
- **Use `noUnusedLocals`/typecheck as the safety net.** In this repo `npm run build` runs `tsc` first,
  so unused imports and type errors fail the build — let it catch what you missed.

## Anti-patterns

- ❌ **Rewrite instead of extract.** Tempting, but it loses the diff and invites new bugs.
- ❌ **Mix refactor with feature/bugfix work** in one commit. Untangle them first.
- ❌ **Premature generalization** — "what if we need this for X later". Extract for *now*; generalize when a second real use appears.
- ❌ **Silently changing visuals** to make code "simpler". The contract forbids it. If a change *must* alter rendering, call it out explicitly and get sign-off.
