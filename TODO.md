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

### HTTPS via CloudFront — in progress (testing on default `*.cloudfront.net` URL, no custom domain yet)
- [ ] **CloudFront distribution** in front of the bucket: OAC origin, redirect HTTP→HTTPS, custom error responses `403/404 → /index.html` (fixes SPA deep links), default root `index.html`.
- [x] **CloudFront invalidation step in workflow** — `.github/workflows/deploy.yml` now runs `aws cloudfront create-invalidation ... --paths "/*"` after `s3 sync`.
- [ ] **AWS-side for invalidation**: add `cloudfront:CreateInvalidation` to the `emon` IAM policy + set GitHub **variable** `CLOUDFRONT_DISTRIBUTION_ID` to the new distribution ID.
- [ ] **Verify** homepage + `/menu` deep link on `https://<distribution-id>.cloudfront.net` (old `http://` S3 URL stays working meanwhile as fallback).

When a real domain is chosen (later):
- [ ] **ACM certificate** (us-east-1) for the domain + DNS validation.
- [ ] Add **alternative domain name** + custom SSL cert to the *existing* distribution (edit — no recreate).
- [ ] **DNS** record at the registrar pointing at the CloudFront distribution.
- [ ] **Cleanup**: bucket policy → CloudFront-only, enable Block All Public Access, disable S3 static website hosting.

## 💡 Ideas / optional
- [ ] Preview deploy for feature branches (separate preview bucket) before merging to `main`
- [ ] Update `SPEC.md` / `README.md` / `AGENTS.md` primary color docs (they still reference old `#00A896`; current theme uses `#00695C` deep teal + `#7B1F2B` burgundy)
