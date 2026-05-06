#!/usr/bin/env bash
# =============================================================================
# Deploy ai-demo to AWS ECS Fargate via ECR
# =============================================================================
#
# REQUIRED IAM PERMISSIONS
# Attach the following to the IAM user or role that runs this script:
#
#   ecr:GetAuthorizationToken             — authenticate Docker with ECR
#   ecr:BatchCheckLayerAvailability       — check existing image layers
#   ecr:PutImage                          — push the final image manifest
#   ecr:InitiateLayerUpload               — start a layer upload
#   ecr:UploadLayerPart                   — upload image layer chunks
#   ecr:CompleteLayerUpload               — finalise a layer upload
#   ecr:DescribeRepositories              — verify the repo exists
#   ecr:CreateRepository                  — first-time only
#   ecs:RegisterTaskDefinition            — register a new task revision
#   ecs:UpdateService                     — point the service at the new revision
#   ecs:DescribeServices                  — poll for deployment stability
#   ecs:DescribeClusters                  — verify the cluster exists
#   iam:PassRole                          — pass the ECS task execution role
#
# REQUIRED TOOLS:
#   - AWS CLI v2
#   - Docker (running)
#   - Python 3 (used to patch the task definition JSON)
#
# PREREQUISITES:
#   - An ECS cluster, service, and task definition already exist
#   - An ECR repository already exists (or set CREATE_ECR_REPO=true)
#   - A Dockerfile in the project root
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# FIXME: Fill in every value marked FIXME before running.
# ---------------------------------------------------------------------------

AWS_REGION="us-east-1"                          # FIXME: your AWS region
AWS_ACCOUNT_ID="123456789012"                   # FIXME: your 12-digit AWS account ID
ECR_REPO_NAME="ai-demo"                         # FIXME: ECR repository name
ECS_CLUSTER="ai-demo-cluster"                   # FIXME: ECS cluster name
ECS_SERVICE="ai-demo-service"                   # FIXME: ECS service name
TASK_DEFINITION_FAMILY="ai-demo-task"           # FIXME: task definition family name
CONTAINER_NAME="ai-demo"                        # FIXME: container name inside the task definition
APP_PORT=3000                                   # FIXME: container port (must match Dockerfile EXPOSE)
NODE_ENV="production"                           # FIXME: "production" or "staging"

ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
IMAGE_TAG="$(git rev-parse --short HEAD)"
FULL_IMAGE="$ECR_REGISTRY/$ECR_REPO_NAME:$IMAGE_TAG"

# ---------------------------------------------------------------------------
# Build & Push
# ---------------------------------------------------------------------------

echo "==> Authenticating Docker with ECR ..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "==> Building Docker image: $FULL_IMAGE ..."
docker build \
  --build-arg NODE_ENV="$NODE_ENV" \
  --build-arg PORT="$APP_PORT" \
  -t "$FULL_IMAGE" .

echo "==> Pushing image to ECR ..."
docker push "$FULL_IMAGE"

# ---------------------------------------------------------------------------
# Update Task Definition & Service
# ---------------------------------------------------------------------------

echo "==> Fetching current task definition ..."
TASK_DEF_JSON=$(aws ecs describe-task-definition \
  --task-definition "$TASK_DEFINITION_FAMILY" \
  --region "$AWS_REGION" \
  --query "taskDefinition")

echo "==> Patching image reference in task definition ..."
NEW_TASK_DEF=$(echo "$TASK_DEF_JSON" | python3 - <<PYEOF
import json, sys
td = json.load(sys.stdin)
for c in td.get('containerDefinitions', []):
    if c['name'] == '$CONTAINER_NAME':
        c['image'] = '$FULL_IMAGE'
# Strip read-only fields that cannot be re-registered
for key in ['taskDefinitionArn','revision','status','requiresAttributes',
            'compatibilities','registeredAt','registeredBy']:
    td.pop(key, None)
print(json.dumps(td))
PYEOF
)

NEW_TASK_ARN=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_TASK_DEF" \
  --region "$AWS_REGION" \
  --query "taskDefinition.taskDefinitionArn" \
  --output text)

echo "==> New task definition ARN: $NEW_TASK_ARN"

echo "==> Updating ECS service: $ECS_SERVICE ..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$NEW_TASK_ARN" \
  --region "$AWS_REGION" \
  --force-new-deployment

echo "==> Waiting for service to stabilise ..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION"

echo "==> Done. Image $IMAGE_TAG is live on ECS service $ECS_SERVICE."
