# public/images — Decap CMS media + stable public URLs

This folder serves **two** purposes. Read this before adding files — the app's
own images do **not** belong here.

## 1. Decap CMS post images (main use)

This is the Decap CMS `media_folder` (see `public/admin/config.yml`): images
you upload in the admin UI (`/admin`) land here and are stored in post
frontmatter with the `public_folder` prefix `/images/...`:

```yaml
featured_image: /images/palm-tree-clip-art-….avif
```

Those files are committed to `main` and served **at runtime from GitHub**:
`src/hooks/posts.ts` rewrites `/images/...` paths to
`raw.githubusercontent.com` (`resolveMedia`), so a newly uploaded image shows
up on the live site without a rebuild.

## 2. Stable public URLs — use `public/social/` instead

Vite copies everything in `public/` verbatim into `dist/`, so a file here is
served at a fixed `/…` path on the deployed site. **But `public/images/` is
reserved for CMS media.** Files that need a stable public URL but aren't post
images (e.g. `og-image.webp`, the social-share image referenced by
`index.html`) go in `public/social/` and are served from `/social/…`.

## Where app images go

Images used by the app itself (hero carousel photos, etc.) live in
`src/assets/images/` and are imported via `src/assets/images/index.ts`. Vite
bundles, hashes and optimizes them, and their URLs change on every build —
they are **not** served from `/images/...`. Don't put app assets here.

## Developers: skip checking the CMS media out

Just like `content/posts/`, the runtime serves CMS media straight from GitHub,
so you don't need the uploaded image files in your local working copy. This
repo's dev setup uses git **sparse-checkout** so `public/images/` media files
are tracked but not materialized — except this `README.md`, which stays in the
working tree so it's visible to developers. (App files that live in `public/`
but need a stable URL — like `public/social/og-image.webp` — are **not**
excluded; only the CMS media folder is.)

```bash
git sparse-checkout set --no-cone '/*' '!/content/posts/' '!/public/images/*' \
  'public/images/README.md'
```

- Uploaded media stays on `main` (the CMS and runtime keep working); only your
  working tree skips it. `git add -A` will **not** stage its deletion.
- `git pull` updates the index but never writes these files locally.
- Re-enable anytime: `git sparse-checkout set --no-cone '/*'` (or
  `git sparse-checkout disable`).
