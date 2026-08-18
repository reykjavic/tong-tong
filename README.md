# Tong Tong — Chinesisches Restaurant Braunfels

Modern website for [China Restaurant Tong Tong](https://tong-tong.eu) in Braunfels, Germany.

## Serverless WhatsApp backend

A serverless WhatsApp ordering & kitchen system is being built in [`backend/`](backend/README.md),
scoped in [`SCOPE.md`](SCOPE.md). **Milestone 0** (webhook + auto-reply) is in progress —
a customer message gets an automatic reply. It's an **AWS SAM** application
(`backend/template.yaml`) deployed via [`scripts/deploy-backend.sh`](scripts/deploy-backend.sh).
SAM is deliberate here because the backend will grow to several Lambdas (auth for Meta/Google,
orders, messages) — see SCOPE.md §2 for the reasoning.

## Tech Stack

- **Vite** — build tool
- **React** — UI library
- **TypeScript** — type safety
- **MUI (Material UI)** — component library
- **Decap CMS** — headless CMS for content management
- **AWS S3** — hosting target

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
├── src/
│   ├── pages/        # Route components
│   ├── components/   # MUI components (layout/ | ui/ | features/)
│   ├── hooks/        # Custom hooks / data-access modules (e.g. posts.ts)
│   ├── assets/       # Static images + barrel exports
│   ├── locales/      # Translation files (de.json, en.json)
│   ├── App.tsx       # Routes + theme setup
│   ├── main.tsx      # App entry point
│   ├── theme.ts      # MUI theme config
│   ├── i18n.tsx      # Language detection + translation context
│   └── layout.ts     # Shared layout constants
├── public/
│   ├── admin/         # Decap CMS config
│   ├── images/        # Decap CMS media folder (sparse-checked-out locally)
│   └── social/        # Stable public URLs (og:image social share image)
├── content/
│   └── posts/         # Decap-managed Markdown posts (sparse-checked-out locally)
├── index.html
├── package.json
└── vite.config.ts
```

## Color Palette

- **Primary:** `#00695C` (Deep teal)
- **Secondary:** `#7B1F2B` (Burgundy)
- **Background:** `#FAFAFA`

## Translations

All UI text uses translation files in `src/locales/`:
- `de.json` — German (default)
- `en.json` — English

## Deployment

The site is hosted on **AWS S3** behind **CloudFront** (HTTPS, SPA deep-link rewrites). The GitHub Actions workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds once and deploys by branch:

- **`main` → production** — bucket `tong-tong-homepage`, CloudFront `E1LHD3TBH0G3VX` (`d2p14i2rhwc3q2.cloudfront.net`). Runs `npm ci` → `npm run build` → `aws s3 sync dist/` → CloudFront invalidation.
- **`dev` → staging** — bucket `tong-tong-staging`, CloudFront `EBXC3QHV697GU` (`d22hrnca27jxah.cloudfront.net`). Same steps against the staging bucket. A **guard step** refuses to deploy to the production bucket from the staging job.

### 404 handling (SEO)

Unknown URLs return a **real HTTP 404** (styled page in `public/404.html`) while real SPA routes keep serving `index.html`. Two pieces keep this working and must stay in sync with `src/App.tsx`:

- **`scripts/cloudfront-soft-404-function.js`** — viewer-request CloudFront Function that rewrites only the known routes to `/index.html`; everything else falls through to the origin.
- **Distribution custom error responses** — 403/404 → `/404.html` with response code `404` (not `200` → `index.html`).

Reapplying the CloudFront side on a fresh distribution is a one-command job: `./scripts/apply-soft-404-fix.sh` (see [scripts/README.md](scripts/README.md)).

### Staging previews

Push/merge to `dev` to preview an in-progress feature at the staging URL. Content (news posts) is fetched at runtime from GitHub `main`, so staging shows the branch's **code** but `main`'s **content** — expected.

Environment config lives in GitHub **Environments** (`production`, `staging`), each with its own `S3_BUCKET` and `CLOUDFRONT_DISTRIBUTION_ID` vars. Staging uses a separate IAM user `emon-staging` scoped to the staging resources only.

> **AWS setup was done one-time via CLI.** If you ever need to recreate the staging resources, the commands that created them (bucket, OAC, CloudFront distribution, bucket policy, `emon-staging` user + policy) are captured in `scripts/setup-staging.sh` — see [scripts/README.md](scripts/README.md) for how to rerun.