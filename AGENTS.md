# AGENTS.md - AI Agent Instructions for tong-tong

## Project Context
This is a new project for **China Restaurant Tong Tong** in Braunfels, Germany. The goal is to build a modern website using Vite + React + MUI (Material UI) with Decap CMS for content management. See [SPEC.md](./SPEC.md) for full requirements.

## Deployment
- **Target:** AWS S3 (static hosting) — minimal cost, zero server infrastructure
- **Build output:** `vite build` produces static files (dist/ folder) ready for S3 upload

## General Instructions
1. **Read the SPEC first** - Always reference `SPEC.md` for project requirements before making decisions.
2. **MUI is mandatory** - All UI components must use Material UI (MUI v5/v6). Do not suggest custom CSS solutions when MUI equivalents exist.
3. **Deep teal + burgundy theme** - The primary color is `#00695C` (deep teal), secondary `#7B1F2B` (burgundy). Use them consistently across all components. See `src/theme.ts` for the canonical palette.
4. **Mobile-first approach** - All designs must be responsive. Default to mobile views.
5. **German legal requirements** - This is a German business website. Impressum and Datenschutz (privacy) are legally required.

## File Structure Conventions
> **Note:** User has requested a flat src/ directory structure for all subsequent development.
```
/
├── SPEC.md                    # Project requirements
├── AGENTS.md                  # This file - AI agent instructions
├── index.html                 # Vite entry HTML
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript config
├── src/
│   ├── main.tsx               # App entry point
│   ├── App.tsx                # Wouter routes (React.lazy + Suspense) + MUI ThemeProvider
│   ├── theme.ts               # MUI theme configuration
│   ├── i18n.tsx               # Language detection + context
│   ├── layout.ts              # Shared layout constants (PAGE_VERTICAL_PADDING)
│   ├── posts.ts               # Post fetching/parsing (GitHub Contents API + frontmatter)
│   ├── locales/               # Translation JSON files (de.json, en.json)
│   ├── pages/                 # Route components (HomePage.tsx, About.tsx, etc.)
│   │   ├── HomePage.tsx       # Home page component
│   │   ├── About.tsx          # About page
│   │   ├── Contact.tsx        # Contact page
│   │   ├── Datenschutz.tsx    # Privacy policy page
│   │   ├── Impressum.tsx      # Impression page (legally required in Germany)
│   │   ├── Menu.tsx           # Menu page (PDF viewer)
│   │   ├── Hours.tsx          # Opening hours page
│   │   ├── Posts.tsx          # Blog posts page
│   │   └── NotFound.tsx       # 404 catch-all route
│   └── components/            # Reusable MUI components
│       ├── Navbar.tsx         # Navigation bar
│       ├── Footer.tsx         # Footer component
│       ├── PageLayout.tsx     # Shared page shell (main > Container > Paper)
│       ├── PageMeta.tsx       # Per-route <title> + meta description
│       ├── OpeningHours.tsx   # Opening hours section (reused on home + /hours)
│       ├── VisuallyHiddenH1.tsx # Accessible h1 that's visually hidden
│       └── Markdown.tsx       # Markdown renderer for post bodies
├── public/
│   ├── admin/                 # Decap CMS admin files (index.html + config.yml)
│   ├── images/                # Static images
│   └── tong-tong-2026.pdf     # Menu PDF
└── content/
    └── posts/                 # Markdown posts managed by Decap CMS
```

## Coding Standards
- **TypeScript** preferred over JavaScript
- **Wouter** for routing — hooks-based API (`useRoute`, `useLocation`) or `<Route>` components
- **MUI sx prop** for inline styles, `styled` for complex reusable styles
- **Emotion** for CSS-in-JS (MUI default)
- **Markdown** for content files (posts via Decap CMS)
- **Navigation:** It is *intentional* that not every route appears in the navbar. The navbar links only `/`, `/about`, `/menu`, `/contact`; routes like `/hours`, `/posts`, `/impressum`, `/datenschutz` are reachable via deep links/CTAs instead. Don't add routes to the navbar unless the owner explicitly asks.

## What to Avoid
- No Bootstrap, Tailwind, or plain CSS for styling — use MUI
- No Next.js — this is a Vite project, not a Next.js project
- No external UI libraries beyond what SPEC.md specifies
- All UI text must use translation files — never hardcode German or English strings directly in components

## Internationalization (i18n)
- **Default language:** German (`de`)
- **Supported languages:** German (`de`), English (`en`)
- **Auto-detection:** Initial language from browser locale (`navigator.language`) only — no IP geolocation
- **Language toggle:** User can always switch between DE and EN, with preference saved in localStorage under `tt-lang`
- Translation files stored in `/src/locales/de.json` and `/src/locales/en.json`

## Common Tasks Quick Reference
- **New page**: Create a component in `src/pages/` (e.g., `Contact.tsx`) + add a `React.lazy` import and Wouter `<Route>` in `App.tsx` (before the catch-all 404 route)
- **New component**: Create in `src/components/` and import with MUI components
- **Theme change**: Edit `src/theme.ts`
- **New translation**: Add to both `/src/locales/de.json` and `/src/locales/en.json`
- **New post content**: Update `public/admin/config.yml` for Decap CMS