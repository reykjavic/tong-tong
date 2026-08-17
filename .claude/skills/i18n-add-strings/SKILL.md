---
name: i18n-add-strings
description: Use when the user wants to add or change user-visible text, translate something, or add a language string — "translate this", "add text for …", "make that bilingual", "change the German wording", "add a translation key". Also invoked as part of the add-page skill for a new page's copy.
---

# Adding / editing i18n strings

Every user-visible string on the site goes through the `t()` function and lives in a locale file — never hardcoded in a component.

## Where strings live

- `src/locales/de.json` — **source of truth** (German is the default language).
- `src/locales/en.json` — a **full structural mirror** of `de.json`.

Both files must be edited together, in the same nested position.

## How `t()` resolves keys

- Keys are **dot-notation**: `t('about.greeting')` walks the object via `getNestedValue` in `src/i18n.tsx` (`'about.greeting'` → `translations['about'].greeting`).
- `useI18n()` returns `{ language, t, toggleLanguage, setLanguage }`; the choice persists in `localStorage['tt-lang']` and defaults from the browser locale.
- The UI switches wholesale between the two JSON objects — there is no per-key fallback, only the whole-file `de`/`en` switch.

## Procedure

1. Pick the top-level namespace that fits. Existing ones: `nav`, `meta`, `home`, `posts`, `about`, `menu`, `notFound`, `contact`, `impressum`, `datenschutz`, `common`. Reuse an existing namespace rather than creating a new one for a one-off string.
2. Add the key to `de.json` first (write the German copy), then mirror it into `en.json` at the **same structural path**.
3. Use the string in the component: `const { t } = useI18n()` then `{t('path.to.key')}`.
4. If the string is a page's SEO entry, use the `meta.<route>.title` / `meta.<route>.description` pattern — `PageMeta.tsx` reads these (see the `add-page` skill).

## Gotchas

- **A missing key silently renders the key string.** `t('home.typo')` renders literally as `home.typo` — no error, no console warning. Always check *both* files after editing.
- JSON allows no comments, no trailing commas, no single quotes — a malformed `de.json` breaks the build (`tsc` + Vite import the file as a module).
- Keep the two files structurally parallel. If the German site shows a raw key string after a language toggle, the English key is missing (or vice versa).
- Known remaining hardcoded strings: the `aria-label`s in `src/components/layout/Navbar.tsx` ("Menü öffnen", "Sprache wählen", "Menü schließen", "Tong Tong – Startseite") are real violations that could be localized — flag them, don't silently leave them. The `Tong Tong` / `冬冬饭店` brand mark is **intentional** — don't touch it. `public/404.html` is static and can't use `t()`.

**Reason:** the mirror rule exists because the toggle swaps the whole object — a key present in only one file makes the other language fall back to a raw key string, which is exactly the bug a visitor would see.
