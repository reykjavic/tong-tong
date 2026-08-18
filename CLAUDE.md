# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Website for China Restaurant Tong Tong (Braunfels, Germany): Vite + React + TypeScript + MUI, statically deployed to AWS S3 + CloudFront. Content is German-first with English i18n. `SPEC.md` has the full requirements, annotated with `[built]` / `[planned]` / `[changed]` status markers; `AGENTS.md` contains prior AI-agent conventions; `README.md` documents the current state. The color palette is documented in `theme.ts` (canonical source) and repeated in the README.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc typecheck + vite build (typecheck failures fail the build)
npm run preview   # serve the production build locally
```

There is no test suite and no lint script configured. Use `npx tsc --noEmit` for a standalone typecheck.

## Skills

Recurring workflows are packaged as composable skills under `.claude/skills/` (also mirrored to `~/.claude/skills/` for use in other projects):

- **add-page** — add a new page/route across all six sync surfaces (App.tsx, page, locales, PageMeta, soft-404 fn, sitemap).
- **i18n-add-strings** — add/change user-visible text in both `de.json` and `en.json`.
- **add-post** — publish a Decap CMS news post (`content/posts/`).
- **verify-app** — build + route-sync check + both-languages eyeball; runs `scripts/check-route-sync.sh`.
- **refactor-readability** — zero-behavior-change readability refactors (patterns P1–P5).
- **github-cli** — GitHub operations via `gh` (PRs, CI runs, API).
- **aws-cli** — S3 / CloudFront operations via `aws` (deploys, invalidations, infra scripts).

## Agents

Specialized subagents live under `.claude/agents/` (delegation layer — Claude Code picks one when the task fits its `description`; also @-mentionable):

- **code-reviewer** — reviews diffs/PRs against this repo's conventions (i18n mirror, MUI, 6 sync surfaces, P1–P5); read-only.
- **security-reviewer** — audits code + the AWS/CI surface (OAuth Lambda, soft-404 fn, SAM backend, secrets hygiene); read-only.
- **db-specialist** — DynamoDB single-table schema + access patterns for the SAM backend (`SCOPE.md` §6 on `dev`).
- **test-writer** — tests for the frontend (Vitest if introduced) and the SAM lambdas (`node:test`, zero-dep style).

## Architecture

- **Entry flow:** `src/main.tsx` → `src/App.tsx`, which wraps everything in `ThemeProvider` (MUI) + `I18nProvider`, then renders `Navbar`, a `Switch` of Wouter routes (wrapped in `Suspense`), and `Footer`. All routes and their components are registered in `App.tsx`; route components are `React.lazy` and code-split into per-page chunks.
- **Routing:** Wouter (`<Route path="/" component={...}>` / `<Link href="/...">`). Routes: `/`, `/about`, `/menu`, `/contact`, `/hours`, `/posts`, `/impressum`, `/datenschutz`, plus a catch-all 404 route (matches any unmatched path). All pages are fully built. App.tsx uses route-level `React.lazy` + `Suspense` (code splitting — each page is its own chunk), and a shared `PageLayout` component provides the common `main > Container > Paper` shell.
- **i18n (`src/i18n.tsx`):** Custom React-context implementation, not a library. `useI18n()` returns `{ language, t, toggleLanguage, setLanguage }`. `t('nav.home')` resolves dot-notation keys against `src/locales/de.json` / `en.json` (via `getNestedValue`); missing keys fall back to the key string. Preference persists in `localStorage` under key `tt-lang`; initial value comes from browser locale. **All user-visible text must go through `t()`** — see the **i18n-add-strings** skill for adding/editing strings in both locale files. (Remaining hardcoded German: some `aria-label`s in `Navbar.tsx`; the `Tong Tong` / `冬冬饭店` brand mark is intentional; `public/404.html` is static.)
- **Theme (`src/theme.ts`):** MUI `createTheme`. **Color palette:** primary deep teal `#00695C` (dark `#004D40`), secondary burgundy `#7B1F2B` (dark `#4A1018`), background `#FAFAFA`. `theme.ts` is the canonical source (older docs once claimed turquoise `#00A896`; that's been corrected). The navbar brand box is intentionally neon green `#39FF14` with red text. `HomePage.tsx` also uses hardcoded gradients of these colors.
- **Layout conventions:** MUI components + `sx` prop (or 
`styled`); responsive `{ xs, sm }` values; two shared layout wrappers: `PageLayout` (`src/components/layout/PageLayout.tsx`) provides the app-wide `main > Container maxWidth="lg" > Paper` shell — it owns the single max-width gutter, so pages/embeddings add their own vertical padding (`py`) but not horizontal gutters. `PageContainer` (`src/components/layout/PageContainer.tsx`) is the per-page wrapper: vertical padding (`PAGE_VERTICAL_PADDING`) + a screen-reader-only `<h1>`, no Container. Full-bleed sections (e.g. the home hero) escape the gutter via `width: 100vw` + `marginLeft: calc(50% - 50vw)`. Mobile-first via `useMediaQuery(theme.breakpoints.down('sm'))`.
- **Component structure:** `src/components/` is split into `layout/` (page chrome: Navbar, Footer, PageLayout, PageContainer), `ui/` (dumb presentational primitives: ContentCard, ScreenReaderPageTitle, typography), and `features/` (product-specific units: OpeningHours, PageMeta, Markdown). A `ui/` component has no hooks or logic — it renders children with a style.
- **Path alias:** `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`).
- **Home page (`src/pages/HomePage.tsx`):** Swiper carousel hero with CTA buttons, a latest-news card (fetched from GitHub), and the shared `OpeningHours` section (weekday columns × time rows for Öffnungszeiten / Mittagstisch / buffet) with a live open/closed chip (client-side check: closed Mondays, lunch 11:30–14:30, dinner 17:30–22:30) and a reservation note. `src/pages/Hours.tsx` is a dedicated opening-hours page.

## Backend (serverless WhatsApp ordering system)

`SCOPE.md` is the canonical scope for the serverless ordering + kitchen system being built around the site; `backend/README.md` is the Milestone 0 runbook. Product model (v1): **customer orders on the website** (items + email-or-WhatsApp contact + pay-at-pickup) → order stored in DynamoDB (`Pending → Notified → Completed`) → **kitchen dashboard** lists open orders with timeframe buttons (15/20/30/45) that notify the customer on the channel they chose, and shows who has/hasn't been notified. Notifications go via **WhatsApp (Meta Messages API) or email (SES)**. No customer login/payment in v1. Current state: **Milestone 0** (WhatsApp webhook + auto-reply) — an **AWS SAM** app (`backend/template.yaml`), chosen because the backend will grow to several Lambdas (webhook, orders, staff, later auth). Conventions for backend work:

- Lambdas are single self-contained `backend/lambdas/<name>/index.mjs` files — zero npm dependencies, ESM, Node 18+ global `fetch`, same style as `decap-oauth/index.mjs`.
- Every function and its API Gateway routes live in `backend/template.yaml` (SAM). Deploy via `scripts/deploy-backend.sh` (`sam build` + `sam deploy`; requires the SAM CLI).
- Secrets never go in the repo. They live in gitignored `backend/.env.whatsapp` (template: `backend/.env.whatsapp.example`) and are injected as `NoEcho` CloudFormation parameters. `META_ACCESS_TOKEN`, `PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `APP_SECRET` are required for the webhook.
- Meta webhook POSTs must be verified via `X-Hub-Signature-256` HMAC before processing.
- **We only message customers inside the 24h WhatsApp conversation window their inbound message opened. No template messages, no proactive/out-of-window sends — deliberate product decision.**
- Orders are **public** (no login); staff routes need a token. Notify idempotency: set `NotifiedAt` only after the send succeeds.

## Conventions & constraints

- MUI is mandatory for all UI — no Tailwind, Bootstrap, or hand-rolled CSS. Emotion is the CSS-in-JS engine.
- Wouter for routing — never Next.js.
- German (`de`) is the default language; `en` is a full mirror.
- Impressum and Datenschutz pages are legally required for this German business site.
- **Branch workflow:** feature work happens on `dev` and is pushed there; **never merge to `main` unless the user explicitly asks** (merging to `main` triggers the production deploy).
- Keep `src/` flat at the top level: `src/pages/`, `src/locales/`, `src/hooks/` (custom hooks / data-access modules, e.g. `src/hooks/posts.ts`), and single files at the `src/` root (user preference). The exception is `src/components/`, which is organized into `layout/`, `ui/`, and `features/` subfolders (see "Component structure" above).

## Decap CMS (implemented)

Decap CMS manages news posts as Markdown in `content/posts/`, edited via `public/admin/`. Posts are fetched at runtime from GitHub (Contents API + `raw.githubusercontent.com`), rendered by `src/hooks/posts.ts`, and shown on the homepage (latest post) and `/posts`. The `decap-oauth` Lambda (in `decap-oauth/`) handles the GitHub OAuth handshake — see `TODO.md` for the pending security hardening before/after the `tong-tong.eu` domain cutover.

## Deployment

GitHub Actions workflow `.github/workflows/deploy.yml` deploys on push/merge to `main`: `npm ci` → `npm run build` → `aws s3 sync dist/ s3://tong-tong-homepage --delete` (region `eu-central-1`) → CloudFront invalidation. The live site is served over HTTPS via CloudFront in front of the S3 bucket. A viewer-request CloudFront Function (`scripts/cloudfront-soft-404-function.js`) serves `index.html` **only** for the real SPA routes (so deep links like `/menu` work); the distribution's 403/404 error responses serve `public/404.html` with a real HTTP 404, so unknown URLs are genuine 404s, not soft 404s. Adding a page touches six surfaces that must stay in sync — see the **add-page** skill (which closes with the **verify-app** route-sync check). See `TODO.md` for the pending `tong-tong.eu` domain cutover, staging env, and Decap CMS OAuth hardening.

`scripts/tmux-work.sh` / `.bat` is a dev helper that launches a 2×2 tmux grid of Claude Code sessions against this repo — not part of the app.
