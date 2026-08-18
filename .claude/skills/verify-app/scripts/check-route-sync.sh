#!/usr/bin/env bash
#
# check-route-sync.sh — verify the four route lists agree:
#   src/App.tsx  ↔  src/components/features/PageMeta.tsx (ROUTE_META)
#   ↔  scripts/cloudfront-soft-404-function.js (SPA_ROUTES)
#   ↔  public/sitemap.xml
#
# Routes listed in PRIVATE_ROUTES are expected everywhere EXCEPT the sitemap
# (authenticated pages aren't public); a dedicated pass asserts that.
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

# Authenticated/private routes: registered in App.tsx, PageMeta and the
# soft-404 allowlist, but intentionally absent from public/sitemap.xml.
PRIVATE_ROUTES=(/dashboard)

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

# Union minus private routes — the sitemap comparison uses this set, since
# private routes are expected to be missing from the public sitemap.
printf '%s\n' "${PRIVATE_ROUTES[@]}" | sort -u > "$TMP/private"
comm -23 "$TMP/union" "$TMP/private" > "$TMP/union_public"

declare -A LABELS=(
  [app]="App.tsx"
  [meta]="PageMeta.tsx (ROUTE_META)"
  [soft404]="cloudfront-soft-404-function.js (SPA_ROUTES)"
  [sitemap]="sitemap.xml"
)

echo "Route surfaces: $(wc -l < "$TMP/union" | tr -d ' ') routes across 4 surfaces"
echo

status=0

# Per surface: which known routes are missing there. The sitemap comparison
# uses the public-only union, since private routes are meant to be absent.
for name in app meta soft404 sitemap; do
  if [[ "$name" == "sitemap" ]]; then
    union_set="$TMP/union_public"
  else
    union_set="$TMP/union"
  fi
  missing="$(comm -23 "$union_set" "$TMP/$name" | grep -v '^$' || true)"
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

# Private routes: must be registered everywhere except the sitemap, and must
# not leak into it. (The union checks above can't demand a route's presence —
# if it were absent from every surface it would never appear in the union.)
if [[ "${#PRIVATE_ROUTES[@]}" -gt 0 ]]; then
  for route in "${PRIVATE_ROUTES[@]}"; do
    for name in app meta soft404; do
      if ! grep -qxF "$route" "$TMP/$name"; then
        status=1
        echo "PRIVATE route $route MISSING from ${LABELS[$name]}"
      fi
    done
    if grep -qxF "$route" "$TMP/sitemap"; then
      status=1
      echo "PRIVATE route $route must NOT appear in sitemap.xml"
    fi
  done
fi

echo
if [[ "$status" -eq 0 ]]; then
  echo "✓ All route lists are in sync."
else
  echo "✗ Route drift detected — fix the surfaces listed above, then re-run."
fi
exit "$status"
