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

## 2. Stable public URLs (the exception)

Vite copies everything in `public/` verbatim into `dist/`, so a file here is
served at `/images/<file>` on the deployed site. Only use this for files that
need a fixed, publicly reachable URL that isn't part of the app bundle — e.g.
`og-image.webp`, the social-share image referenced by `index.html`.

## Where app images go

Images used by the app itself (hero carousel photos, etc.) live in
`src/assets/images/` and are imported via `src/assets/images/index.ts`. Vite
bundles, hashes and optimizes them, and their URLs change on every build —
they are **not** served from `/images/...`. Don't put app assets here.

## Developers: skip checking the CMS media out

Just like `content/posts/`, the runtime serves CMS media straight from GitHub,
so you don't need the uploaded image files in your local working copy. This
repo's dev setup uses git **sparse-checkout** so `public/images/` media files
are tracked but not materialized — except `og-image.webp` (the social-share
image referenced by `index.html`) and this `README.md`, which **must** stay in
the working tree or the build misses the file and the deploy would delete it
from S3:

```bash
git sparse-checkout set --no-cone '/*' '!/content/posts/' '!/public/images/*' \
  'public/images/README.md' 'public/images/og-image.webp'
```

- Uploaded media stays on `main` (the CMS and runtime keep working); only your
  working tree skips it. `git add -A` will **not** stage its deletion.
- `git pull` updates the index but never writes these files locally.
- Re-enable anytime: `git sparse-checkout set --no-cone '/*'` (or
  `git sparse-checkout disable`).
