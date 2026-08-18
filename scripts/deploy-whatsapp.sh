#!/usr/bin/env bash
# Build + deploy the Tong Tong serverless WhatsApp backend (SAM, Milestone 0).
#
# Reads secrets from the gitignored backend/.env.whatsapp and passes them to
# `sam deploy` as CloudFormation parameters (NoEcho in the template), so no
# secret ever lands in the repo, in samconfig.toml, or in a shell history file.
#
# Prerequisites:
#   - SAM CLI installed  (https://aws.amazon.com/serverless/sam/ or `pipx install aws-sam-cli`)
#   - AWS CLI authenticated with rights to deploy Lambda + API Gateway + create
#     an S3 artifacts bucket (region eu-central-1)
# Run from the repo root:  ./scripts/deploy-whatsapp.sh
# Rerun anytime after editing backend/lambdas/* or backend/template.yaml.

set -euo pipefail

REGION="${REGION:-eu-central-1}"
STACK_NAME="${STACK_NAME:-tong-tong-backend}"
ENV_FILE="backend/.env.whatsapp"
# Bucket SAM uses for packaged artifacts (auto-created if missing).
SAM_BUCKET="${SAM_BUCKET:-tong-tong-sam-artifacts}"
# AWS profile with deploy rights (long-lived user tong-tong-deploy; no default creds).
PROFILE="${PROFILE:-tong-tong}"

# The webhook's Meta secrets are optional in template.yaml — the stack can deploy
# (config Lambda + RestaurantData table) before Meta setup. When the env file is
# missing the webhook ships inert; fill it + redeploy to activate (README.md).
OVERRIDES=()

if [ ! -f "$ENV_FILE" ]; then
  echo "!! $ENV_FILE not found — deploying with template defaults." >&2
  echo "   The WhatsApp webhook deploys inert (empty secrets). Configure Meta" >&2
  echo "   later, fill the file, and redeploy to activate it." >&2
else
  # KEY=VALUE → value (trims surrounding whitespace)
  read_env() {
    local key="$1"
    awk -F= -v k="$key" '$1==k { sub(/^[^=]*=/,""); gsub(/^[ \t]+|[ \t]+$/, ""); print; exit }' "$ENV_FILE"
  }

  verify_token="$(read_env VERIFY_TOKEN)"
  meta_token="$(read_env META_ACCESS_TOKEN)"
  phone_id="$(read_env PHONE_NUMBER_ID)"
  app_secret="$(read_env APP_SECRET)"
  auto_reply="$(read_env AUTO_REPLY_TEXT)"
  graph_version="$(read_env GRAPH_API_VERSION)"
  business_wa_id="$(read_env BUSINESS_WA_ID)"

  for v in "$verify_token" "$meta_token" "$phone_id" "$app_secret"; do
    if [ -z "$v" ]; then
      echo "!! Missing required value in $ENV_FILE (VERIFY_TOKEN, META_ACCESS_TOKEN," >&2
      echo "   PHONE_NUMBER_ID, APP_SECRET)." >&2
      exit 1
    fi
  done

  for v in "$verify_token" "$meta_token" "$phone_id" "$app_secret"; do
    if [ "$v" = "change-me" ]; then
      echo "!! $ENV_FILE still contains 'change-me' placeholders — the webhook will" >&2
      echo "   deploy with bogus secrets. Fix them before configuring Meta." >&2
    fi
  done

  # Array of Key=Value pairs — array elements survive values with spaces.
  OVERRIDES=(
    "VerifyToken=$verify_token"
    "MetaAccessToken=$meta_token"
    "PhoneNumberId=$phone_id"
    "AppSecret=$app_secret"
  )
  [ -n "$auto_reply" ]     && OVERRIDES+=("AutoReplyText=$auto_reply")
  [ -n "$graph_version" ]  && OVERRIDES+=("GraphApiVersion=$graph_version")
  [ -n "$business_wa_id" ] && OVERRIDES+=("BusinessWaId=$business_wa_id")
fi

# Artifacts bucket (SAM needs somewhere to upload the packaged function zip).
if ! aws s3api head-bucket --bucket "$SAM_BUCKET" --region "$REGION" --profile "$PROFILE" 2>/dev/null; then
  echo "==> Creating SAM artifacts bucket $SAM_BUCKET"
  aws s3api create-bucket --bucket "$SAM_BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" \
    --profile "$PROFILE" >/dev/null
fi

echo "==> sam build"
(cd backend && sam build)

DEPLOY_ARGS=(
  --stack-name "$STACK_NAME"
  --s3-bucket "$SAM_BUCKET"
  --s3-prefix "$STACK_NAME"
  --region "$REGION"
  --profile "$PROFILE"
  --capabilities CAPABILITY_IAM
  --no-confirm-changeset
  --no-fail-on-empty-changeset
)
[ "${#OVERRIDES[@]}" -gt 0 ] && DEPLOY_ARGS+=(--parameter-overrides "${OVERRIDES[@]}")

echo "==> sam deploy ($STACK_NAME, $REGION)"
(cd backend && sam deploy "${DEPLOY_ARGS[@]}")

echo ""
echo "==> Done. Next (see backend/README.md):"
echo "    1. Copy the WebhookUrl from the deploy output (or run"
echo "       'aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $PROFILE"
echo "       --query StackOutputs' to read it) and paste it into Meta App Dashboard"
echo "       -> Webhooks -> WhatsApp -> Configure, with your VERIFY_TOKEN."
echo "    2. Subscribe to the 'messages' webhook field and send a test message."
