# Deployment Scripts

Production-ready deployment templates for **ai-demo** (Node.js + Express + TypeScript).

Each platform directory contains:

- Deployment scripts with `# FIXME` markers for required values
- Permission requirements listed at the top of every script
- Platform-specific configuration files (Dockerfiles, YAML specs, etc.)
- A README explaining the setup and usage

## Platforms

| Directory       | Platform              | Best for                              |
| --------------- | --------------------- | ------------------------------------- |
| `aws/`          | Amazon Web Services   | EC2, Elastic Beanstalk, ECS Fargate   |
| `gcp/`          | Google Cloud Platform | Cloud Run (serverless containers)     |
| `digitalocean/` | DigitalOcean          | App Platform (PaaS) or Droplets (VPS) |
| `vercel/`       | Vercel                | Serverless Node.js deployments        |
| `docker/`       | Docker Compose        | Self-hosted on any server with Docker |

## Quick Start

1. **Pick a platform** — navigate to the directory that matches your target.
2. **Read the README** — each platform has setup instructions and prerequisites.
3. **Fill in FIXME values** — search for `# FIXME` in the scripts and replace placeholders.
4. **Make scripts executable:**
   ```bash
   chmod +x scripts/deploy/<platform>/*.sh
   ```
5. **Run the deploy script:**
   ```bash
   ./scripts/deploy/<platform>/deploy.sh
   # or the specific script name (e.g., ec2.sh, cloud-run.sh)
   ```

## Common Requirements

All scripts assume:

- The app is built with `npm run build` → output in `dist/`
- The entry point is `dist/index.js`
- The app reads `PORT` from the environment (defaults to `3000`)
- `NODE_ENV` is set to `production` for production deployments

Docker-based deployments require a `Dockerfile` — one is provided in `docker/Dockerfile`.

## Permission Checklists

Every script header lists the exact IAM roles, RBAC permissions, or API scopes required.
Review these before running to avoid permission errors.

## CI/CD Integration

Most scripts can be adapted for CI/CD pipelines:

- **AWS**: Use IAM roles for GitHub Actions / GitLab CI
- **GCP**: Use `cloudbuild.yaml` (provided in `gcp/`)
- **DigitalOcean**: Use `doctl` with a personal access token
- **Vercel**: Set `VERCEL_TOKEN` in your CI environment
- **Docker**: Push to a registry and deploy via SSH or orchestrator

## Support

For platform-specific issues, consult the README in each directory.
For app-level issues, see the main project README.
