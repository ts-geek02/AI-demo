# Docker Deployment Scripts

Self-hosted deployment using Docker and Docker Compose.
Works on any machine or server that has Docker installed.

| File                 | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `Dockerfile`         | Multi-stage image build for ai-demo         |
| `docker-compose.yml` | Compose service definition (single-node)    |
| `deploy.sh`          | Build, push (optional), and run via Compose |
| `.env.docker`        | Environment variable template for Docker    |

## Required Permissions

| Context          | Requirement                                        |
| ---------------- | -------------------------------------------------- |
| Local machine    | User must be in the `docker` group (or use `sudo`) |
| Remote server    | SSH access + user in `docker` group on the server  |
| Private registry | `docker login` credentials for the registry        |

## Required Tools

```bash
# Docker Engine
# https://docs.docker.com/engine/install/

# Docker Compose v2 (bundled with Docker Desktop or as a plugin)
docker compose version   # verify it's available
```

## Usage

**Local deploy:**

```bash
chmod +x scripts/deploy/docker/deploy.sh
./scripts/deploy/docker/deploy.sh
```

**Remote deploy (SSH):**
Set `SSH_HOST` in `deploy.sh` and run the same command.

**Manual Compose:**

```bash
# Copy files to your server, then:
docker compose -f scripts/deploy/docker/docker-compose.yml up -d --build
```
