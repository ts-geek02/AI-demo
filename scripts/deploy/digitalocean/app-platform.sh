#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo to DigitalOcean App Platform
# =============================================================================
#
# REQUIRED DIGITALOCEAN PERMISSIONS
# The Personal Access Token used must have:
#
#   read  scope  — list apps, regions, deployment status
#   write scope  — create/update apps, trigger deployments
#
# Generate a token at: https://cloud.digitalocean.com/account/api/tokens
#
# REQUIRED TOOLS:
#   - doctl CLI:  https://docs.digitalocean.com/reference/doctl/how-to/install/
#   - Authenticated: doctl auth init
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

DO_APP_ID=""                               # FIXME: your App Platform app ID
                                           #        find it with: doctl apps list
                                           #        leave empty to CREATE a new app from app-spec.yaml
APP_SPEC_FILE="scripts/deploy/digitalocean/app-spec.yaml"  # FIXME: path to app spec

# ---------------------------------------------------------------------------
# Create or update the app
# ---------------------------------------------------------------------------

if [ -z "$DO_APP_ID" ]; then
  echo "==> No APP_ID set — creating a new App Platform app from spec ..."
  DO_APP_ID=$(doctl apps create \
    --spec "$APP_SPEC_FILE" \
    --no-wait \
    --format ID \
    --no-header)
  echo "==> App created. ID: $DO_APP_ID"
  echo "    Update DO_APP_ID in this script to skip creation on future runs."
else
  echo "==> Updating app spec for app: $DO_APP_ID ..."
  doctl apps update "$DO_APP_ID" --spec "$APP_SPEC_FILE"
fi

# ---------------------------------------------------------------------------
# Trigger a new deployment
# ---------------------------------------------------------------------------

echo "==> Triggering deployment ..."
DEPLOYMENT_ID=$(doctl apps create-deployment "$DO_APP_ID" \
  --force-rebuild \
  --no-wait \
  --format ID \
  --no-header)

echo "==> Deployment triggered. ID: $DEPLOYMENT_ID"
echo "==> Polling for completion (this may take a few minutes) ..."

while true; do
  STATUS=$(doctl apps get-deployment "$DO_APP_ID" "$DEPLOYMENT_ID" \
    --format Phase \
    --no-header)
  echo "    Status: $STATUS"
  case "$STATUS" in
    ACTIVE)
      echo "==> Deployment succeeded."
      break
      ;;
    ERROR|CANCELED|SUPERSEDED)
      echo "ERROR: Deployment ended with status: $STATUS"
      doctl apps get-deployment "$DO_APP_ID" "$DEPLOYMENT_ID"
      exit 1
      ;;
    *)
      sleep 15
      ;;
  esac
done

echo "==> Live URL:"
doctl apps get "$DO_APP_ID" --format LiveURL --no-header
