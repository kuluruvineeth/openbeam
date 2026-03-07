#!/bin/bash
set -e

# OpenBeam GCP Setup (Automated)
# Usage: ./setup-gcp.sh <project-id> <billing-account-id> [env]

if [ $# -lt 2 ]; then
    echo "Usage: $0 <project-id> <billing-account-id> [env: prod]"
    exit 1
fi

PROJECT_ID=$1
BILLING_ACCOUNT=$2
ENVIRONMENT=${3:-prod}
BUCKET_NAME="${PROJECT_ID}-terraform-state"
SA_NAME="terraform-admin"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "🚀 Setting up GCP project: $PROJECT_ID ($ENVIRONMENT)"

# 1. Create Project & Link Billing
echo "📦 Creating project..."
gcloud projects create "$PROJECT_ID" --name="OpenBeam $ENVIRONMENT" || true
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
gcloud config set project "$PROJECT_ID"

# 2. Enable APIs
echo "🔌 Enabling APIs..."
gcloud services enable \
    cloudresourcemanager.googleapis.com \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    compute.googleapis.com \
    secretmanager.googleapis.com \
    servicenetworking.googleapis.com \
    cloudresourcemanager.googleapis.com

# 3. Create State Bucket
echo "🪣 Creating state bucket..."
if ! gsutil ls -b "gs://$BUCKET_NAME" &> /dev/null; then
    gsutil mb -p "$PROJECT_ID" "gs://$BUCKET_NAME"
    gsutil versioning set on "gs://$BUCKET_NAME"
fi

# 4. Create Terraform Service Account
echo "👤 Creating Service Account..."
if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &> /dev/null; then
    gcloud iam service-accounts create "$SA_NAME" --display-name="Terraform Admin"
fi

# 5. Grant Permissions
echo "🔐 Granting roles..."
for role in roles/editor roles/iam.serviceAccountAdmin roles/resourcemanager.projectIamAdmin; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" > /dev/null
done

# 6. Init Terraform
echo "🏗️  Initializing Terraform..."
cd "infra/terraform/environments/$ENVIRONMENT"
cat > backend.tf <<EOF
terraform {
  backend "gcs" {
    bucket = "$BUCKET_NAME"
    prefix = "terraform/state/$ENVIRONMENT"
  }
}
EOF

terraform init

echo ""
echo "✅ Setup complete! Run 'terraform apply' in infra/terraform/environments/$ENVIRONMENT"
