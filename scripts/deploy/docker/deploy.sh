#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo using Docker Compose (local or remote)
# =============================================================================
#
# REQUIRED PERMISSIONS
# The user running this script must:
#
#   - Be a member of the "docker" group (or run with sudo)
#   - Have SSH access to the remote server (if deploying remotely)
#   - Have read access to the container registry (if pulling a pre-built image)
#   - Have write access to the deployment directory
#
# REQUIRED TOOLS:
#   - Docker Engine:  https://docs.docker.com/engine/install/
#   - Docker Compose v2 (bundled with Docker Desktop or via plugin)
#   - ssh, scp (if deploying remotely)
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

APP_NAME="ai-demo"                         # FIXME: service name in docker-compose.yml
COMPOSE_FILE="scripts/deploy/docker/docker-compose.yml"  # FIXME: path to compose file
ENV_FILE="scripts/deploy/docker/.env.docker"             # FIXME: path to env file

# Remote deploy — leave SSH_HOST empty to deploy locally
SSH_HOST=""                                # FIXME: set to "user@host" for remote deploy
SSH_KEY_PATH="~/.ssh/id_rsa"               # FIXME: path to SSH key (only used if SSH_HOST is set)

# Container registry (optional) — set if pushing to a registry
REGISTRY=""                                # FIXME: e.g. "docker.io/youruser" or "ghcr.io/yourorg"
IMAGE_TAG="latest"                         # FIXME: image tag (e.g. "latest", "v1.0.0", git SHA)

# ---------------------------------------------------------------------------
# Helper function to run docker compose
# ---------------------------------------------------------------------------

run_compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# ---------------------------------------------------------------------------
# Local deploy
# ---------------------------------------------------------------------------

if [ -z "$SSH_HOST" ]; then
  echo "==> Building and starting containers locally ..."

  # Pull base images if available (speeds up build)
  run_compose pull 2>/dev/null || true

  # Build and start
  run_compose up -d --build --remove-orphans

  # Show running containers
  run_compose ps

  echo "==> Done. App available at http://localhost:3000"
  echo "    View logs: docker compose -f $COMPOSE_FILE logs -f"

# ---------------------------------------------------------------------------
# Remote deploy
# ---------------------------------------------------------------------------

else
  echo "==> Deploying remotely to $SSH_HOST ..."

  # Copy compose file, Dockerfile, and env file to remote
  scp -i "$SSH_KEY_PATH" \
    "$COMPOSE_FILE" \
    "scripts/deploy/docker/Dockerfile" \
    "$ENV_FILE" \
    "$SSH_HOST:~/"

  # Run compose on the remote server
  ssh -i "$SSH_KEY_PATH" "$SSH_HOST" bash <<REMOTE
    set -euo pipefail
    docker compose -f "$(basename "$COMPOSE_FILE")" pull 2>/dev/null || true
    docker compose -f "$(basename "$COMPOSE_FILE")" up -d --build --remove-orphans
    docker compose -f "$(basename "$COMPOSE_FILE")" ps
REMOTE

  echo "==> Done. App deployed to $SSH_HOST"
fi

# ---------------------------------------------------------------------------
# Optional: push to registry
# ---------------------------------------------------------------------------

if [ -n "$REGISTRY" ]; then
  echo "==> Tagging and pushing image to $REGISTRY ..."
  FULL_IMAGE="$REGISTRY/$APP_NAME:$IMAGE_TAG"
  docker tag "$APP_NAME:latest" "$FULL_IMAGE"
  docker push "$FULL_IMAGE"
  echo "==> Image pushed: $FULL_IMAGE"
fi
