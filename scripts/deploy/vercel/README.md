# Vercel Deployment Scripts

| File          | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `deploy.sh`   | Deploy from local machine or CI/CD                 |
| `vercel.json` | Vercel project configuration (routing, env, build) |

## Required Permissions

Vercel uses a **Personal Access Token** or a **team token**.

Generate one at: **vercel.com/account/tokens**

The token needs:

- Access to the target project (member or owner of the team/account)
- Ability to create deployments on the project

## Required Tools

```bash
npm install -g vercel    # install Vercel CLI
vercel login             # authenticate interactively
# OR set VERCEL_TOKEN env var for CI/CD (no interactive login needed)
```

## Usage

```bash
chmod +x scripts/deploy/vercel/deploy.sh
./scripts/deploy/vercel/deploy.sh
```

For CI/CD, set these environment variables before running:

- `VERCEL_TOKEN` — your Vercel auth token
- `VERCEL_ORG_ID` — your team/org ID (optional, for team projects)
