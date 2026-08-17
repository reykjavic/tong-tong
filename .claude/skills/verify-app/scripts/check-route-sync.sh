#!/usr/bin/env bash
#
# check-route-sync.sh — verify the four route lists agree:
#   src/App.tsx  ↔  src/components/features/PageMeta.tsx (ROUTE_META)
#   ↔  scripts/cloudfront-soft-404-function.js (SPA_ROUTES)
#   ↔  public/sitemap.xml
#
# Part of the verify-app skill. Exit 0 = all in sync, 1 = drift found,
# 2 = script bug (a surface parsed to nothing).

set -euo pipefail

# This script lives in .claude/skills/verify-app/scripts/ → repo root is 4 levels up.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$REPO_ROOT"

APP_TSX="src/App.tsx"
PAGE_META="src/components/features/PageMeta.tsx"
SOFT_404="scripts/cloudfront-soft-404-function.js"
SITEMAP="public/sitemap.xml"
SITE_DOMAIN="tong-tong.eu"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Normalize sitemap paths: root "/" stays "/", everything else loses a
# trailing slash (the soft-404 function treats "/menu/" and "/menu" as the
# same page, so both spellings are "in sync").
strip_trailing_slash() {
  while IFS= read -r p; do
    if [[ "$p" == "/" ]]; then
      echo "/"
    else
      echo "${p%/}"
    fi
  done
}

# 1. App.tsx — <Route path="/x" …>; the catch-all has no path, so it's excluded naturally.
grep -oE '<Route path="[^"]*"' "$APP_TSX" \
  | sed 's/<Route path="//; s/"$//' \
  | sort -u > "$TMP/app"

# 2. PageMeta.tsx — ROUTE_META keys that start with "/" (the notFound: fallback is excluded).
grep -oE '^[[:space:]]*'\''/[^'\'']*'\''' "$PAGE_META" \
  | sed "s/^[[:space:]]*'//; s/'$//" \
  | sort -u > "$TMP/meta"

# 3. cloudfront-soft-404-function.js — the SPA_ROUTES array literals (ES5 file).
sed -n '/var SPA_ROUTES = \[/,/\];/p' "$SOFT_404" \
  | grep -oE "'/[^']*'" \
  | tr -d "'" \
  | sort -u > "$TMP/soft404"

# 4. sitemap.xml — <loc> values, domain stripped, trailing slash normalized.
grep -oE '<loc>[^<]*</loc>' "$SITEMAP" \
  | sed 's/<loc>//; s#</loc>##; s#https://'"$SITE_DOMAIN"'##' \
  | strip_trailing_slash \
  | sort -u > "$TMP/sitemap"

# Guard: a surface that parsed to nothing means the script's patterns no
# longer match the source — flag it as a bug, not as "in sync".
for name in app meta soft404 sitemap; do
  if [[ ! -s "$TMP/$name" ]]; then
    echo "ERROR: no routes extracted from $name — the source pattern changed, update this script." >&2
    exit 2
  fi
done

# Routes known anywhere = union of all surfaces.
cat "$TMP"/app "$TMP"/meta "$TMP"/soft404 "$TMP"/sitemap | sort -u > "$TMP/union"

declare -A LABELS=(
  [app]="App.tsx"
  [meta]="PageMeta.tsx (ROUTE_META)"
  [soft404]="cloudfront-soft-404-function.js (SPA_ROUTES)"
  [sitemap]="sitemap.xml"
)

echo "Route surfaces: $(wc -l < "$TMP/union" | tr -d ' ') routes across 4 surfaces"
echo

status=0

# Per surface: which known routes are missing there.
for name in app meta soft404 sitemap; do
  missing="$(comm -23 "$TMP/union" "$TMP/$name" | grep -v '^$' || true)"
  if [[ -n "$missing" ]]; then
    status=1
    echo "MISSING from ${LABELS[$name]}:"
    echo "$missing" | sed 's/^/  /'
  fi
done

# Extras: routes present in a surface but not registered in App.tsx.
for name in meta soft404 sitemap; do
  extra="$(comm -13 "$TMP/app" "$TMP/$name" | grep -v '^$' || true)"
  if [[ -n "$extra" ]]; then
    status=1
    echo "NOT in App.tsx but listed in ${LABELS[$name]}:"
    echo "$extra" | sed 's/^/  /'
  fi
done

echo
if [[ "$status" -eq 0 ]]; then
  echo "✓ All route lists are in sync."
else
  echo "✗ Route drift detected — fix the surfaces listed above, then re-run."
fi
exit "$status"
