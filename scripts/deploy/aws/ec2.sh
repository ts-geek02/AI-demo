#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo to AWS EC2 (Ubuntu / Amazon Linux) via SSH + PM2
# =============================================================================
#
# REQUIRED IAM PERMISSIONS
# Attach the following to the IAM user or role that runs this script:
#
#   ec2:DescribeInstances                 — verify the target instance exists
#   ec2:DescribeSecurityGroups            — inspect inbound rules
#   ec2:AuthorizeSecurityGroupIngress     — open APP_PORT if not already open
#   ssm:StartSession                      — alternative to SSH (optional)
#   s3:PutObject / s3:GetObject           — only if you upload artifacts via S3
#
# REQUIRED ON THE EC2 INSTANCE:
#   - Node.js >= 18
#   - PM2 installed globally:  npm install -g pm2
#   - Git installed
#   - Security group allows inbound TCP on APP_PORT from your IP (or 0.0.0.0/0)
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

EC2_USER="ubuntu"                          # FIXME: "ec2-user" for Amazon Linux, "ubuntu" for Ubuntu
EC2_HOST="0.0.0.0"                         # FIXME: EC2 public IP address or DNS hostname
SSH_KEY_PATH="~/.ssh/your-key.pem"         # FIXME: absolute path to your .pem private key

APP_NAME="ai-demo"                         # FIXME: PM2 process name (change if you renamed the app)
APP_DIR="/home/ubuntu/ai-demo"             # FIXME: deployment directory on the instance
APP_PORT=3000                              # FIXME: must match PORT env var and security group rule
NODE_ENV="production"                      # FIXME: "production" or "staging"

GIT_REPO="https://github.com/ts-geek02/AI-demo.git"  # FIXME: update if repo URL changed
GIT_BRANCH="main"                                      # FIXME: branch to deploy

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------

echo "==> Connecting to EC2: $EC2_USER@$EC2_HOST ..."

ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    "$EC2_USER@$EC2_HOST" bash <<REMOTE
  set -euo pipefail

  echo "--- Pulling latest code ($GIT_BRANCH) ---"
  if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin
    git checkout "$GIT_BRANCH"
    git reset --hard "origin/$GIT_BRANCH"
  else
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
  echo "--- Done. App '$APP_NAME' running on port $APP_PORT ---"
REMOTE
