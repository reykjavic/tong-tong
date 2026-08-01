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
- [x] **CloudFront distribution** in front of the bucket: OAC origin, redirect HTTP→HTTPS, **custom error responses `403/404 → /index.html`** (this fixes SPA deep links like `/posts` — **done**), default root `index.html`.
- [x] **CloudFront invalidation step in workflow** — `.github/workflows/deploy.yml` now runs `aws cloudfront create-invalidation ... --paths "/*"` after `s3 sync`.
- [x] **AWS-side for invalidation**: `cloudfront:CreateInvalidation` added to the `emon` IAM policy + GitHub variable `CLOUDFRONT_DISTRIBUTION_ID` set.
- [x] **Verify** homepage + `/menu` deep link on `https://<distribution-id>.cloudfront.net` (old `http://` S3 URL stays working meanwhile as fallback).

When a real domain is chosen (later):
- [ ] **ACM certificate** (us-east-1) for the domain + DNS validation.
- [ ] Add **alternative domain name** + custom SSL cert to the *existing* distribution (edit — no recreate).
- [ ] **DNS** record at the registrar pointing at the CloudFront distribution.
- [ ] **Cleanup**: bucket policy → CloudFront-only, enable Block All Public Access, disable S3 static website hosting.

## � Staging vs Production (planned — NOT started yet)
Goal: separate a protected **staging** env from public **production**, and later move `tong-tong.eu` from Strato to AWS.

### Architecture
- **Production** = current bucket `tong-tong-homepage` + CloudFront `E1LHD3TBHOG3VX` → later `tong-tong.eu`. Deploy only on merge to `main`.
- **Staging** = new private bucket (e.g. `tong-tong-staging`) + new CloudFront distribution. Deploy on **every push to any branch**. Protected so the AWS URL isn't public.

### Staging protection (so the staging URL isn't public)
- [ ] Staging bucket: **Block Public Access ON**
- [ ] CloudFront **OAC** so only CloudFront can read the staging bucket
- [ ] **CloudFront Function (viewer request)** → HTTP Basic Auth (username/password) on the staging URL
- [ ] No public S3 website URL for staging

### Workflow & GitHub Environments
- [ ] One workflow, two jobs: `staging` (if `ref != main`) + `production` (if `ref == main`)
- [ ] GitHub **Environments** `staging` + `production`, each with own variables (`S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, staging auth credentials)
- [ ] Optional: **required approval** gate on `production` before anything goes live
- [ ] Eventually: move `tong-tong.eu` from Strato → AWS (ACM cert + DNS record once production is ready)

## �💡 Ideas / optional
- [ ] Preview deploy for feature branches (separate preview bucket) before merging to `main`
- [x] Updated `SPEC.md` / `README.md` / `AGENTS.md` to reference `#00695C` deep teal + `#7B1F2B` burgundy (old `#00A896` turquoise is gone)

## ✅ Posts / Decap CMS — implemented & live
- [x] Decap CMS admin at `/admin/` (CDN script, `public/admin/config.yml`) with GitHub backend
- [x] GitHub OAuth provider: Lambda `decap-oauth` + API Gateway `yrfw3pneu6` (AWS), two-phase handshake
- [x] Runtime post fetching from GitHub (Contents API + `raw.githubusercontent.com`, `no-store`)
- [x] Homepage shows newest post + `/posts` lists all posts (with a loading skeleton)
- [x] Browser-safe frontmatter parsing (replaced gray-matter, which needs Node's `Buffer`)

## 🔜 Posts — next time
- [ ] **Post detail view** (`/posts/:slug`): render a single post on its own page
- [ ] After detail views exist, point the homepage "Read More" at the post detail (currently → `/posts`) or remove it per product decision
- [x] Removed unused `gray-matter` dependency from `package.json` (was replaced by inline parser)
