#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo to Google Cloud Run (manual / local machine)
# =============================================================================
#
# REQUIRED GCP IAM ROLES
# Grant these to the user or service account running this script:
#
#   roles/run.admin                  — deploy and manage Cloud Run services
#   roles/artifactregistry.writer    — push images to Artifact Registry
#   roles/iam.serviceAccountUser     — act as the Cloud Run runtime SA
#
# REQUIRED TOOLS:
#   - Google Cloud SDK (gcloud):  https://cloud.google.com/sdk/docs/install
#   - Docker (running)
#
# PREREQUISITES:
#   - gcloud auth login  (or use a service account key)
#   - Artifact Registry repository already created
#   - Billing enabled on the GCP project
#   - A Dockerfile in the project root
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

GCP_PROJECT_ID="your-gcp-project-id"           # FIXME: your GCP project ID
GCP_REGION="us-central1"                        # FIXME: Cloud Run region
AR_REPO="ai-demo-repo"                          # FIXME: Artifact Registry repository name
SERVICE_NAME="ai-demo"                          # FIXME: Cloud Run service name
APP_PORT=3000                                   # FIXME: port your app listens on (matches Dockerfile EXPOSE)
MIN_INSTANCES=0                                 # FIXME: 0 = scale to zero when idle
MAX_INSTANCES=10                                # FIXME: upper concurrency limit
MEMORY="512Mi"                                  # FIXME: memory per instance (e.g. 256Mi, 1Gi)
CPU="1"                                         # FIXME: vCPUs per instance
NODE_ENV="production"                           # FIXME: "production" or "staging"
# FIXME: service account email for the Cloud Run service identity
#        format: <name>@<project>.iam.gserviceaccount.com
SERVICE_ACCOUNT="ai-demo-sa@your-gcp-project-id.iam.gserviceaccount.com"

AR_HOST="$GCP_REGION-docker.pkg.dev"
IMAGE_TAG="$(git rev-parse --short HEAD)"
FULL_IMAGE="$AR_HOST/$GCP_PROJECT_ID/$AR_REPO/$SERVICE_NAME:$IMAGE_TAG"

# ---------------------------------------------------------------------------
# Build & Push
# ---------------------------------------------------------------------------

echo "==> Configuring Docker for Artifact Registry ..."
gcloud auth configure-docker "$AR_HOST" --quiet

echo "==> Building Docker image: $FULL_IMAGE ..."
docker build \
  --build-arg NODE_ENV="$NODE_ENV" \
  --build-arg PORT="$APP_PORT" \
  -t "$FULL_IMAGE" .

echo "==> Pushing image to Artifact Registry ..."
docker push "$FULL_IMAGE"

# ---------------------------------------------------------------------------
# Deploy to Cloud Run
# ---------------------------------------------------------------------------

echo "==> Deploying Cloud Run service: $SERVICE_NAME ..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$FULL_IMAGE" \
  --platform managed \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --port "$APP_PORT" \
  --memory "$MEMORY" \
  --cpu "$CPU" \
  --min-instances "$MIN_INSTANCES" \
  --max-instances "$MAX_INSTANCES" \
  --service-account "$SERVICE_ACCOUNT" \
  --set-env-vars "NODE_ENV=$NODE_ENV,PORT=$APP_PORT" \
  --allow-unauthenticated  # FIXME: remove this flag if the service should require authentication

echo "==> Done."
echo "    Service URL:"
gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --format "value(status.url)"
