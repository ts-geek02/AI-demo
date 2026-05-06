# AWS Deployment Scripts

Three deployment targets are provided. Pick the one that fits your setup.

| Script                 | Best for                                             |
| ---------------------- | ---------------------------------------------------- |
| `ec2.sh`               | Full control, long-running server, SSH access        |
| `elastic-beanstalk.sh` | Managed platform, auto-scaling, minimal ops overhead |
| `ecs-fargate.sh`       | Containerised workloads, Docker-based CI/CD          |

## Required AWS CLI Setup

```bash
# Install AWS CLI v2
# https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

aws configure          # sets Access Key ID, Secret, region, output format
aws sts get-caller-identity   # verify the identity being used
```

## Shared IAM Baseline

All three scripts need at minimum:

- `sts:GetCallerIdentity` — verify credentials are valid

Each script's header lists the additional permissions on top of this.

## Usage

```bash
chmod +x scripts/deploy/aws/*.sh
./scripts/deploy/aws/ec2.sh
# or
./scripts/deploy/aws/elastic-beanstalk.sh
# or
./scripts/deploy/aws/ecs-fargate.sh
```
