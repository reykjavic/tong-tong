---
name: add-post
description: Use when the user wants to add, edit, or publish a news post — "add a post", "write a news item about …", "new post about the buffet". The intended authoring path is the Decap CMS UI at /admin (GitHub OAuth + contributor check); this skill routes the user there and explains the post format Decap writes.
---

# News posts — authored in the Decap CMS UI, not the code editor

Posts are authored **in the Decap CMS UI at `/admin`** — not hand-written in the code editor. That is the intended and supported path: `/admin` triggers the GitHub OAuth flow, checks the user's contributor status, and commits the post straight to `main` via the GitHub API. Posts are read at runtime from GitHub (`src/hooks/posts.ts`), so a published post appears on the site **without a rebuild or deploy**.

## What the agent should do when a post is requested

1. **Route to `/admin`.** Acknowledge the intended path: the post should be created/edited in the Decap CMS UI at `/admin`, which runs GitHub OAuth and verifies contributor access before writing. That's the supported workflow — manual `.md` edits are not the intended way.
2. **Offer content help, not file writes.** Draft the German/English copy, title, and excerpt the user can paste into the CMS form. Do **not** create or edit `content/posts/*.md` directly.
3. If the user reports a post that renders wrong, diagnose it with the format below — a wrong `date` sorts it oldest, a missing `title` falls back to the slug, and a stray `.md` file can break the homepage's newest-post sort.

## The post format Decap writes (reference)

Understand this to help the user and diagnose issues — it's what the CMS writes, not a template to author by hand:

- Filename `YYYY-MM-DD-slug.md` in `content/posts/` — **filename order = date order**: the homepage fetches the newest post by sorting filenames descending, so the date prefix is load-bearing, not cosmetic.
- Frontmatter (in this order): `title`, `date` (ISO, e.g. `2026-08-17`), optional `featured_image`, optional `excerpt`, then the Markdown **`body` as the last section** — the parser in `src/hooks/posts.ts` reads the section after the closing `---` as the body.
- The slug becomes the post URL/filename identity; `featured_image` paths are `public_folder` values (e.g. `/images/foo.jpg`) and are served from GitHub via `resolveMedia`. Media uploads go to `public/images/`.

## Gotchas

- **Don't hand-author posts in the editor.** If a request implies writing a `content/posts/*.md` file by hand, route it back to `/admin` first — the OAuth/contributor flow is part of the intended authoring path, and a hand-written file is the one way to silently break the format contract the runtime parser expects.
- `content/posts/` is **sparse-checked-out locally** — tracked on `main` but not materialized in the working tree (`git sparse-checkout list` shows `!/content/posts/`). You won't see posts on disk; inspect via `gh api repos/reykjavic/tong-tong/contents/content/posts?ref=main` (see the **github-cli** skill) if you need to.
- **Never add a non-post `.md` here** — `posts.ts` parses *every* `.md` file as a post; a `README.md` would win the homepage's "newest post" sort and render as a post.
- **Keep the folder tracked** — emptying it blanks the live news section and the CMS.
- Don't touch `public/admin/config.yml` for a post — that file configures *fields/collections*, not posts.

**Reason:** authoring via `/admin` keeps the OAuth/contributor authorization in front of every write, and the CMS writes the exact format the runtime parser expects — a hand-edited file is the one path that can silently break that contract.
