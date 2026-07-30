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
│   ├── components/   # Reusable MUI components
│   ├── locales/      # Translation files (de.json, en.json)
│   ├── App.tsx       # Routes + theme setup
│   ├── main.tsx      # App entry point
│   └── theme.ts      # MUI theme config
├── public/
│   └── admin/        # Decap CMS config
├── index.html
├── package.json
└── vite.config.ts
```

## Color Palette

- **Primary:** `#00A896` (Turquoise)
- **Accent:** [TBD]

## Translations

All UI text uses translation files in `src/locales/`:
- `de.json` — German (default)
- `en.json` — English

## Deployment

Build output goes to `dist/`, ready for S3 upload.