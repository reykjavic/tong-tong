# TODO — Tong Tong Website

Deployment status: ✅ live on S3 static hosting
`http://tong-tong-homepage.s3-website.eu-central-1.amazonaws.com/`
CI/CD: GitHub Actions workflow `.github/workflows/deploy.yml` (auto-deploys on push/merge to `main`)

## ☑️ Done
- [x] Vite + React + MUI site (i18n DE/EN, navbar with language dropdown + brand mark)
- [x] GitHub Actions deploy to S3 (`aws s3 sync dist/ ... --delete`)
- [x] Secrets: `AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET` (repository secrets)
- [x] Variable: `S3_BUCKET = tong-tong-homepage`
- [x] IAM user `emon` policy (ListBucket / GetObject / PutObject / DeleteObject)

## 🔜 Next time — production hardening
- [ ] **HTTPS via CloudFront** — S3 website endpoint only serves HTTP. Create a CloudFront distribution in front of the bucket (gives HTTPS + caching).
- [ ] **SPA deep-links 404** — quick bucket fix: Static website hosting → **Error document = `index.html`** so routes like `/menu` work on direct visit/refresh. (With CloudFront: custom error response `404 → /index.html`.)
- [ ] **CloudFront invalidation step in workflow** — after `s3 sync`, invalidate `/*` so edge cache updates; add `cloudfront:CreateInvalidation` to the IAM policy + `CLOUDFRONT_DISTRIBUTION_ID` secret/variable.
- [ ] **Verify deployed content** — Open Sans fonts, hero carousel, language dropdown all work on the live endpoint.

## 💡 Ideas / optional
- [ ] Preview deploy for feature branches (separate preview bucket) before merging to `main`
- [ ] Update `SPEC.md` / `README.md` / `AGENTS.md` primary color docs (they still reference old `#00A896`; current theme uses `#00695C` deep teal + `#7B1F2B` burgundy)
