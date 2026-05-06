#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo to a DigitalOcean Droplet via SSH + PM2
# =============================================================================
#
# REQUIRED DIGITALOCEAN PERMISSIONS
# The Personal Access Token used must have:
#
#   read  scope  — list droplets, verify the target exists
#   write scope  — manage firewall rules (if opening ports via API)
#
# REQUIRED ON THE DROPLET:
#   - Node.js >= 18 installed
#   - PM2 installed globally:  npm install -g pm2
#   - Git installed
#   - SSH key added to the droplet (via DigitalOcean dashboard or doctl)
#   - Firewall / UFW allows inbound TCP on APP_PORT
#
# REQUIRED TOOLS (local machine):
#   - ssh, scp
#   - doctl (optional, for firewall management)
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

SSH_USER="root"                            # FIXME: SSH user ("root" or a dedicated deploy user)
DROPLET_IP="0.0.0.0"                       # FIXME: Droplet public IP address
SSH_KEY_PATH="~/.ssh/id_rsa"               # FIXME: path to your private SSH key
SSH_PORT=22                                # FIXME: SSH port (default 22)

APP_NAME="ai-demo"                         # FIXME: PM2 process name
APP_DIR="/var/www/ai-demo"                 # FIXME: deployment directory on the Droplet
APP_PORT=3000                              # FIXME: port your app listens on
NODE_ENV="production"                      # FIXME: "production" or "staging"

GIT_REPO="https://github.com/ts-geek02/AI-demo.git"  # FIXME: update if repo URL changed
GIT_BRANCH="main"                                      # FIXME: branch to deploy

# Reverse proxy reload — set to "true" if applicable
RELOAD_NGINX="false"                       # FIXME: set to "true" if nginx is your reverse proxy
RELOAD_CADDY="false"                       # FIXME: set to "true" if Caddy is your reverse proxy

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------

echo "==> Connecting to Droplet: $SSH_USER@$DROPLET_IP ..."

ssh -i "$SSH_KEY_PATH" \
    -p "$SSH_PORT" \
    -o StrictHostKeyChecking=no \
    "$SSH_USER@$DROPLET_IP" bash <<REMOTE
  set -euo pipefail

  echo "--- Pulling latest code ($GIT_BRANCH) ---"
  if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git checkout "$GIT_BRANCH"
    git reset --hard "origin/$GIT_BRANCH"
  else
    mkdir -p "$APP_DIR"
    git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
    cd "$APP_DIR"
  fi

  echo "--- Installing production dependencies ---"
  npm ci --omit=dev

  echo "--- Building TypeScript ---"
  npm run build

  echo "--- Building CSS ---"
  npm run css:build

  echo "--- Restarting with PM2 ---"
  export PORT=$APP_PORT
  export NODE_ENV=$NODE_ENV

  if pm2 list | grep -q "$APP_NAME"; then
    pm2 restart "$APP_NAME" --update-env
  else
    pm2 start dist/index.js --name "$APP_NAME"
  fi

  pm2 save

  if [ "$RELOAD_NGINX" = "true" ]; then
    echo "--- Reloading nginx ---"
    nginx -t && systemctl reload nginx
  fi

  if [ "$RELOAD_CADDY" = "true" ]; then
    echo "--- Reloading Caddy ---"
    systemctl reload caddy
  fi

  echo "--- Done. '$APP_NAME' running on port $APP_PORT ---"
REMOTE
