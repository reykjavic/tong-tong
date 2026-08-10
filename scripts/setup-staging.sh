#!/usr/bin/env bash
# One-time bootstrap for the Tong Tong **staging** environment on AWS.
#
# Creates: staging S3 bucket + Block Public Access, CloudFront OAC,
# CloudFront distribution (OAC origin, HTTPS, SPA 403/404 -> index.html),
# bucket policy (CloudFront-only), and the `emon-staging` deploy IAM user.
#
# Idempotent-ish: skips steps whose resources already exist. Resource IDs are
# printed at the end — paste them into the GitHub `staging` environment:
#   S3_BUCKET, CLOUDFRONT_DISTRIBUTION_ID, and the emon-staging access keys.
#
# Requires: the AWS CLI authenticated with a role that can create these
# resources (bucket, CloudFront, IAM) in the target account/region.
# Run from the repo root:  ./scripts/setup-staging.sh
#
# NOTE: this script must be run ONCE by hand. The deploy workflow
# (deploy.yml) only syncs to the already-created bucket + distribution.

set -euo pipefail

REGION="${REGION:-eu-central-1}"
BUCKET="${BUCKET:-tong-tong-staging}"
OAC_NAME="${OAC_NAME:-tong-tong-staging-oac}"
IAM_USER="${IAM_USER:-emon-staging}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"

echo "==> Region: $REGION | Bucket: $BUCKET | Account: $ACCOUNT_ID"

# 1. Bucket (skip if it already exists)
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "==> Bucket $BUCKET already exists"
else
  echo "==> Creating bucket $BUCKET"
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
fi

# 2. Block public access (no public S3 website endpoint for staging)
echo "==> Blocking public access"
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

# 3. CloudFront OAC (reuse existing one with this name)
OAC_ID="$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id" \
  --output text)"
if [ -n "$OAC_ID" ]; then
  echo "==> OAC $OAC_NAME already exists: $OAC_ID"
else
  echo "==> Creating OAC $OAC_NAME"
  OAC_ID="$(aws cloudfront create-origin-access-control \
    --origin-access-control-config \
    "{\"Name\":\"$OAC_NAME\",\"Description\":\"staging bucket OAC\",\"SigningProtocol\":\"sigv4\",\"SigningBehavior\":\"always\",\"OriginAccessControlOriginType\":\"s3\"}" \
    --query OriginAccessControl.Id --output text)"
fi

# 4. CloudFront distribution (reuse existing one for this bucket origin)
DIST_ID="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET.s3.$REGION.amazonaws.com'].Id" \
  --output text)"
if [ -n "$DIST_ID" ]; then
  echo "==> Distribution for $BUCKET already exists: $DIST_ID"
else
  echo "==> Creating CloudFront distribution"
  CFG_FILE="$(mktemp)"
  cat > "$CFG_FILE" <<EOF
{
  "CallerReference": "$BUCKET-$(date +%s)",
  "Comment": "Tong Tong staging",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "${BUCKET}-origin",
        "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
        "OriginAccessControlId": "$OAC_ID",
        "S3OriginConfig": {"OriginAccessIdentity": ""}
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "${BUCKET}-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2, "Items": ["GET", "HEAD"],
      "CachedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"},
      "Headers": {"Quantity": 0, "Items": []}
    },
    "MinTTL": 0, "DefaultTTL": 0, "MaxTTL": 0,
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {"ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10},
      {"ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 10}
    ]
  },
  "PriceClass": "PriceClass_100",
  "Restrictions": {"GeoRestriction": {"RestrictionType": "none", "Quantity": 0, "Items": []}},
  "ViewerCertificate": {"CloudFrontDefaultCertificate": true, "MinimumProtocolVersion": "TLSv1.2_2021"},
  "HttpVersion": "http2",
  "IsIPV6Enabled": true,
  "Aliases": {"Quantity": 0, "Items": []}
}
EOF
  DIST_ID="$(aws cloudfront create-distribution --distribution-config "file://$CFG_FILE" \
    --query Distribution.Id --output text)"
  rm -f "$CFG_FILE"
fi
DIST_ARN="arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID"

# 5. Bucket policy granting CloudFront OAC read access
echo "==> Applying bucket policy (CloudFront-only)"
POLICY_FILE="$(mktemp)"
cat > "$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {"Service": "cloudfront.amazonaws.com"},
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET/*",
      "Condition": {"StringEquals": {"AWS:SourceArn": "$DIST_ARN"}}
    }
  ]
}
EOF
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$POLICY_FILE"
rm -f "$POLICY_FILE"

# 6. emon-staging deploy IAM user (skip if exists)
if aws iam get-user --user-name "$IAM_USER" 2>/dev/null; then
  echo "==> IAM user $IAM_USER already exists"
else
  echo "==> Creating IAM user $IAM_USER"
  aws iam create-user --user-name "$IAM_USER" >/dev/null
fi
echo "==> Attaching $IAM_USER deploy policy"
IAM_POLICY_FILE="$(mktemp)"
cat > "$IAM_POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::$BUCKET", "arn:aws:s3:::$BUCKET/*"]
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "$DIST_ARN"
    }
  ]
}
EOF
aws iam put-user-policy --user-name "$IAM_USER" --policy-name tong-tong-staging-deploy \
  --policy-document "file://$IAM_POLICY_FILE"
rm -f "$IAM_POLICY_FILE"

echo ""
echo "======================================================"
echo "Staging resources ready. Add these to the GitHub 'staging' environment:"
echo "  S3_BUCKET                     = $BUCKET"
echo "  CLOUDFRONT_DISTRIBUTION_ID    = $DIST_ID"
echo "  Staging URL: https://$(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)"
echo ""
echo "  emon-staging access keys (create them — shown once):"
echo "    aws iam create-access-key --user-name $IAM_USER"
echo "  Save the returned key pair as the staging env secrets:"
echo "    AWS_ACCESS_KEY_ID / AWS_ACCESS_KEY_SECRET"
echo "======================================================"
