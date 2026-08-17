# Patterns catalog

Each pattern: problem → before → after → where applied. Load this when the `refactor-readability` skill is active and you've matched a problem to a pattern. Examples are from this repo; the patterns are generic.

## P1 — Repeated wrapper / sx object → shared component

**Problem:** The same wrapper markup + `sx` is copy-pasted character-for-character into several places. Changing the style once means editing every copy; a reader can't tell if copies have drifted.

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
Note the extraction also revealed a redundancy: `bgcolor: theme.palette.background.paper` is the MUI `Paper` default, so it could be dropped — a small correctness/simplification win that falls out of reading the repeated code once.

**Where applied:** `src/components/ContentCard.tsx`, used by `src/pages/About.tsx`, `src/pages/Impressum.tsx`, `src/pages/Datenschutz.tsx`.

## P2 — Repeated styling props → two opinionated primitives (Title + BodyText)

**Problem:** The same `sx` bundle appears on dozens of instances of a primitive (here: `Typography variant="body1"` with `color: 'text.secondary'` + `lineHeight`). The style's *intent* ("a standard body paragraph") is invisible; it reads as noise.

**Before:**
```tsx
<Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
  {t('impressum.address')}
</Typography>
```

**After:** two opinionated primitives — one for titles, one for body text. Every heading and paragraph is built from them, so the site speaks one typographic language.
```tsx
// components/typography/Title.tsx — brand heading: primary accent color + semibold
<Typography variant={variant} sx={{ fontWeight: 700, color: 'primary.main' }}>…

// components/typography/BodyText.tsx — body paragraph: secondary color, one consistent line height
<Typography variant={variant} sx={{ color: 'text.secondary', lineHeight: 1.7 }}>…
```
Call sites read as intent: `<Title variant="h5">…</Title>`, `<BodyText>…</BodyText>`.

**Spacing rule:** text components carry **no** spacing (`mb`/`lineHeight` per-instance). Vertical rhythm lives on the wrapping `Stack spacing={…}` instead, so gaps are uniform and nothing is repeated. A rare non-accented heading (e.g. the restaurant name in the Impressum) overrides via a `color` prop rather than an sx block.

**Where applied:** `src/components/typography/{Title,BodyText}.tsx`, used by `src/pages/About.tsx`, `src/pages/Impressum.tsx`, `src/pages/Datenschutz.tsx`.

**Watch out:** only extract what's actually identical. The About highlight-card emoji is *not* text — it stays a raw `Typography` (an icon, not a heading). Forcing everything through the two primitives would mislabel it.

## P3 — Fragile string tricks → the framework's utility

**Problem:** A color + opacity is faked by appending a hex suffix to a hex color: `` `${primary}15` ``. It only works because the theme happens to return hex; a reader must know the trick; and the same intent is expressed with raw magic numbers.

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
Hex `15` ≈ 8% alpha, `25` ≈ 15% — same visuals, self-documenting, and robust if the theme ever switches to `rgb()`.

**Where applied:** `src/pages/About.tsx` (highlight card shadows).

## P4 — Anonymous mapped data → typed shape + stable keys

**Problem:** A `map` over an inline object literal leaves the data's shape undocumented, and `key={index}` forces React to guess identity.

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

## P5 — (next branch, documented here) Magic values + cryptic data → named constants

**Problem:** Meaningful numbers are inline arithmetic (`11 * 60 + 30`), and a data array like `[false, true, true, true, true, true, true, true]` forces the reader to count columns to decode it. This is the same *class* of problem as P1–P4, still pending in `src/components/OpeningHours.tsx`.

**Planned shape:**
```tsx
const SCHEDULE = { lunch: { start: '11:30', end: '14:30' }, dinner: { start: '17:30', end: '22:30' } }
const SAT = 5, SUN = 6
const onDays = (...days) => [false, false, false, false, false, true, true, true]  // illustrative
```
Not applied — it is the next, separate concern.
