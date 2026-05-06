# DigitalOcean Deployment Scripts

Two deployment targets are provided.

| File              | Best for                                           |
| ----------------- | -------------------------------------------------- |
| `app-platform.sh` | Managed PaaS, no server management, auto-scaling   |
| `droplet.sh`      | Full control, SSH access, custom server config     |
| `app-spec.yaml`   | App Platform spec file (used by `app-platform.sh`) |

## Required Permissions

DigitalOcean uses a single **Personal Access Token** with read/write scopes.

Generate one at: **DigitalOcean Dashboard → API → Personal Access Tokens**

- **Read** scope — list apps, droplets, regions, deployment status
- **Write** scope — create/update apps, trigger deployments, manage droplets

## Required Tools

```bash
# Install doctl (DigitalOcean CLI)
# https://docs.digitalocean.com/reference/doctl/how-to/install/

doctl auth init          # paste your personal access token
doctl account get        # verify authentication
```

## Usage

**App Platform:**

```bash
chmod +x scripts/deploy/digitalocean/app-platform.sh
./scripts/deploy/digitalocean/app-platform.sh
```

**Droplet (SSH + PM2):**

```bash
chmod +x scripts/deploy/digitalocean/droplet.sh
./scripts/deploy/digitalocean/droplet.sh
```
