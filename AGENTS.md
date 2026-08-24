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
> **Note:** The `src/` top level stays flat (single files at the `src/` root, `src/pages/`, `src/locales/`). The exception is `src/components/`, organized into `layout/`, `ui/`, and `features/` subfolders (see classification rule below).
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
│   ├── hooks/                 # Custom hooks / data-access modules
│   │   └── posts.ts           #   Post fetching/parsing (GitHub Contents API + frontmatter)
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
│       ├── layout/            # Page chrome & structure (where things go)
│       │   ├── navbar/        #   Navigation bar (index barrel + subcomponents)
│       │   ├── Footer.tsx     #   Footer component
│       │   ├── PageLayout.tsx #   App-wide shell (main > Container > Paper)
│       │   └── PageContainer.tsx # Per-page wrapper: vertical padding + sr-only <h1>
│       ├── ui/                # Dumb presentational primitives (no hooks/logic)
│       │   ├── ContentCard.tsx#   Shared static-content Paper wrapper
│       │   ├── ScreenReaderPageTitle.tsx # sr-only <h1> for the page title
│       │   └── typography/    #   Text system: Title + BodyText primitives
│       │       ├── Title.tsx  #     Brand heading (primary color, 700 weight)
│       │       ├── BodyText.tsx #   Body paragraph (secondary color, lineHeight 1.7)
│       │       └── index.ts   #     Barrel export
│       └── features/          # Product-specific, self-contained units
│           ├── PageMeta.tsx   #   Per-route <title> + meta description
│           ├── OpeningHours.tsx # Opening hours section (reused on home + /hours)
│           └── Markdown.tsx   #   Markdown renderer for post bodies
├── public/
│   ├── admin/                 # Decap CMS admin files (index.html + config.yml)
│   ├── images/                # Static images
│   └── tong-tong-2026.pdf     # Menu PDF
└── content/
    └── posts/                 # Markdown posts managed by Decap CMS
```

**Where a new component goes** (decide in this order):
1. **Knows about the product** (restaurant, opening hours, posts, routes) → `components/features/`
2. **Defines page structure/chrome** (navbar, footer, the page shell) → `components/layout/`
3. Otherwise, a **dumb presentational primitive** (pure props → markup, no hooks/data) → `components/ui/`

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

## Key Architectural Decisions & Standards
Decisions reached with the owner (2026-08) — do not silently re-litigate.

### Opening hours: Google Business is the single source of truth
- The site **never keeps a hardcoded copy of the opening schedule**. Everything derives from the Google Business Profile via the Places API (New):
  - `backend/lambdas/hours` → `GET /hours` → cached in DynamoDB (`PK="hours"`, `SK="effective"`, `HOURS_CACHE_TTL_SECONDS` default 24h) → **~1 Google call/day**, independent of visitor count.
  - Weekly table (homepage) ← `regularOpeningHours`, via `weekRowsFromRegularHours` + `buildOpeningRows` in `src/hooks/hours.ts`.
  - Live chip + order-polling gate ← `currentOpeningHours` + `businessStatus`, via `isEffectivelyOpen` (same function).
- **Places API quirks** (do not re-learn the hard way): `periods[].day` is **0 = Sunday** (same as `Date.getDay()`); `weekdayDescriptions` is **Mon-first** (never parse it positionally); `currentOpeningHours` is the special/vacation-adjusted next-7-days view whose periods carry explicit `date` objects — **there is no `specialOpeningHours` field**; the `periods` array is **not chronologically ordered** (key off `date`, never array position).
- The hardcoded `HOURS_SCHEDULE` in `src/hooks/hours.ts` is only the **fail-open fallback** while `/hours` is unavailable.
- The homepage table's merchandising rows (Mittagstisch, buffet) keep static day rules — Google can't express them — and the buffet-evening time (18:00–22:00) is the only static time; everything else derives.

### Order lifecycle & dashboard
- Order status: `Pending → Notified → Completed` (SCOPE §6). The dashboard lists open orders (Pending + Notified); **Completed orders drop out of the list** (owner's choice).
- Order auto-refresh: **TanStack Query** `refetchInterval` 15s on `GET /staff/orders`, enabled **only while the restaurant is open** (`isEffectivelyOpen`); interval refetches pause in background tabs by default and refetch-on-window-focus catches up on return; the manual refresh button always works. "Polling has a pattern or a limit" — no unbounded/24-7 polling, no websocket/stream planned.

### Deployment reality (frontend ≠ backend)
- Frontend: push to `dev` → GitHub Actions deploys the SPA to staging. Backend: `./scripts/deploy-backend.sh` (sam build + deploy) — **separate, manual, and required for any Lambda/template change**. A feature touching both needs both.

### Engineering standards (project-wide)
- **Data layer:** server state via **TanStack Query** (`useQuery`/`useMutation`; `refetchInterval` for the 15s order poll; structural sharing keeps unchanged responses from re-rendering); client state via **Zustand** (auth session in `auth.ts`; the future shopping cart). **Every request lives in `src/hooks/api.ts`** — base URLs, query keys, the `apiFetch` transport, all endpoints (config, hours, orders, toggle, auth, GitHub posts) and the hooks; pure non-request logic stays in its module (hours mapping, post parsing). The old `useSyncExternalStore` module stores are retired.
- **Fail-open defaults:** when upstream data is unavailable the UI shows its fallback (default schedule), never a wrong "closed" or an empty table; the server side may fail closed (e.g. orders 403 when the ordering toggle is off).
- **Cache at the right layer:** browser traffic must never multiply upstream calls (24h DynamoDB cache; the client fetches `/hours` on load + when the tab becomes visible, no timers).
- **Render-from-data = auto-update:** don't build checksum/change-detection machinery for data that is re-rendered fresh from the source on every load.
- **Mapping seam:** keep raw-API-data → site-markup mapping in pure functions (`buildOpeningRows`); static values only where the source cannot express them.
- **Secrets:** gitignored `backend/.env.*` files → NoEcho CloudFormation params via the deploy script. `backend/.env.places` = Places API key (enable **"Places API (New)"** AND add it to the key's API restrictions — the legacy "Places API" is not enough).
- **CloudFormation gotcha:** changing a template parameter default does NOT update an existing stack — pass explicit `--parameter-overrides` (the deploy script does this for `HoursCacheTtlSeconds`).