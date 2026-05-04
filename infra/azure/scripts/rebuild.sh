#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_NAME="${OPENBEAM_ENV:-dev}"
TF_DIR="$INFRA_DIR/envs/$ENV_NAME"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

step()    { printf "\n${BOLD}${BLUE}▶ %s${NC}\n" "$*"; }
info()    { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
ok()      { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()     { printf "${RED}[ERR]${NC}   %s\n" "$*" >&2; }
die()     { err "$*"; exit 1; }

require_tool() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed. Install it and retry."
}

confirm() {
  if [[ "${OPENBEAM_YES:-0}" == "1" ]]; then
    return 0
  fi
  printf "${YELLOW}? %s${NC} [y/N]: " "$1"
  read -r answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

step "Pre-flight checks"

require_tool az
require_tool terraform
require_tool kubectl
require_tool helm
require_tool jq

if ! az account show >/dev/null 2>&1; then
  die "Not logged into Azure. Run: az login"
fi

ACCOUNT=$(az account show --query "{sub:id,name:name}" -o tsv | tr '\t' ' ')
ok "Azure: $ACCOUNT"

if [[ ! -d "$TF_DIR" ]]; then
  die "Terraform env not found: $TF_DIR (set OPENBEAM_ENV to the right name)"
fi

if [[ ! -f "$TF_DIR/terraform.tfvars" ]]; then
  if [[ -f "$TF_DIR/terraform.tfvars.example" ]]; then
    warn "terraform.tfvars missing; copying from .example"
    cp "$TF_DIR/terraform.tfvars.example" "$TF_DIR/terraform.tfvars"
  else
    die "Neither terraform.tfvars nor terraform.tfvars.example exists in $TF_DIR"
  fi
fi

if [[ ! -x "$DEPLOY_SCRIPT" ]]; then
  die "Deploy script not found or not executable: $DEPLOY_SCRIPT"
fi

LOCATION=$(grep -E '^\s*location\s*=' "$TF_DIR/terraform.tfvars" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
LOCATION="${LOCATION:-westus2}"
QUOTA_MIN=24
DASV5_LIMIT=$(az vm list-usage --location "$LOCATION" --query "[?name.value=='standardDASv5Family'].limit | [0]" -o tsv 2>/dev/null || echo "0")
DASV5_USED=$(az vm list-usage --location "$LOCATION" --query "[?name.value=='standardDASv5Family'].currentValue | [0]" -o tsv 2>/dev/null || echo "0")
DASV5_FREE=$(( DASV5_LIMIT - DASV5_USED ))
if (( DASV5_FREE < QUOTA_MIN )); then
  err "Insufficient standardDASv5Family vCPU quota in $LOCATION: $DASV5_FREE free, need ${QUOTA_MIN}+"
  err "Either:"
  err "  1. Wait — recently-deleted resource quotas can take 4-24h to release"
  err "  2. Request increase: https://portal.azure.com/#view/Microsoft_Azure_Capacity/QuotaMenuBlade"
  err "  3. Switch to another VM family in infra/azure/modules/aks/main.tf"
  die "Cannot proceed without vCPU quota."
fi
ok "vCPU quota: $DASV5_FREE free in standardDASv5Family ($LOCATION)"

ok "Tools, auth, and config ready"

step "Plan summary"

cat <<EOF
  Environment       $ENV_NAME
  Terraform dir     $TF_DIR
  Subscription      $(az account show --query name -o tsv)

  This will:
    1. terraform init + apply  → recreates AKS, ACR, Key Vault, Storage, VNet, etc.
    2. deploy.sh               → builds images in ACR, helm-installs all charts, runs health checks

  Expected runtime: 15-25 min on a fresh subscription.
  Expected cost:    matches your previous dev environment (~\$800/mo until you stop AKS).
EOF

if ! confirm "Proceed with rebuild"; then
  warn "Cancelled"
  exit 0
fi

step "Terraform init"
cd "$TF_DIR"
terraform init -upgrade

step "Terraform plan"
terraform plan -out=tfplan

step "Terraform apply"
if confirm "Apply the plan above"; then
  terraform apply tfplan
  rm -f tfplan
  ok "Infrastructure provisioned"
else
  rm -f tfplan
  warn "Cancelled before apply"
  exit 0
fi

step "Post-terraform deploy (deploy.sh)"
cd "$INFRA_DIR/.."
"$DEPLOY_SCRIPT"

step "Done"

EXTERNAL_IP=$(kubectl get svc ingress-nginx-controller -n ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
WEB_HOST=$(kubectl get ingress -n openbeam -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "")

cat <<EOF

  ${GREEN}OpenBeam $ENV_NAME is back online.${NC}

  External IP:   ${EXTERNAL_IP:-<pending — re-run kubectl in a minute>}
  Web host:      ${WEB_HOST:-<not configured>}

  Quick checks:
    kubectl get pods -A
    kubectl get ingress -A

  When you want to stop spending money again:
    az aks stop --name openbeam-${ENV_NAME}-aks --resource-group rg-openbeam-${ENV_NAME}
  Or full delete:
    az group delete --name rg-openbeam-${ENV_NAME} --yes --no-wait
    az group delete --name MC_rg-openbeam-${ENV_NAME}_openbeam-${ENV_NAME}-aks_westus2 --yes --no-wait

EOF
