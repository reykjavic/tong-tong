---
name: github-cli
description: Use when a task involves GitHub operations for this repo — creating or reviewing pull requests, triaging issues, checking CI workflow runs, or querying the GitHub API. "create a PR", "what's the CI status", "open an issue", "merge that". The gh CLI is the supported way to act on GitHub on the user's behalf.
---

# GitHub CLI (gh) for the Tong Tong repo

Target repo: **`reykjavic/tong-tong`** · owner `reykjavic` · branches: `main` (→ production), `dev` (→ staging).

## Auth first

```bash
gh auth status          # confirm you're authenticated and see the account
gh repo set-default reykjavic/tong-tong   # so you can omit -R going forward
```

If not authenticated, **ask the user to run `gh auth login` themselves** — do not ask for a token in chat, and never write one into the repo or a skill file. The token lives only in gh's local config (`~/.config/gh/hosts.yml`), outside the repository.

## Common operations

```bash
gh pr create --base main --fill            # new PR from the current branch
gh pr list                                 # open PRs
gh pr view <number> --json files,additions,deletions   # what a PR actually changes
gh pr diff <number>                        # full diff
gh pr merge <number> --squash --delete-branch
gh issue list                              # open issues
gh run list --branch main --limit 5        # recent CI runs
gh run watch <run-id>                      # follow a running workflow
gh run view <run-id> --log-failed          # why did the build fail
gh api repos/reykjavic/tong-tong/contents/content/posts?ref=main   # post list (the site's news source)
```

## This repo's rules

- **Solo dev: direct push to `main` is the normal path for small changes** — quick fixes, cleanups, harness/docs tweaks. Pushing to `main` triggers a **production deploy** (`.github/workflows/deploy.yml`), so the push *is* the deploy step — expected and fine for this low-stakes single-page site.
- **Bigger features live on a branch.** Long-running work (like the current `dev` branch) stays off `main` until ready to ship, and goes through a branch + PR so the diff is reviewable. Pushing to `dev` triggers a staging deploy.
- In a **team/corporate environment** this would be different (protected `main`, everything except hotfixes via PR + review). This skill encodes the solo workflow this repo actually uses.
- A `*.md`-only or `.github/**` change **does not** trigger a deploy (paths-ignore) — relevant when the user expects a deploy after a merge.
- `content/posts/` is **sparse-checked-out locally** (tracked on `main`, absent from the working tree). `gh api` still sees those files on the remote; `git add -A` will not stage their deletion. For publishing posts, prefer the **add-post** skill / Decap CMS `/admin` flow.

## Gotchas

- `gh api` paginates — large lists need `--paginate` or you'll silently see only the first page.
- Reading `~/.config/gh/hosts.yml` (or env vars) to extract a token is never allowed — that's a secret.
- Any push/merge to `main` deploys to production — for small fixes that's the point; for a `dev`/feature-branch merge, say it out loud before pushing so there's no surprise production update.

**Reason:** the CLI is the *user's* authenticated session — using it is acting on their behalf, which is exactly what they want, and it keeps credentials out of the repo entirely (unlike raw API calls with a hardcoded token).
