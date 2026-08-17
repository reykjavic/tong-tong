#!/usr/bin/env bash
# Fix Google "Soft 404" warnings by making unknown URLs return a real HTTP 404.
#
# For each CloudFront distribution it:
#   1. Creates/publishes the "tong-tong-soft-404" viewer-request function
#      (from cloudfront-soft-404-function.js), which serves index.html ONLY
#      for the site's real SPA routes so deep links keep working.
#   2. Points the 403/404 error responses at /404.html with HTTP status 404
#      instead of today's 200 + index.html (the soft-404 source).
#
# ORDER MATTERS: deploy public/404.html to the S3 bucket FIRST (push the repo,
# let GitHub Actions sync), otherwise 404 → /404.html → (missing) → error loop.
#
# Prerequisites:
#   - AWS CLI authenticated as a user/role with cloudfront permissions
#     (GetDistributionConfig, UpdateDistribution, Create/Update/PublishFunction,
#     GetFunction, ListDistributions). The deploy users `emon` / `emon-staging`
#     are scoped to CreateInvalidation only — use a broader set of credentials.
#   - python3 (for the config patch).
#
# Usage: ./scripts/apply-soft-404-fix.sh [DISTRIBUTION_ID ...]
#   Defaults to the production + staging distributions documented in README.md.
#   Run once, by hand. It is idempotent — safe to re-run.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTION_NAME="${FUNCTION_NAME:-tong-tong-soft-404}"
FUNCTION_FILE="$SCRIPT_DIR/cloudfront-soft-404-function.js"

# Production + staging (README.md documents these IDs).
if [ "$#" -gt 0 ]; then
  DISTRIBUTIONS=("$@")
else
  DISTRIBUTIONS=(
    E1LHD3TBH0G3VX  # production (tong-tong.eu)
    EBXC3QHV697GU   # staging
  )
fi

# Credentials sanity check
aws sts get-caller-identity --query Account --output text >/dev/null || {
  echo "ERROR: no valid AWS credentials — aws sts get-caller-identity failed." >&2
  echo "Fix the default profile or export AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, then re-run." >&2
  exit 1
}

# ---------------------------------------------------------------------------
# 1. Create/update + publish the viewer-request function.
# ---------------------------------------------------------------------------
FUNCTION_CONFIG='{"Comment":"Serve index.html only for real SPA routes; everything else returns a real 404","Runtime":"cloudfront-js-1.0"}'

if aws cloudfront get-function --name "$FUNCTION_NAME" >/dev/null 2>&1; then
  echo "==> Function $FUNCTION_NAME already exists — updating"
  ETAG="$(aws cloudfront get-function --name "$FUNCTION_NAME" --query ETag --output text)"
  aws cloudfront update-function --name "$FUNCTION_NAME" --if-match "$ETAG" \
    --function-config "$FUNCTION_CONFIG" \
    --function-code "fileb://$FUNCTION_FILE" >/dev/null
  ETAG="$(aws cloudfront get-function --name "$FUNCTION_NAME" --query ETag --output text)"
else
  echo "==> Creating function $FUNCTION_NAME"
  aws cloudfront create-function --name "$FUNCTION_NAME" \
    --function-config "$FUNCTION_CONFIG" \
    --function-code "fileb://$FUNCTION_FILE" >/dev/null
  ETAG="$(aws cloudfront get-function --name "$FUNCTION_NAME" --query ETag --output text)"
fi

FN_ARN="$(aws cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$ETAG" \
  --query FunctionSummary.FunctionMetadata.FunctionARN --output text)"
echo "==> Published $FUNCTION_NAME → $FN_ARN"

# ---------------------------------------------------------------------------
# 2. Per-distribution: attach the function + fix the error responses.
# ---------------------------------------------------------------------------
patch_and_update() {
  local DIST="$1"
  local ETAG CFG PATCHED DOMAIN CODE
  ETAG="$(aws cloudfront get-distribution-config --id "$DIST" --query ETag --output text)"
  CFG="$(mktemp)"
  PATCHED="$(mktemp)"
  trap 'rm -f "$CFG" "$PATCHED"' RETURN
  aws cloudfront get-distribution-config --id "$DIST" --query DistributionConfig --output json >"$CFG"

  # Patch with python: replace 403/404 error responses with 404.html (HTTP 404)
  # and (re)attach the function as the default behavior's viewer-request handler.
  python3 - "$CFG" "$FN_ARN" "$PATCHED" <<'PY'
import json, sys
config_file, fn_arn, out_file = sys.argv[1], sys.argv[2], sys.argv[3]
config = json.load(open(config_file))

new_errors = [
    {"ErrorCode": 403, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 300},
    {"ErrorCode": 404, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 300},
]
existing = config.get("CustomErrorResponses", {}).get("Items", [])
errors = {e["ErrorCode"]: e for e in existing}
for e in new_errors:
    errors[e["ErrorCode"]] = e
config["CustomErrorResponses"] = {
    "Quantity": len(errors),
    "Items": sorted(errors.values(), key=lambda e: e["ErrorCode"]),
}

assoc = config["DefaultCacheBehavior"].get("FunctionAssociations", {}).get("Items", [])
assoc = [a for a in assoc if a.get("EventType") != "viewer-request"]
assoc.append({"EventType": "viewer-request", "FunctionARN": fn_arn})
config["DefaultCacheBehavior"]["FunctionAssociations"] = {
    "Quantity": len(assoc), "Items": assoc,
}

json.dump(config, open(out_file, "w"))
PY

  aws cloudfront update-distribution --id "$DIST" --if-match "$ETAG" \
    --distribution-config "file://$PATCHED" >/dev/null
  rm -f "$CFG" "$PATCHED"

  echo "==> $DIST: update submitted — waiting for deployment (can take ~5 min)..."
  aws cloudfront wait distribution-deployed --id "$DIST"

  DOMAIN="$(aws cloudfront get-distribution --id "$DIST" --query Distribution.DomainName --output text)"
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/definitely-not-a-real-page" || true)"
  echo "==> $DIST verified: https://$DOMAIN/definitely-not-a-real-page → HTTP $CODE (expect 404)"
  if [ "$CODE" != "404" ]; then
    echo "   !! Unexpected status — check the distribution's custom error responses." >&2
  fi
}

for DIST in "${DISTRIBUTIONS[@]}"; do
  if ! patch_and_update "$DIST"; then
    echo "!! $DIST failed — check credentials/IAM scope and continue with the rest." >&2
  fi
done

echo ""
echo "Done. Also verify a real deep link still loads the app:"
echo "  curl -s -o /dev/null -w '%{http_code}' https://tong-tong.eu/menu   # expect 200"
echo "Remember: the fix only lands for URLs that are NOT cached. CloudFront"
echo "re-fetches on the next request; no manual invalidation is required."
