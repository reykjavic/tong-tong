# scripts/

Developer helper scripts. None of these are part of the app or the deploy — they're run by hand.

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
