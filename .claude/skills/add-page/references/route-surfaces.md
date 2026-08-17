# The six route surfaces — exact patterns

Load this reference when the `add-page` skill is active and you're touching one of the six surfaces. All snippets are copied from the current code.

## 1. `src/App.tsx` — route registration

Add a lazy import alongside the existing ones, then a `<Route>` **before** the catch-all:

```tsx
const Angebote = lazy(() => import('./pages/Angebote'))   // top of file, with the other lazy imports

// inside <Switch>, BEFORE the catch-all:
<Route path="/angebote" component={Angebote} />
{/* Catch-all: renders for any unmatched path. Must stay last. */}
<Route component={NotFound} />
```

## 2. `src/pages/X.tsx` — the page component

Reference page: `src/pages/About.tsx`. Minimal static-content shape (imports are **relative**, no `@/` alias used in pages):

```tsx
import { useI18n } from '../i18n'
import ContentCard from '../components/ui/ContentCard'
import PageContainer from '../components/layout/PageContainer'
import { Title, BodyText } from '../components/ui/typography'
import { Stack } from '@mui/material'

export default function Angebote() {
  const { t } = useI18n()
  return (
    <PageContainer title={t('angebote.title')}>
      <ContentCard>
        <Stack spacing={2}>
          <Title variant="h5">{t('angebote.greeting')}</Title>
          <BodyText>{t('angebote.intro')}</BodyText>
        </Stack>
      </ContentCard>
    </PageContainer>
  )
}
```

- `PageContainer` (`src/components/layout/PageContainer.tsx`) renders the vertical padding (`PAGE_VERTICAL_PADDING`) + a sr-only `<h1>`.
- `PageLayout` (`src/components/layout/PageLayout.tsx`) owns the single `maxWidth="lg"` gutter — pages never add their own `Container`.
- Full-bleed sections escape the gutter via `width: 100vw` + `marginLeft: calc(50% - 50vw)`.

## 3. `src/locales/de.json` + `en.json` — copy keys

Namespaces in use: `nav`, `meta`, `home`, `posts`, `about`, `menu`, `notFound`, `contact`, `impressum`, `datenschutz`, `common`. Add the page content under its own namespace and the SEO keys under `meta`:

```json
// de.json
"angebote": { "title": "Angebote", "greeting": "…", "intro": "…" },
"meta": { …,
  "angebote": { "title": "Angebote | Restaurant Tong Tong", "description": "…" }
}

// en.json — same structure, English copy
"angebote": { "title": "Offers", "greeting": "…", "intro": "…" },
```

Follow the **i18n-add-strings** skill for the full rules (both files, dot-notation, silent-key-fallback gotcha).

## 4. `src/components/features/PageMeta.tsx` — SEO entry

```tsx
const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'meta.home.title', description: 'meta.home.description' },
  // …
  '/angebote': { title: 'meta.angebote.title', description: 'meta.angebote.description' },
  // Fallback for unknown locations (rendered by the 404 route in App.tsx).
  notFound: { title: 'meta.notFound.title', description: 'meta.notFound.description' },
}
```

The key is the `path` string exactly as in `App.tsx`. The values are i18n keys (the strings live in the locale files under `meta.<route>.title` / `.description`).

## 5. `scripts/cloudfront-soft-404-function.js` — CDN allowlist

**ES5 only** — `var`, no arrows, no template literals:

```js
var SPA_ROUTES = [
  '/',
  '/about',
  // …
  '/angebote',
];
```

The function strips one trailing slash from the request URI before matching, so the array holds bare paths. Every route added here **must** also be in `App.tsx`, and vice versa.

## 6. `public/sitemap.xml` — search index

```xml
<url>
  <loc>https://tong-tong.eu/angebote</loc>
  <changefreq>monthly</changefreq>
</url>
```

`changefreq` precedent: `/` and `/posts` = `weekly`, other pages = `monthly`, legal pages = `yearly`. Sitemap domain is the canonical `https://tong-tong.eu` even while the live distribution is still the CloudFront default domain.

## The sync invariant

All four route lists — `App.tsx`, `PageMeta.tsx` `ROUTE_META`, the soft-404 `SPA_ROUTES`, and `sitemap.xml` — must agree. The **verify-app** skill's `scripts/check-route-sync.sh` checks exactly this; run it after every change.
