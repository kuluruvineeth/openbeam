#!/bin/bash
set -e

# One-command GCP infrastructure setup
# Automates project creation, API enablement, and Terraform initialization

echo "🌩️  OpenPlane GCP Setup"
echo "======================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <project-id> <billing-account-id> [environment]"
    echo ""
    echo "Arguments:"
    echo "  project-id          GCP project ID (e.g., openplane-prod)"
    echo "  billing-account-id  GCP billing account ID"
    echo "  environment         Environment name (default: prod)"
    echo ""
    echo "Example:"
    echo "  $0 openplane-prod 012345-ABCDEF-678901 prod"
    echo ""
    exit 1
fi

PROJECT_ID=$1
BILLING_ACCOUNT=$2
ENVIRONMENT=${3:-prod}

echo "Project ID: $PROJECT_ID"
echo "Billing Account: $BILLING_ACCOUNT"
echo "Environment: $ENVIRONMENT"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${GREEN}✓ gcloud CLI is installed${NC}"

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${YELLOW}⚠ Not authenticated${NC}"
    echo "Running: gcloud auth login"
    gcloud auth login
fi

echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Create project
echo "📦 Creating GCP project..."
if gcloud projects describe "$PROJECT_ID" &> /dev/null; then
    echo -e "${YELLOW}⚠ Project $PROJECT_ID already exists${NC}"
else
    gcloud projects create "$PROJECT_ID" --name="OpenPlane $ENVIRONMENT"
    echo -e "${GREEN}✓ Project created${NC}"
fi

# Link billing
echo ""
echo "💳 Linking billing account..."
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
echo -e "${GREEN}✓ Billing linked${NC}"

# Set default project
gcloud config set project "$PROJECT_ID"

# Enable APIs
echo ""
echo "🔌 Enabling required APIs..."
echo "This may take 2-3 minutes..."
echo ""

apis=(
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "redis.googleapis.com"
    "compute.googleapis.com"
    "secretmanager.googleapis.com"
    "monitoring.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "servicenetworking.googleapis.com"
    "vpcaccess.googleapis.com"
)

for api in "${apis[@]}"; do
    echo -n "Enabling $api... "
    gcloud services enable "$api" --project="$PROJECT_ID" 2>&1 | grep -q "already enabled" && echo -e "${YELLOW}already enabled${NC}" || echo -e "${GREEN}✓${NC}"
done

# Create GCS bucket for Terraform state
echo ""
echo "🪣 Creating Terraform state bucket..."
BUCKET_NAME="${PROJECT_ID}-terraform-state"
if gsutil ls -b "gs://$BUCKET_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠ Bucket already exists${NC}"
else
    gsutil mb -p "$PROJECT_ID" "gs://$BUCKET_NAME"
    gsutil versioning set on "gs://$BUCKET_NAME"
    echo -e "${GREEN}✓ Bucket created with versioning${NC}"
fi

# Create service account for Terraform
echo ""
echo "👤 Creating Terraform service account..."
SA_NAME="terraform"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &> /dev/null; then
    echo -e "${YELLOW}⚠ Service account already exists${NC}"
else
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="Terraform Service Account" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✓ Service account created${NC}"
fi

# Grant roles
echo ""
echo "🔐 Granting IAM roles..."
roles=(
    "roles/editor"
    "roles/iam.serviceAccountAdmin"
    "roles/resourcemanager.projectIamAdmin"
)

for role in "${roles[@]}"; do
    echo -n "Granting $role... "
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --condition=None \
        > /dev/null 2>&1
    echo -e "${GREEN}✓${NC}"
done

# Set up billing alerts
echo ""
echo "💰 Setting up billing alerts..."
echo "Please configure budget alerts manually in GCP Console:"
echo "  https://console.cloud.google.com/billing/$BILLING_ACCOUNT/budgets?project=$PROJECT_ID"
echo ""
echo "Recommended thresholds: \$50, \$100, \$200"

# Initialize Terraform
echo ""
echo "🏗️  Initializing Terraform..."
TERRAFORM_DIR="infra/terraform/environments/$ENVIRONMENT"

if [ ! -d "$TERRAFORM_DIR" ]; then
    echo -e "${YELLOW}⚠ Terraform directory not found: $TERRAFORM_DIR${NC}"
    echo "Skipping Terraform initialization"
else
    cd "$TERRAFORM_DIR"
    
    # Create backend configuration
    cat > backend.tf <<EOF
terraform {
  backend "gcs" {
    bucket = "$BUCKET_NAME"
    prefix = "terraform/state/$ENVIRONMENT"
  }
}
EOF
    
    echo -e "${GREEN}✓ Created backend.tf${NC}"
    
    # Initialize
    terraform init
    
    echo -e "${GREEN}✓ Terraform initialized${NC}"
    
    cd - > /dev/null
fi

# Summary
echo ""
echo "✅ GCP setup complete!"
echo ""
echo "📋 Summary:"
echo "  • Project ID: $PROJECT_ID"
echo "  • Environment: $ENVIRONMENT"
echo "  • Terraform State: gs://$BUCKET_NAME"
echo "  • Service Account: $SA_EMAIL"
echo ""
echo "🚀 Next steps:"
echo ""
echo "1. Review Terraform configuration:"
echo "   cd $TERRAFORM_DIR"
echo "   terraform plan"
echo ""
echo "2. Deploy infrastructure:"
echo "   terraform apply"
echo ""
echo "3. Configure DNS (manual):"
echo "   • Point api.openplane.tech to Cloud Run server URL"
echo "   • Point app.openplane.tech to Cloud Run web URL"
echo ""
echo "4. Set up secrets in Secret Manager:"
echo "   • DATABASE_PASSWORD"
echo "   • REDIS_AUTH_STRING"
echo "   • JWT_SECRET"
echo "   • ENCRYPTION_KEY"
echo ""
echo "📚 Documentation:"
echo "   docs/self-hosting/gcp.md"
echo ""

