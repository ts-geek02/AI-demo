#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo to AWS Elastic Beanstalk
# =============================================================================
#
# REQUIRED IAM PERMISSIONS
# Attach the following to the IAM user or role that runs this script:
#
#   elasticbeanstalk:CreateApplicationVersion   — register a new version
#   elasticbeanstalk:UpdateEnvironment          — trigger the deployment
#   elasticbeanstalk:DescribeEnvironments       — poll for health/status
#   elasticbeanstalk:DescribeApplicationVersions
#   s3:PutObject                                — upload the source bundle
#   s3:GetObject
#   s3:CreateBucket                             — first-time only
#   iam:PassRole                                — pass the EB service role
#
# REQUIRED TOOLS:
#   - AWS CLI v2:  https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
#   - EB CLI:      pip install awsebcli
#   - zip utility
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

AWS_REGION="us-east-1"                    # FIXME: AWS region where your EB app lives
EB_APP_NAME="ai-demo"                     # FIXME: Elastic Beanstalk application name
EB_ENV_NAME="ai-demo-prod"                # FIXME: Elastic Beanstalk environment name
S3_BUCKET="ai-demo-eb-deployments"        # FIXME: S3 bucket for source bundles
NODE_ENV="production"                     # FIXME: "production" or "staging"

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

VERSION_LABEL="v$(date +%Y%m%d%H%M%S)"
BUNDLE_FILE="deploy-$VERSION_LABEL.zip"

echo "==> Building application..."
npm ci
npm run build
npm run css:build

echo "==> Creating source bundle: $BUNDLE_FILE ..."
zip -r "$BUNDLE_FILE" dist/ package.json package-lock.json \
  --exclude "*.test.*" \
  --exclude "src/*" \
  --exclude "node_modules/*"

# ---------------------------------------------------------------------------
# Upload & Deploy
# ---------------------------------------------------------------------------

echo "==> Uploading bundle to s3://$S3_BUCKET/$BUNDLE_FILE ..."
aws s3 cp "$BUNDLE_FILE" "s3://$S3_BUCKET/$BUNDLE_FILE" --region "$AWS_REGION"

echo "==> Registering application version: $VERSION_LABEL ..."
aws elasticbeanstalk create-application-version \
  --application-name "$EB_APP_NAME" \
  --version-label "$VERSION_LABEL" \
  --source-bundle "S3Bucket=$S3_BUCKET,S3Key=$BUNDLE_FILE" \
  --region "$AWS_REGION"

echo "==> Deploying to environment: $EB_ENV_NAME ..."
aws elasticbeanstalk update-environment \
  --environment-name "$EB_ENV_NAME" \
  --version-label "$VERSION_LABEL" \
  --region "$AWS_REGION"

echo "==> Waiting for environment to become healthy ..."
aws elasticbeanstalk wait environment-updated \
  --environment-names "$EB_ENV_NAME" \
  --region "$AWS_REGION"

echo "==> Cleaning up local bundle ..."
rm -f "$BUNDLE_FILE"

echo "==> Done. Version $VERSION_LABEL is live on $EB_ENV_NAME."
