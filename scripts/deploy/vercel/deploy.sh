#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo to Vercel
# =============================================================================
#
# REQUIRED VERCEL PERMISSIONS
# The user or team token used must have:
#
#   - Member or Owner role on the Vercel team (if deploying to a team)
#   - Access to the Vercel project (granted via Vercel dashboard or CLI)
#
# REQUIRED TOOLS:
#   - Vercel CLI:  npm install -g vercel
#   - Authenticated: vercel login  OR set VERCEL_TOKEN env var for CI/CD
#
# PREREQUISITES:
#   - A Vercel project already linked, OR run "vercel link" first
#   - A vercel.json configuration file (provided in this directory)
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

VERCEL_PROJECT_NAME="ai-demo"             # FIXME: your Vercel project name
VERCEL_ORG_ID=""                          # FIXME: (optional) your Vercel team/org ID
VERCEL_TOKEN=""                           # FIXME: (optional) Vercel auth token for CI/CD
                                          #        generate at: https://vercel.com/account/tokens
PRODUCTION_DEPLOY="true"                  # FIXME: set to "false" for preview deployments
NODE_ENV="production"                     # FIXME: "production" or "staging"

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

echo "==> Building application ..."
npm ci
npm run build
npm run css:build

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------

DEPLOY_ARGS=()

if [ -n "$VERCEL_TOKEN" ]; then
  DEPLOY_ARGS+=(--token "$VERCEL_TOKEN")
fi

if [ -n "$VERCEL_ORG_ID" ]; then
  DEPLOY_ARGS+=(--scope "$VERCEL_ORG_ID")
fi

if [ "$PRODUCTION_DEPLOY" = "true" ]; then
  DEPLOY_ARGS+=(--prod)
fi

echo "==> Deploying to Vercel ..."
DEPLOY_URL=$(vercel deploy "${DEPLOY_ARGS[@]}" --yes)

echo "==> Done."
echo "    Deployment URL: $DEPLOY_URL"
