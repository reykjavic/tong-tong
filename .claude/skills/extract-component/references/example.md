# Worked example: extracting `NavbarButton`

Context: `src/components/layout/navbar/Navbar.tsx` renders the desktop nav links:

```tsx
{visibleLinks.map((link) => (
  <Button
    key={link.href}
    component={Link}
    href={link.href}
    color="inherit"
    sx={{
      fontFamily: 'Libre Franklin, sans-serif',
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.95rem',
      '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
      '&[data-wouter-link-active]': {
        borderBottom: '2px solid white',
        fontWeight: 700,
      },
    }}
  >
    {t(link.key)}
  </Button>
))}
```

## Inputs analysis (step 1 of the workflow)

| Free variable | Kind | Where it goes |
|---|---|---|
| `link` | `.map()` item | **Real prop** |
| `Link` | wouter import | **Inside the component** (import) |
| `t` | `useI18n()` hook value | **Inside the component** (via the hook) |

## What Glean produced (broken)

```tsx
import React from "react";
export function NavbarButton({ Link, t }) {
  return <Button key={link.href} component={Link} href={link.href} color="inherit" sx={{ /* … */ }}>
    {t(link.key)}
  </Button>;
}
```

Failure modes, exactly as predicted by the SKILL.md gotchas:

- `link` is used but **never received** (loop variable dropped) → `Cannot find name 'link'`.
- `Button` is **not imported** → `Cannot find name 'Button'`.
- `import React` is unused (new JSX transform).
- Call site was rewritten to `<NavbarButton Link={Link} t={t} />` — missing both `link` and `key`.

## Correct typed result

```tsx
// src/components/layout/navbar/NavbarButton.tsx
import { Button } from '@mui/material'
import { Link } from 'wouter'
import { useI18n } from '../../../i18n'

export interface NavbarLink {
  href: string
  key: string
}

interface NavbarButtonProps {
  link: NavbarLink
}

export default function NavbarButton({ link }: NavbarButtonProps) {
  const { t } = useI18n()

  return (
    <Button
      component={Link}
      href={link.href}
      color="inherit"
      sx={{
        fontFamily: 'Libre Franklin, sans-serif',
        fontWeight: 600,
        textTransform: 'none',
        fontSize: '0.95rem',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
        '&[data-wouter-link-active]': {
          borderBottom: '2px solid white',
          fontWeight: 700,
        },
      }}
    >
      {t(link.key)}
    </Button>
  )
}
```

Call site (import + swap, `key` stays here):

```tsx
import NavbarButton, { type NavbarLink } from './NavbarButton'

const links: NavbarLink[] = [
  { href: '/', key: 'nav.home' },
  /* … */
]

// …
{visibleLinks.map((link) => (
  <NavbarButton key={link.href} link={link} />
))}
```

Barrel (`src/components/layout/navbar/index.ts`):

```ts
export { default as NavbarButton } from './NavbarButton'
```

Optional bonus: since the parent also consumes the shape, importing the exported `NavbarLink` type and annotating the parent's data (`const links: NavbarLink[]`) keeps both sides in sync.
