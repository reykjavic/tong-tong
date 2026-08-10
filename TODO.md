# TODO — Tong Tong Website

Deployment status: ✅ live at **https://tong-tong.eu** (S3 + CloudFront, HTTPS)
CI/CD: GitHub Actions workflow `.github/workflows/deploy.yml` (main → production, dev → staging)

## ☑️ Done
- [x] Vite + React + MUI site (i18n DE/EN, navbar with language dropdown + brand mark)
- [x] GitHub Actions deploy to S3 (`aws s3 sync dist/ ... --delete`)
- [x] Secrets: `AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET` (repository secrets)
- [x] Variable: `S3_BUCKET = tong-tong-homepage`
- [x] IAM user `emon` policy (ListBucket / GetObject / PutObject / DeleteObject)

## ✅ HTTPS via CloudFront — done
- [x] **CloudFront distribution** in front of the bucket: OAC origin, redirect HTTP→HTTPS, **custom error responses `403/404 → /index.html`** (SPA deep links work), default root `index.html`.
- [x] **CloudFront invalidation step in workflow** — `.github/workflows/deploy.yml` runs `aws cloudfront create-invalidation ... --paths "/*"` after `s3 sync`.
- [x] **AWS-side for invalidation**: `cloudfront:CreateInvalidation` on the `emon` IAM policy + GitHub variable `CLOUDFRONT_DISTRIBUTION_ID` set (watch the zero: production dist is `E1LHD3TBH0G3VX`, **zero not letter O**).
- [x] **Domain live**: `tong-tong.eu` on CloudFront via Route 53 (ACM cert in us-east-1, A record aliased to `d2p14i2rhwc3q2.cloudfront.net`).

## 🔜 Production cleanup (small)
- [ ] **Disable S3 static website hosting** on `tong-tong-homepage` (the old `http://tong-tong-homepage.s3-website...` endpoint still serves; CloudFront is the only entry point now)
- [ ] Optional: **required approval** gate on the `production` GitHub Environment before anything goes live

## 🧪 Staging vs Production
A **staging** env (dev branch) separate from public **production** (main branch). `tong-tong.eu` already lives on AWS.

### Architecture
- **Production** = bucket `tong-tong-homepage` + CloudFront `E1LHD3TBH0G3VX` → `tong-tong.eu`. Deploys on merge to `main`.
- **Staging** = bucket `tong-tong-staging` + CloudFront `EBXC3QHV697GU` (`d22hrnca27jxah.cloudfront.net`). Deploys on merge to `dev`.

### Staging protection
- [x] Staging bucket: **Block Public Access ON**
- [x] CloudFront **OAC** so only CloudFront can read the staging bucket
- [ ] **CloudFront Response Headers Policy** → `X-Robots-Tag: noindex` on the staging URL (skipped during setup — needs `cloudfront:CreateResponseHeadersPolicy` on the staging IAM user)
- [x] No public S3 website URL for staging

### Workflow & GitHub Environments
- [x] One workflow, two jobs: `deploy-staging` (dev) + `deploy-production` (main), sharing a `build` job + artifact
- [x] GitHub **Environments** `staging` + `production`, each with own `S3_BUCKET` + `CLOUDFRONT_DISTRIBUTION_ID` vars
- [x] Separate deploy IAM user **`emon-staging`** scoped to staging resources (keys in `staging` env secrets)
- [x] Staging **guard step**: refuses to deploy to the production bucket from the staging job
- [x] **Domain cutover done**: `tong-tong.eu` on AWS (ACM cert + Route 53 → CloudFront)

## 🛒 Online ordering — deferred (was on `dev`)
Planned but **not being implemented right now**. The `dev` branch carries a `/order` placeholder page + "Online bestellen" button/nav entry; it was deliberately **excluded** from the `fix/social-image-and-tsconfig` merge to `main`. When building it: hosted checkout (no backend) was the chosen direction; see earlier planning in git history.

## 💡 Ideas / optional
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

## 🔒 Decap CMS OAuth security — do immediately AFTER going live

**Sequencing:** requires `tong-tong.eu` moved from Strato → AWS (ACM cert + DNS → CloudFront) first, so the Lambda's `site_id` allowlist has a stable production origin to validate against. Do this right after the domain cutover.

**Problem (2026-08-02 audit):** the custom OAuth Lambda (`decap-oauth/index.mjs`) trusts the `state`/`site_id` param as the token destination and echoes `e.origin` back in postMessage. An attacker can phish a repo collaborator into authorizing from a malicious page and receive the `repo`-scoped token. No secrets are in the repo, and a random stranger's own token has no write access — so this is a phishing/open-redirect exposure, not "anyone can publish."

- [ ] **Lambda allowlist**: validate `site_id`/state against an allowlist (production origin + `localhost:5173` for dev); refuse token delivery otherwise; close the `e.origin` echo in the `/callback` handshake
- [ ] **`site_domain`** in `public/admin/config.yml` (defense-in-depth alongside the Lambda fix)
- [ ] **Gate `/admin/`**: CloudFront Function basic-auth (like staging plan) or IP allowlist, since only the owner edits content
- [ ] **Verify GitHub OAuth App**: registered callback URL is exactly the Lambda's `/callback`, nothing wildcarded
- [ ] Consider rotating the GitHub OAuth App client secret before/after going live
