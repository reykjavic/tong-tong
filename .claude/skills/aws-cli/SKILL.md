---
name: aws-cli
description: Use when a task involves AWS for this site — deploying to S3, invalidating CloudFront, inspecting buckets or distributions, or running the infra scripts. "deploy to staging", "push the build to S3", "clear the CloudFront cache", "check what's in the bucket". The aws CLI acts on AWS with the user's credentials.
---

# AWS CLI for the Tong Tong deployment

Region: **`eu-central-1`**. Two environments, each with a bucket + CloudFront distribution:

| Env | S3 bucket | CloudFront dist | IAM user |
|---|---|---|---|
| Production | `tong-tong-homepage` | `E1LHD3TBH0G3VX` | `emon` |
| Staging | `tong-tong-staging` | `EBXC3QHV697GU` | `emon-staging` |

## Auth first

```bash
aws sts get-caller-identity        # confirm which identity you're acting as
aws configure list-profiles        # which profiles exist
```

If not authenticated, **ask the user to set up credentials themselves** (`aws configure` or `aws sso login` / env vars) — do not accept or print access keys in chat, and never put them in the repo. Credentials live in `~/.aws/credentials` / `~/.aws/config`, outside the repository. Add `--profile <name>` to commands when the user has multiple profiles.

## Common operations

```bash
aws s3 ls s3://tong-tong-homepage --region eu-central-1
aws s3 sync dist/ s3://tong-tong-homepage --delete          # mirror the build (normally CI does this)
aws cloudfront create-invalidation --distribution-id E1LHD3TBH0G3VX --paths "/*"
./scripts/apply-soft-404-fix.sh E1LHD3TBH0G3VX              # re-apply the soft-404 function (prod only)
```

Deploys normally run through GitHub Actions (`main` → prod, `dev` → staging) — manual `s3 sync` is for local testing, emergency fixes, or the one-time scripts (`apply-soft-404-fix.sh`, `setup-staging.sh`, both documented in `scripts/README.md`).

## This repo's rules

- **Never point a staging operation at the production bucket** (`tong-tong-homepage`). The workflow has a guard for this; manual commands must respect it too. A quick sanity check: the bucket name appears in the command — confirm it's the intended one.
- **`s3 sync --delete` and any `s3 rm` are destructive** — the bucket mirrors `dist/`, so `--delete` removes anything not in the local build. Confirm with the user before running against production.
- **CloudFront invalidation takes time** — `create-invalidation` returns immediately but propagation takes minutes; don't report "deployed" as "visible everywhere" without noting that.
- The deploy users (`emon` / `emon-staging`) have S3-write-to-their-bucket + CloudFront-invalidation only. The `apply-soft-404-fix.sh` script needs **broader CloudFront permissions** — run it with a different role/profile, not the deploy user.

## Gotchas

- The staging distribution is still missing the `X-Robots-Tag: noindex` response-headers policy (documented in `TODO.md`) — if the user asks to add it, that's a pending task, not a finished one.
- `aws cloudfront` and `aws s3` use different default regions/endpoints; be explicit (`--region eu-central-1`) or you'll get confusing errors.
- Prefer `aws cloudfront create-invalidation` over deleting/recreating distributions — the site's DNS and error responses are wired to the existing ones.
- Destructive operations (deleting a distribution, bucket policy changes, `s3 rb`) require explicit user confirmation before running.

**Reason:** the CLI runs with the user's real credentials, so every command is an action on their infrastructure — the skill exists to make those actions correct (right bucket, right region, destructive ops flagged), not to bypass their review.
