---
name: add-page
description: Use when the user wants to add a new page, route, or view to the site — "add a /angebote page", "I need a new route for …", "create a page about …". Adding a page in this repo means keeping SIX surfaces in sync; follow this checklist and finish with the verify-app skill.
---

# Adding a new page / route

A new page is **not one file**. Six surfaces must be updated together, or the route will work in dev but break in production (deep link 404), render without meta, or be missing from the sitemap.

For exact snippets of each surface, see `references/route-surfaces.md`.

## The 6 surfaces, in order

1. **`src/App.tsx`** — register the lazy-loaded route.
2. **`src/pages/X.tsx`** — the new page component.
3. **`src/locales/de.json` + `src/locales/en.json`** — the page's `t()` keys. This is exactly what the **i18n-add-strings** skill covers — use it.
4. **`src/components/features/PageMeta.tsx`** — a `ROUTE_META` entry (page `<title>` + meta description).
5. **`scripts/cloudfront-soft-404-function.js`** — add the path to `SPA_ROUTES`.
6. **`public/sitemap.xml`** — add a `<url>` entry.

## Rules that apply to every new page

- The catch-all 404 `<Route component={NotFound} />` in `App.tsx` **must stay last** in the `Switch`; insert the new route before it.
- Wrap the page in `<PageContainer title={t('x.title')}>` (per-page vertical padding + a screen-reader-only `<h1>`). `PageLayout` already owns the `maxWidth="lg"` gutter — do **not** add another `Container`.
- Static-content pages use the `<ContentCard>` + `<Title>` / `<BodyText>` primitives (see `src/pages/About.tsx` as the reference page).
- The `ROUTE_META` key must **exactly match** the `path` prop (e.g. `'/x'`).
- The soft-404 `SPA_ROUTES` array holds **bare paths** with no trailing slash (`'/x'`, not `'/x/'`); the function handles trailing-slash variants itself.
- Do **not** add a navbar link unless the owner explicitly asks. Only `/`, `/about`, `/menu`, `/contact` are nav links by design; `/hours`, `/posts`, `/impressum`, `/datenschutz` are reachable via deep links and CTAs only.

## Finish

Run the **verify-app** skill to prove the route lists are in sync (it runs `scripts/check-route-sync.sh`) and the build passes.

## Gotchas

- **The deep-link 404 trap:** skipping surface #5 means the page works in `npm run dev` but returns a hard HTTP 404 in production — CloudFront serves `index.html` only for paths on the allowlist. Always add the route to `SPA_ROUTES`.
- The CloudFront Function runs a **restricted ES5 runtime** — the array uses `var`, no arrow functions, no template literals. Keep that style.
- A missing `ROUTE_META` entry falls back to `meta.notFound` — the page renders but gets the 404 title/description in the browser tab and search results.
- Missing i18n keys render the raw key string (see the **i18n-add-strings** skill) — both locale files must be updated in the same pass.

**Reason:** the six surfaces are the seams where the SPA shell (App.tsx), SEO (PageMeta), the CDN routing (soft-404 function), and search engines (sitemap) each independently learn about a page — forget one and that consumer silently goes stale.
