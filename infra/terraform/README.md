# OpenPlane Infrastructure (Terraform)

Production-ready Terraform configuration for OpenPlane on Google Cloud.

## 🚀 Quick Start

### 1. Setup GCP Project

You can choose either **Option A (Automated)** or **Option B (Manual)**.

#### Option A: Automated Setup (Recommended)

Run the automated setup script:

```bash
# Usage: ./scripts/setup-gcp.sh <project-id> <billing-account-id>
./scripts/setup-gcp.sh openplane-prod 012345-6789AB-CDEF01
```

#### Option B: Manual Setup (UI/CLI)

If you prefer manual control, perform these steps in the [Google Cloud Console](https://console.cloud.google.com/):

1.  **Create Project:** Create a new project (e.g., `openplane-prod`) and link your billing account.
2.  **Enable APIs:** Go to "APIs & Services" > "Library" and enable:
    - Cloud Resource Manager API
    - Artifact Registry API
    - Cloud Run Admin API
    - Cloud SQL Admin API
    - Google Cloud Memorystore for Redis API
    - Compute Engine API
    - Secret Manager API
    - Service Networking API
3.  **Create State Bucket:** Go to "Cloud Storage" and create a bucket (e.g., `openplane-prod-terraform-state`). Enable **Object Versioning**.
4.  **Create Service Account:** Go to "IAM & Admin" > "Service Accounts".
    - Create a new SA (e.g., `terraform-admin`).
    - Grant it the `Owner` role (or granular permissions like Editor, Storage Admin, etc.).
    - Generate and download a JSON key key for this SA.

### 2. Deploy Infrastructure

#### Local Deployment

Navigate to the desired environment (`dev` or `prod`) and deploy:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project <YOUR_PROJECT_ID>
cd infra/terraform/environments/prod

# Configure variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Update 'project_id'

# Deploy
terraform init
terraform plan
terraform apply
```

#### CI/CD Deployment (GitHub Actions)

This repository includes pipelines for automated deployment.

1.  **Add Secrets:** Go to GitHub Repo Settings > Secrets and add:

    - `GCP_PROJECT_ID`: Your Project ID (e.g., `openplane-prod`).
    - `GCP_SA_KEY`: The JSON key content of the `terraform-admin` Service Account you created in Step 1.

2.  **Infrastructure Pipeline:** Pushing to `infra/terraform/**` triggers `.github/workflows/deploy-infra.yml`.
3.  **Vespa Schema Pipeline:** Pushing to `packages/vespa/**` triggers `.github/workflows/deploy-vespa.yml`.

### 3. Post-Deployment

After `terraform apply` succeeds, run these steps to finalize the application setup.

#### 1. Initialize Vespa

The Vespa search engine runs on a VM and needs to be deployed with your application schema.

**Option A: Manual (SSH Tunnel)**

```bash
# Get the private IP of the Vespa VM (from Terraform output)
VESPA_IP=$(cd infra/terraform/environments/prod && terraform output -raw vespa_private_ip)

# SSH into the VM (via IAP tunnel, no public IP needed)
gcloud compute ssh openplane-vespa-prod \
    --zone=us-central1-a \
    --tunnel-through-iap

# Inside the VM, verify Vespa is running:
sudo systemctl status vespa
curl -s http://localhost:8080/state/v1/health | jq .
```

**Option B: Automated (CI/CD)**
Push changes to `packages/vespa/application/` on the `main` branch. The GitHub Actions workflow will:

1.  Authenticate to GCP.
2.  Open an IAP tunnel to the Vespa VM.
3.  Deploy the schema automatically.

#### 2. Run Database Migrations

The database schema must be created before the app can start. Run a one-off Cloud Run Job to execute migrations:

```bash
# Create a migration job (adjust image tag as needed)
gcloud run jobs create migrate-db-prod \
    --image="ghcr.io/kuluruvineeth/openplane-server:latest" \
    --region="us-central1" \
    --command="bun" \
    --args="run,db:migrate" \
    --set-secrets="DATABASE_URL=openplane-db-connection-string-prod:latest" \
    --vpc-egress="private-ranges-only"

# Execute the migration
gcloud run jobs execute openplane-db-migrate-dev \
  --region=us-central1 \
  --project="" \
  --wait
```

#### 3. Configure DNS

Point your custom domains to the Cloud Run service URLs.

1.  Get the service URLs from Terraform output:
    ```bash
    terraform output -json deployment_summary
    ```
2.  In Google Cloud Console, go to **Cloud Run** > **Manage Custom Domains**.
3.  Map your domains (e.g., `api.openplane.tech`, `app.openplane.tech`) to the respective services.
4.  Update your DNS provider (GoDaddy, Cloudflare, etc.) with the **A** or **CNAME** records provided by Google.

---

## 📂 Structure

- **`modules/`**: Reusable components (Networking, Cloud SQL, Redis, Cloud Run, Compute).
- **`environments/dev/`**: Cost-optimized (~$60/mo). Minimal resources, scale-to-zero.
- **`environments/prod/`**: High Availability (~$630/mo). Redundant DB/Redis, always-on.

## 💰 Estimated Costs

| Service       | Dev (~$60/mo)        | Prod (~$630/mo)   |
| ------------- | -------------------- | ----------------- |
| **Cloud SQL** | db-f1-micro (Shared) | 2 vCPU, 8GB (HA)  |
| **Redis**     | 1GB Basic            | 5GB Standard (HA) |
| **Vespa VM**  | n2-standard-2 (Spot) | n2-standard-4     |
| **Cloud Run** | Scale-to-zero        | Always-on (min 1) |

---

## 🗑️ Destroying Infrastructure

```bash
cd infra/terraform/environments/dev  # or prod
terraform destroy
```

**If destroy fails with subnet/VPC errors**: GCP creates hidden serverless connectors that block deletion.

**Manual cleanup**:

1. Navigate to: [VPC Network → Serverless VPC Access](https://console.cloud.google.com/networking/connectors)
   - Select region: `us-central1`
   - Delete any connectors listed
2. Navigate to: [VPC Network → VPC Networks](https://console.cloud.google.com/networking/networks/list)
   - Click on `openplane-vpc-dev` (or `openplane-vpc-prod`)
   - Go to **VPC Network Peering** tab
   - Delete the `servicenetworking-googleapis-com` peering
3. Run `terraform destroy` again

> This is a known GCP limitation with Direct VPC Egress, not a Terraform issue.

---

## 🔧 Adding Environment Variables

### 1. Normal Variables (Non-Sensitive)

Add to the `env_vars` block in `environments/dev/main.tf`:

```hcl
env_vars = {
  NODE_ENV    = "development"
  API_URL     = "https://api.example.com"
  MY_NEW_VAR  = "some-value"
}
```

### 2. Secrets (Sensitive)

For API keys, passwords, etc., use Secret Manager:

1. **Define the Secret** (in `main.tf`):

   ```hcl
   resource "google_secret_manager_secret" "my_secret" {
     secret_id = "openplane-my-secret-dev"
     # ... replication config ...
   }
   ```

2. **Grant Access** (in `main.tf` IAM section):

   ```hcl
   resource "google_secret_manager_secret_iam_member" "server_secrets" {
     # Add "my-secret" to the list
     for_each = toset(["db-password", "my-secret"])
     # ...
   }
   ```

3. **Map to Service** (in `module "server"`):
   ```hcl
   secret_env_vars = {
     MY_SECRET_ENV = {
       secret_id = google_secret_manager_secret.my_secret.secret_id
       version   = "latest"
     }
   }
   ```
