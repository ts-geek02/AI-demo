# GCP Deployment Scripts

Deploys ai-demo to **Google Cloud Run** using Docker + Artifact Registry.

| File              | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `cloud-run.sh`    | Manual deploy from your local machine           |
| `cloudbuild.yaml` | Automated deploy via Google Cloud Build (CI/CD) |

## Required GCP IAM Roles

Grant these to the service account or user that runs the scripts:

| Role                             | Why                                              |
| -------------------------------- | ------------------------------------------------ |
| `roles/run.admin`                | Deploy and manage Cloud Run services             |
| `roles/artifactregistry.writer`  | Push images to Artifact Registry                 |
| `roles/iam.serviceAccountUser`   | Act as the Cloud Run runtime service account     |
| `roles/cloudbuild.builds.editor` | Submit Cloud Build jobs (cloudbuild.yaml only)   |
| `roles/storage.objectViewer`     | Read build artifacts from GCS (Cloud Build only) |

## Setup

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID   # FIXME

# Configure Docker for Artifact Registry
gcloud auth configure-docker REGION-docker.pkg.dev  # FIXME: replace REGION
```

## Usage

**Manual deploy:**

```bash
chmod +x scripts/deploy/gcp/cloud-run.sh
./scripts/deploy/gcp/cloud-run.sh
```

**Cloud Build (CI/CD):**

```bash
gcloud builds submit --config scripts/deploy/gcp/cloudbuild.yaml .
```
