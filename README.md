# Tong Tong — Chinesisches Restaurant Braunfels

Modern website for [China Restaurant Tong Tong](https://maps.app.goo.gl/4z142Z69qbHt3YJg6) in Braunfels, Germany.

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
│   ├── admin/        # Decap CMS config
│   └── images/       # Decap media folder + og:image social share image
├── content/
│   └── posts/        # Decap-managed Markdown posts
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

The site is hosted on **AWS S3** behind **CloudFront** (HTTPS, SPA deep-link rewrites). On every push/merge to `main`, the GitHub Actions workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `npm ci` → `npm run build` → `aws s3 sync dist/` → CloudFront invalidation.