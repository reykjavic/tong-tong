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
│   ├── App.tsx                # Wouter routes + MUI ThemeProvider
│   ├── theme.ts               # MUI theme configuration
│   ├── i18n.tsx               # Language detection + context
│   ├── locales/               # Translation JSON files (de.json, en.json)
│   ├── pages/                 # Route components (HomePage.tsx, About.tsx, etc.)
│   │   ├── HomePage.tsx       # Home page component
│   │   ├── Buffet.tsx         # Buffet page
│   │   ├── Contact.tsx        # Contact page
│   │   ├── Datenschutz.tsx    # Privacy policy page
│   │   ├── Impressum.tsx      # Impression page (legally required in Germany)
│   │   ├── Menu.tsx           # Menu page
│   │   └── Posts.tsx          # Blog posts page
│   └── components/            # Reusable MUI components
│       ├── Navbar.tsx         # Navigation bar
│       └── Footer.tsx         # Footer component
├── public/
│   └── admin/                 # Decap CMS admin files
└── content/
    └── posts/                 # Markdown posts managed by Decap CMS
```

## Coding Standards
- **TypeScript** preferred over JavaScript
- **Wouter** for routing — hooks-based API (`useRoute`, `useLocation`) or `<Route>` components
- **MUI sx prop** for inline styles, `styled` for complex reusable styles
- **Emotion** for CSS-in-JS (MUI default)
- **Markdown** for content files (posts via Decap CMS)

## What to Avoid
- No Bootstrap, Tailwind, or plain CSS for styling — use MUI
- No Next.js — this is a Vite project, not a Next.js project
- No external UI libraries beyond what SPEC.md specifies
- All UI text must use translation files — never hardcode German or English strings directly in components

## Internationalization (i18n)
- **Default language:** German (`de`)
- **Supported languages:** German (`de`), English (`en`)
- **Auto-detection:** Detect user's language via browser locale (`navigator.language`) and IP geolocation
- **IP-based detection:** If IP is from Germany → default to German; otherwise → default to English
- **Language toggle:** User can always switch between DE and EN, with preference saved in localStorage
- Translation files stored in `/src/locales/de.json` and `/src/locales/en.json`

## Common Tasks Quick Reference
- **New page**: Create a component in `src/pages/` (e.g., `Contact.tsx`) + add Wouter route in `App.tsx`
- **New component**: Create in `src/components/` and import with MUI components
- **Theme change**: Edit `src/theme.ts`
- **New translation**: Add to both `/src/locales/de.json` and `/src/locales/en.json`
- **New post content**: Update `public/admin/config.yml` for Decap CMS