---
name: verify-app
description: Use when the user wants to check that the app works, prove a change is good, or verify the build — "does it build", "check it works", "is everything in sync", "verify the deploy", "did the typecheck pass". Also the closing step of the add-page skill. This repo has no test suite, so this checklist IS the verification story.
---

# Verifying the app works

This repo has **no test suite**. Verification = build + route sync + an eyeball pass. Run all three in order.

## 1. Build (typecheck + bundle)

```bash
npm run build        # runs `tsc` first — type errors and unused imports fail the build
```

Must exit 0. For a standalone typecheck without the full Vite build:

```bash
npx tsc --noEmit
```

## 2. Route-sync check

The site's routes are mirrored in four files that must agree (`App.tsx`, `PageMeta.tsx`'s `ROUTE_META`, the CloudFront soft-404 function's `SPA_ROUTES`, and `sitemap.xml`). Run the checker:

```bash
.claude/skills/verify-app/scripts/check-route-sync.sh
```

- Exit 0 → in sync.
- Exit 1 → drift listed; fix the surfaces it names (add missing routes, remove extras), then re-run.
- Exit 2 → the script's extraction patterns no longer match the source; update the script.

## 3. Eyeball pass

Run `npm run dev` (or `npm run preview` against a production build) and check:

- The **affected screens** at desktop *and* mobile width (mobile-first via `useMediaQuery(theme.breakpoints.down('sm'))`).
- **Both languages** — toggle `de`/`en` and confirm no raw key strings (`t('…')` fallback text) render.
- The route works when deep-linked (type the URL directly), not just via in-app links.

## Gotchas

- The build failing on an unused import is *correct behavior* — `tsconfig.json` sets `noUnusedLocals`/`noUnusedParameters`; remove the import rather than suppressing it.
- A passing build does **not** prove the deploy is live — content changes (posts) are fetched at runtime from GitHub and never need a rebuild; S3/CloudFront deploys run via GitHub Actions (`main` → prod, `dev` → staging) and CloudFront invalidation takes minutes to propagate. See the **aws-cli** and **github-cli** skills for those checks.
- The route-sync checker reads the four files *as they are in the working tree* — if you just changed `App.tsx`, the others must be updated too, not just this one.

**Reason:** the build catches type/import errors, the route-sync check catches the SPA deep-link/CDN/sitemap drift that's the site's most common silent failure, and the eyeball pass catches i18n fallback bugs no compiler will ever see.
