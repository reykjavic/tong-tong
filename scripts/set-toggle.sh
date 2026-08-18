#!/usr/bin/env bash
# Flip a DB-backed feature toggle in the RestaurantData config table (SCOPE.md §12).
#
# Usage: ./scripts/set-toggle.sh <ordering|reservations> <on|off>
#
# Writes the config item PK='config', SK='<feature>' with the feature's BOOL
# attribute (orderingEnabled / reservationsEnabled). The site picks the new
# value up on the next page load — no deploy, no restart.
#
# Defaults to the tong-tong profile / eu-central-1; override with AWS_PROFILE / REGION.
set -euo pipefail

FEATURE="${1:-}"
VALUE="${2:-}"
PROFILE="${AWS_PROFILE:-tong-tong}"
REGION="${REGION:-eu-central-1}"
TABLE=RestaurantData

case "$FEATURE" in
  ordering|reservations) ;;
  *) echo "usage: $0 <ordering|reservations> <on|off>" >&2; exit 2 ;;
esac

case "$VALUE" in
  on) BOOL=true ;;
  off) BOOL=false ;;
  *) echo "usage: $0 <ordering|reservations> <on|off>" >&2; exit 2 ;;
esac

aws dynamodb put-item \
  --table-name "$TABLE" \
  --item "{\"PK\":{\"S\":\"config\"},\"SK\":{\"S\":\"$FEATURE\"},\"${FEATURE}Enabled\":{\"BOOL\":$BOOL}}" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --output text >/dev/null

echo "config/$FEATURE -> ${FEATURE}Enabled=$BOOL (profile $PROFILE, $REGION)"
