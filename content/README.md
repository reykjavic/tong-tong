# content/posts — Decap CMS post store

This folder is the **source of truth for all news posts**. The files are
version-controlled in this repo and live on the `main` branch — that is the
"webspace" the site reads from. Do **not** gitignore, empty, or remove them.

## How it works

- **Written by Decap CMS.** The admin UI at `/admin` (GitHub backend, see
  `public/admin/config.yml`) reads `content/posts/` and commits every edit
  back to `main` via the GitHub API. Local edits + PRs work too.
- **Read at runtime, not build time.** `src/hooks/posts.ts` fetches the folder
  listing and each file at page-load from the GitHub Contents API and
  `raw.githubusercontent.com` (`reykjavic/tong-tong`, branch `main`). The
  deployed static bundle does **not** contain these files — content changes
  appear without a rebuild.
- **Media** (post images) upload to `public/images/` and are also served from
  GitHub (see `resolveMedia` in `posts.ts`).

## File format

- Filename: `YYYY-MM-DD-slug.md`. **Filename order equals date order** — the
  homepage fetches only the newest post by sorting filenames descending.
- Frontmatter fields (Decap writes these): `title`, `date`,
  `featured_image` (optional), `excerpt` (optional), and a `body` Markdown
  section.

## Constraints

- Never add non-post `.md` files here (including a `README.md`): `posts.ts`
  parses *every* `.md` file in this folder as a post, and `README.md` would
  win the homepage's "newest post" sort.
- Keep this folder tracked in git — emptying it blanks the news section on
  the live site and the CMS.

## Developers: skip checking this folder out

Because the runtime reads posts straight from GitHub, you don't need the
post files in your local working copy. This repo's default dev setup uses
git **sparse-checkout** so `content/posts/` is tracked but not materialized:

```bash
git sparse-checkout set --no-cone '/*' '!/content/posts/'
```

- The files stay on `main` (the CMS and runtime keep working); only your
  working tree skips them. `git add -A` will **not** stage their deletion.
- `git pull` updates the index but never writes these files locally, so
  CMS commits won't clutter or conflict with your working tree.
- You still `git pull` before pushing code — posts and code share `main` —
  but pulls no longer touch these files.
- Re-enable anytime: `git sparse-checkout set --no-cone '/*'` (or
  `git sparse-checkout disable`).
