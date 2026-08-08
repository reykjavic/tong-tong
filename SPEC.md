# SPEC.md - China Restaurant Tong Tong Website

## 1. Project Overview
- **Name:** China Restaurant Tong Tong (Braunfels)
- **Goal:** Replace the legacy TYPO3 site with a lightweight, modern, mobile-responsive website integrated with Decap CMS for easy news/posts management.
- **Vibe & Design Tone:** Clean & minimalist with a subtle, modern East Asian aesthetic (e.g., generous white space, refined typography, subtle accents).
- **Primary Color:** **Deep teal** (`#00695C`), implemented as the main theme primary color in MUI, with a burgundy secondary accent (`#7B1F2B`).

> **Status legend** — `[built]` implemented; `[planned]` spec'd but not yet implemented; `[changed]` implementation diverged from the original spec (reality noted).

---

## 2. Tech Stack Requirements
- **Framework:** **Vite + React** (for learning purposes)
- **CMS:** **Decap CMS** (formerly Netlify CMS) hosted on GitHub repository. `[changed]` Deployed to **AWS S3 + CloudFront** (GitHub Actions), not GitHub Pages/Vercel.
- **UI Library & Styling:** **MUI (Material UI v5/v6)** + `@emotion/react` + `@emotion/styled`
- **Icons:** `@mui/icons-material`
- **Routing:** **Wouter** (lightweight, actively maintained, hooks-based routing) — installed via `npm i wouter`
- **Carousel Component:** `[built]` **Swiper.js** chosen (fade effect, lazy-loaded responsive images).
- **Content Strategy:** Posts and dynamic data stored as Markdown/JSON files in the repository managed by Decap CMS. `[changed]` Other static content no longer uses placeholder values — all copy is final.

---

## 3. Page Structure & Features

### A. Navigation & Header (MUI `AppBar` + `Drawer`)
- **Logo / Brand:** "TONG TONG" (China Restaurant Braunfels).
- **Navigation Links:** `[changed]` Implemented nav (Navbar) is: Home, Über uns, Speisekarte, Kontakt. Legal links (Impressum/Datenschutz) live in the footer. The links below that aren't in the nav are `[planned]`:
  - `Startseite` (Home) `[built]`
  - `Speisekarte` (Menu PDF) `[built]`
  - `Buffet-Info` (Buffet Details) `[planned]`
  - `Über uns` (About Us) `[built]`
  - `Aktuelles / Posts` (News & Posts Listing - modular/deactivatable) `[planned]` — posts are reachable at `/posts` but not linked in the nav
  - `Kontakt & Öffnungszeiten` (Contact & Hours) `[built]` — Contact in nav; separate `/hours` page not linked in nav
  - `Impressum & Datenschutz` (Legal / Privacy) `[built]` — in the footer, not the nav
- **Language Toggle:** Include a language toggle in the AppBar. Support automatic language detection with manual override:
  - **Default language:** German (`de`) `[built]`
  - **Auto-detection logic:** Detect user's language via browser locale (`navigator.language`) and IP geolocation `[changed]` — only `navigator.language` is implemented (`src/i18n.tsx`)
  - **IP-based detection:** If IP is from Germany → default to German; otherwise → default to English `[planned]` — not implemented
  - **Browser detection:** Fall back to `navigator.language` or `navigator.languages` if IP detection unavailable `[built]`
  - **Manual override:** User can always switch between DE and EN via the toggle, with preference saved in localStorage `[built]`
- **Mobile Navigation:** Responsive MUI `IconButton` with `MenuIcon` opening a slide-out `Drawer` featuring primary-color accents.

### B. Home / Landing Page
1. **Hero Section (Carousel):** `[built]`
   - Modern image carousel displaying key restaurant highlights.
   - Smooth auto-play with manual slide controls using MUI `IconButton` with custom primary palette. `[changed]` Implemented with Swiper.js (fade crossfade, native lazy loading, responsive WebP srcset).
   - CTA buttons (e.g., MUI `Button` variant="contained" in primary) for *"Speisekarte Ansehen"* or *"Kontakt"*. `[built]` — mobile button links to the menu PDF, desktop to `/menu`.
2. **Latest News / Post Section:** `[built]`
   - Display section directly below the carousel showing the **single most recent post** managed via Decap CMS.
   - Card container with title, publish date, short snippet, optional featured image, and a "Read More" button.
3. **Buffet & Highlights Teaser:** `[planned]`
   - Visual section using MUI `Grid` and `Card` components teasing the buffet offerings and popular dishes.
4. **Opening Hours Quick View:** `[built]`
   - Highlighted section using MUI `Paper` or `Card` displaying opening hours and current status (e.g., open/closed indicator chip).

### C. Posts Listing Page (`/posts` or `/aktuelles`) `[built]`
- Full grid layout displaying all historical posts from Decap CMS.
- Simple card design with pagination or clean list view. `[changed]` Implemented as a clean list (no pagination — fetches all posts from GitHub).
- *Note:* Designed to be easily toggled off or hidden in navigation if not needed.

### D. Speisekarte (Menu) Page
- **Current Setup (Phase 1):** `[built]` Embedded responsive PDF Viewer component (e.g., using `<iframe>`, `<embed>`, or `react-pdf` inside an MUI `Box`/`Container`) allowing users to view and download the existing PDF menu.
- **Future Roadmap (Phase 2):** `[planned]` To be refactored into an interactive menu grid with filterable tabs and direct online ordering features.

### E. Kontakt & Öffnungszeiten Page `[built]`
- Address, phone number, click-to-call MUI `Button`.
- Embedded map container.
- Legal footer linking to *Impressum* & *Datenschutz* (required for German websites).

---

## 4. Decap CMS & GitHub Integration Requirements
- **Admin Directory:** Static admin folder (`/public/admin/index.html` and `/public/admin/config.yml`).
- **CMS Backend Config:** Set to `github` backend (or `git-gateway` if hosted on Netlify) targeting the main branch repository.
- **Content Storage:** Posts stored in markdown format within `/content/posts/*.md`.
- **GitHub Action Workflow:** CI/CD pipeline configured in `.github/workflows/deploy.yml` to automatically build and deploy the site whenever a post is published/edited through Decap CMS.

---

## 5. Theme & Palette Specification (MUI `createTheme`)
AI assistants should initialize a custom MUI theme file (`theme.js` or `theme.ts`):

```javascript
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00695C', // Deep teal
      dark: '#004D40',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7B1F2B', // Burgundy accent
      dark: '#4A1018',
      contrastText: '#ffffff',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: ['Inter', 'Roboto', '"Helvetica Neue"', 'sans-serif'].join(','), // [changed] actual: 'Libre Franklin' (see src/theme.ts)
  },
});

export default theme;
```

---

## 6. Guidelines for AI Coding Assistants (Copilot / Cursor / Claude)
> **Instructions for the AI when reading this repository:**
> 1. Use **Material UI (MUI)** for all UI components, layout (`Grid`, `Stack`, `Box`, `Container`), and styling (`sx` prop or `styled` utility).
> 2. Wrap the application root in MUI's `ThemeProvider` using the custom theme setup in `/src/theme.ts`.
> 3. Use **Wouter** for routing — not Next.js App Router. Routes defined with `<Route>` components (e.g., `<Route path="/" component={Home} />`).
> 4. Create the Decap CMS `config.yml` in `/public/admin/` to manage post fields (title, date, featured_image, body).
> 5. Fetch and parse Markdown files from `/content/posts/` to dynamically load the latest post on the Homepage hero sub-section and on the `/posts` page.
> 6. Make the `Aktuelles / Posts` menu item configurable (e.g., via a boolean flag in site config) so it can easily be hidden. `[planned]` — no nav link for posts currently exists; `/posts` is reachable only by URL.