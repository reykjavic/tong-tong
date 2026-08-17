# scripts/

Developer helper scripts. None of these are part of the app or the deploy — they're run by hand.

## `apply-soft-404-fix.sh` + `cloudfront-soft-404-function.js`

Applies the **soft-404 fix** to the CloudFront distributions: a viewer-request
function serves `index.html` only for the real SPA routes, and the 403/404 error
responses return the styled `/404.html` page with a real HTTP 404. Run it once,
by hand, **after** deploying `public/404.html` to S3 (a normal push to `main`):

```bash
./scripts/apply-soft-404-fix.sh            # production + staging
./scripts/apply-soft-404-fix.sh E1LHD3TBH0G3VX   # just production
```

Idempotent — safe to re-run. Needs broad CloudFront permissions (not the deploy
users `emon` / `emon-staging`). Keep `SPA_ROUTES` in the function file in sync
with `src/App.tsx` when adding routes.

## `setup-staging.sh`

One-time AWS bootstrap for the **staging** environment (bucket `tong-tong-staging`,
CloudFront OAC + distribution, bucket policy, IAM user `emon-staging`).

Run it once, by hand, from the repo root, with the AWS CLI authenticated as a
user/role that can create S3 buckets, CloudFront distributions, and IAM users:

```bash
./scripts/setup-staging.sh
```

It is **idempotent-ish** (reuses resources that already exist) and prints the
values to paste into the GitHub `staging` environment (`S3_BUCKET`,
`CLOUDFRONT_DISTRIBUTION_ID`, and the `emon-staging` access-key command).

> This is a *one-time* setup. The actual deploy (`.github/workflows/deploy.yml`)
> only syncs to the already-created bucket + distribution. It does not run this script.
