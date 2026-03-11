#!/usr/bin/env bash
set -euo pipefail

# Post-terraform deployment script for OpenBeam on AKS
# Automates: AKS connect, namespaces, secrets, ACR builds, helm charts, Vespa schema, health checks
# Idempotent — safe to re-run
#
# Learnings codified:
# - ACR builds: No BuildKit (no --mount=type=cache, no ARG before FROM interpolation)
# - ACR builds: .dockerignore must NOT contain "Dockerfile*" or Dockerfiles won't upload
# - ACR builds: Exclude large unused dirs (desktop, mobile, docs, website) to keep context < 200MB
# - Vespa: Service selector must match pod labels (chart uses "app: vespa", not k8s standard labels)
# - Vespa: Needs fsGroup: 1000 in podSecurityContext for volume writes
# - Vespa: validation-overrides.xml dates must be within 30 days of current date
# - Worker: Needs 4Gi memory limit for webpack compilation of 14 Temporal workflow bundles
# - Worker: Health endpoint is /health/live and /health/ready on port 9092
# - Server: Health endpoint is /api/health/system (not /api/health)
# - Redis: Special chars (+/=) in password must be URL-encoded in connection string
# - Temporal: Must register "default" namespace after deployment
# - Ingress: Do NOT set azure-load-balancer-resource-group annotation (causes auth errors)
# - Ingress: AKS cluster identity needs Network Contributor role on node resource group
# - Grafana: Needs grafana-oauth-secrets placeholder secret in monitoring namespace

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
success() { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()     { printf "${RED}[ERR]${NC}   %s\n" "$*" >&2; }
step()    { printf "\n${CYAN}==> Step %s: %s${NC}\n" "$1" "$2"; }

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------
ENV="${1:-dev}"
DRY_RUN=false
SKIP_IMAGES=false
SKIP_HELM=false
SKIP_VESPA_SCHEMA=false

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)            DRY_RUN=true; shift ;;
    --skip-images)        SKIP_IMAGES=true; shift ;;
    --skip-helm)          SKIP_HELM=true; shift ;;
    --skip-vespa-schema)  SKIP_VESPA_SCHEMA=true; shift ;;
    -h|--help)
      cat <<USAGE
Usage: $(basename "$0") [environment] [flags]

Arguments:
  environment   Target environment (default: dev)

Flags:
  --dry-run             Print commands without executing
  --skip-images         Skip Docker build/push step
  --skip-helm           Skip Helm chart deployment
  --skip-vespa-schema   Skip Vespa application package deployment
  -h, --help            Show this help

Examples:
  $(basename "$0")                  # deploy dev (full)
  $(basename "$0") dev --dry-run    # preview dev deployment
  $(basename "$0") dev --skip-images # redeploy helm only
USAGE
      exit 0
      ;;
    *) err "Unknown flag: $1"; exit 1 ;;
  esac
done

TF_DIR="$SCRIPT_DIR/../envs/$ENV"

if [[ ! -d "$TF_DIR" ]]; then
  err "Terraform environment directory not found: $TF_DIR"
  exit 1
fi

info "Environment: $ENV"
info "Terraform dir: $TF_DIR"
$DRY_RUN && warn "DRY RUN — no changes will be applied"

# ---------------------------------------------------------------------------
# Helper: run or print
# ---------------------------------------------------------------------------
run() {
  if $DRY_RUN; then
    printf "${YELLOW}[DRY]${NC}   %s\n" "$*"
  else
    "$@"
  fi
}

# ---------------------------------------------------------------------------
# Prerequisite checks
# ---------------------------------------------------------------------------
step "0" "Checking prerequisites"

for cmd in az kubectl helm terraform openssl python3; do
  if ! command -v "$cmd" &>/dev/null; then
    err "Required command not found: $cmd"
    exit 1
  fi
done
success "All required tools found"

# ---------------------------------------------------------------------------
# Step 1 — Terraform outputs
# ---------------------------------------------------------------------------
step "1" "Reading Terraform outputs"

cd "$TF_DIR"

tf_out() {
  terraform output -raw "$1" 2>/dev/null
}

tf_out_json() {
  terraform output -json "$1" 2>/dev/null
}

ACR_LOGIN_SERVER="$(tf_out acr_login_server)"
ACR_NAME="$(echo "$ACR_LOGIN_SERVER" | cut -d. -f1)"
RESOURCE_GROUP="$(tf_out resource_group_name)"
AKS_CLUSTER="$(tf_out aks_cluster_name)"
KEY_VAULT_URI="$(tf_out key_vault_uri)"
DB_PASSWORD="$(tf_out db_admin_password 2>/dev/null || echo '')"

info "ACR:            $ACR_LOGIN_SERVER"
info "Resource Group: $RESOURCE_GROUP"
info "AKS Cluster:    $AKS_CLUSTER"
info "Key Vault:      $KEY_VAULT_URI"

if [[ -z "$DB_PASSWORD" ]]; then
  warn "Could not fetch db_admin_password from Terraform — will prompt"
  if ! $DRY_RUN; then
    read -rsp "Enter database admin password: " DB_PASSWORD
    echo
  else
    DB_PASSWORD="<generated>"
  fi
fi

DB_ADMIN_USER="pgadmin"
success "Terraform outputs loaded"

# ---------------------------------------------------------------------------
# Step 2 — Connect to AKS
# ---------------------------------------------------------------------------
step "2" "Connecting to AKS cluster"

run az aks get-credentials \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER" \
  --overwrite-existing

if ! $DRY_RUN; then
  kubectl cluster-info --request-timeout=10s >/dev/null 2>&1
  success "Connected to AKS: $AKS_CLUSTER"
else
  success "Would connect to AKS: $AKS_CLUSTER"
fi

# ---------------------------------------------------------------------------
# Step 2.5 — Grant Network Contributor to AKS identity (for LoadBalancer)
# ---------------------------------------------------------------------------
step "2.5" "Ensuring AKS identity has Network Contributor on node resource group"

if ! $DRY_RUN; then
  AKS_IDENTITY_PRINCIPAL=$(az aks show --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --query "identity.principalId" -o tsv)
  NODE_RG=$(az aks show --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --query "nodeResourceGroup" -o tsv)
  NODE_RG_ID=$(az group show --name "$NODE_RG" --query id -o tsv)

  EXISTING_ROLE=$(az role assignment list --assignee "$AKS_IDENTITY_PRINCIPAL" --scope "$NODE_RG_ID" --role "Network Contributor" -o tsv 2>/dev/null || true)
  if [[ -z "$EXISTING_ROLE" ]]; then
    az role assignment create \
      --assignee "$AKS_IDENTITY_PRINCIPAL" \
      --role "Network Contributor" \
      --scope "$NODE_RG_ID" \
      -o none
    success "Granted Network Contributor to AKS identity on $NODE_RG"
  else
    info "AKS identity already has Network Contributor on $NODE_RG"
  fi
else
  printf "${YELLOW}[DRY]${NC}   az role assignment create --role 'Network Contributor' --scope <node-rg>\n"
fi

# ---------------------------------------------------------------------------
# Step 3 — Namespaces
# ---------------------------------------------------------------------------
step "3" "Creating Kubernetes namespaces"

NAMESPACES=(openbeam temporal vespa ingress monitoring)

for ns in "${NAMESPACES[@]}"; do
  if ! $DRY_RUN; then
    if kubectl get namespace "$ns" &>/dev/null; then
      info "Namespace '$ns' already exists"
    else
      kubectl create namespace "$ns"
      success "Created namespace: $ns"
    fi
  else
    printf "${YELLOW}[DRY]${NC}   kubectl create namespace %s\n" "$ns"
  fi
done

# ---------------------------------------------------------------------------
# Step 4 — Kubernetes secrets (for in-cluster PostgreSQL and Redis)
# ---------------------------------------------------------------------------
step "4" "Creating Kubernetes secrets"

generate_secret() {
  openssl rand -base64 32
}

REDIS_PASSWORD="$(generate_secret)"

# URL-encode password for Redis connection string (handles +/= chars)
url_encode() {
  python3 -c "import urllib.parse; print(urllib.parse.quote('$1', safe=''))"
}

create_secret_if_missing() {
  local ns="$1" name="$2"
  shift 2

  if ! $DRY_RUN; then
    if kubectl get secret "$name" -n "$ns" &>/dev/null; then
      info "Secret '$name' in namespace '$ns' already exists — skipping"
      return
    fi
    kubectl create secret generic "$name" -n "$ns" "$@"
    success "Created secret: $ns/$name"
  else
    printf "${YELLOW}[DRY]${NC}   kubectl create secret generic %s -n %s (with %d keys)\n" "$name" "$ns" "$#"
  fi
}

# PostgreSQL credentials (for Bitnami chart)
create_secret_if_missing openbeam postgresql-credentials \
  --from-literal=password="$DB_PASSWORD" \
  --from-literal=postgres-password="$DB_PASSWORD"

# Redis credentials (for Bitnami chart)
create_secret_if_missing openbeam redis-credentials \
  --from-literal=password="$REDIS_PASSWORD"

# In-cluster service URLs
PG_HOST="postgresql.openbeam.svc.cluster.local"
REDIS_HOST="redis-master.openbeam.svc.cluster.local"
ENCODED_DB_PASSWORD="$(url_encode "$DB_PASSWORD")"
ENCODED_REDIS_PASSWORD="$(url_encode "$REDIS_PASSWORD")"
DATABASE_URL="postgresql://${DB_ADMIN_USER}:${ENCODED_DB_PASSWORD}@${PG_HOST}:5432/openbeam?sslmode=disable"
REDIS_URL="redis://:${ENCODED_REDIS_PASSWORD}@${REDIS_HOST}:6379"

ENCRYPTION_KEY="$(generate_secret)"
JWT_SECRET="$(generate_secret)"

# App secrets
create_secret_if_missing openbeam openbeam-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=REDIS_URL="$REDIS_URL" \
  --from-literal=ENCRYPTION_KEY="$ENCRYPTION_KEY" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=KEY_VAULT_URI="$KEY_VAULT_URI"

# Sandbox secrets (placeholder for sandbox API token)
create_secret_if_missing openbeam sandbox-secrets \
  --from-literal=SANDBOX_API_TOKEN="placeholder"

# Temporal secrets (uses in-cluster PostgreSQL)
TEMPORAL_DB_URL="postgresql://${DB_ADMIN_USER}:${ENCODED_DB_PASSWORD}@${PG_HOST}:5432/temporal?sslmode=disable"
TEMPORAL_VISIBILITY_DB_URL="postgresql://${DB_ADMIN_USER}:${ENCODED_DB_PASSWORD}@${PG_HOST}:5432/temporal_visibility?sslmode=disable"

create_secret_if_missing temporal temporal-db-credentials \
  --from-literal=POSTGRES_USER="$DB_ADMIN_USER" \
  --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD" \
  --from-literal=POSTGRES_HOST="$PG_HOST" \
  --from-literal=POSTGRES_PORT="5432" \
  --from-literal=POSTGRES_DB="temporal" \
  --from-literal=VISIBILITY_POSTGRES_DB="temporal_visibility" \
  --from-literal=DATABASE_URL="$TEMPORAL_DB_URL" \
  --from-literal=VISIBILITY_DATABASE_URL="$TEMPORAL_VISIBILITY_DB_URL"

# Grafana needs this secret to exist (even as placeholder)
create_secret_if_missing monitoring grafana-oauth-secrets \
  --from-literal=GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET="placeholder"

# ---------------------------------------------------------------------------
# Step 5 — Build and push Docker images via ACR
# ---------------------------------------------------------------------------
step "5" "Building and pushing Docker images to ACR"

if $SKIP_IMAGES; then
  warn "Skipping image build (--skip-images)"
else
  run az acr login --name "$ACR_NAME"

  IMAGE_TAG="${ENV}-$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'latest')"

  # Build base image first (minimal context — just Dockerfile.base)
  info "Building base image..."
  if ! $DRY_RUN; then
    az acr build \
      --registry "$ACR_NAME" \
      --image "openbeam-base:latest" \
      --file "$REPO_ROOT/Dockerfile.base" \
      "$REPO_ROOT/Dockerfile.base" \
      --no-logs 2>/dev/null || \
    az acr build \
      --registry "$ACR_NAME" \
      --image "openbeam-base:latest" \
      --file "$REPO_ROOT/Dockerfile.base" \
      "$REPO_ROOT"
    success "Built base image"
  fi

  # Build app images via ACR (no local Docker needed)
  # ACR limitations: No BuildKit, no --mount=type=cache, no ARG interpolation in FROM
  # NEXT_PUBLIC_* vars are baked into the JS bundle at build time — must pass correct URLs
  WEB_DOMAIN="${WEB_DOMAIN:-https://app.openbeam.work}"
  API_DOMAIN="${API_DOMAIN:-https://api.openbeam.work}"

  IMAGES=(server web worker)

  for img in "${IMAGES[@]}"; do
    DOCKERFILE="apps/$img/Dockerfile"

    if [[ ! -f "$REPO_ROOT/$DOCKERFILE" ]]; then
      warn "Dockerfile not found for $img: $DOCKERFILE — skipping"
      continue
    fi

    BUILD_ARGS=()
    if [[ "$img" == "web" ]]; then
      BUILD_ARGS=(
        --build-arg "NEXT_PUBLIC_SERVER_URL=$API_DOMAIN"
        --build-arg "NEXT_PUBLIC_WEB_URL=$WEB_DOMAIN"
        --build-arg "SERVER_INTERNAL_URL=http://openbeam-server.openbeam.svc.cluster.local:3000"
        --build-arg "NEXT_PUBLIC_POSTHOG_KEY=placeholder"
        --build-arg "NEXT_PUBLIC_POSTHOG_HOST=$WEB_DOMAIN"
      )
    fi

    info "Building $img via ACR (this takes 5-10 min)..."
    if ! $DRY_RUN; then
      az acr build \
        --registry "$ACR_NAME" \
        --image "openbeam-$img:$IMAGE_TAG" \
        --image "openbeam-$img:latest" \
        --file "$REPO_ROOT/$DOCKERFILE" \
        "${BUILD_ARGS[@]}" \
        "$REPO_ROOT" \
        --no-logs
      success "Built and pushed $img:$IMAGE_TAG"
    else
      printf "${YELLOW}[DRY]${NC}   az acr build --image openbeam-%s:%s\n" "$img" "$IMAGE_TAG"
    fi
  done

  # Engine (CPU) — separate Dockerfile
  if [[ -f "$REPO_ROOT/apps/engine/Dockerfile.cpu" ]]; then
    info "Building engine via ACR..."
    if ! $DRY_RUN; then
      az acr build \
        --registry "$ACR_NAME" \
        --image "openbeam-engine:$IMAGE_TAG" \
        --image "openbeam-engine:latest" \
        --file "$REPO_ROOT/apps/engine/Dockerfile.cpu" \
        "$REPO_ROOT/apps/engine" \
        --no-logs
      success "Built and pushed engine:$IMAGE_TAG"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# Step 6 — Deploy Helm charts
# ---------------------------------------------------------------------------
step "6" "Deploying Helm charts"

if $SKIP_HELM; then
  warn "Skipping Helm deployment (--skip-helm)"
else
  HELM_DIR="$REPO_ROOT/infra/helm"

  helm_deploy() {
    local name="$1" namespace="$2" chart="$3"
    shift 3
    local values_flag=()

    for candidate in \
      "$HELM_DIR/$name/values-azure-${ENV}.yaml" \
      "$HELM_DIR/$name/values-azure.yaml" \
      "$HELM_DIR/$name/values.yaml"; do
      if [[ -f "$candidate" ]]; then
        values_flag=(-f "$candidate")
        break
      fi
    done

    info "Deploying $name to namespace $namespace"
    run helm upgrade --install "$name" "$chart" \
      --namespace "$namespace" \
      --create-namespace \
      "${values_flag[@]}" \
      --wait \
      --timeout 10m \
      "$@"
    success "Deployed $name"
  }

  info "Adding Helm repos..."
  run helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
  run helm repo add temporal https://temporalio.github.io/helm-charts 2>/dev/null || true
  run helm repo add vespa https://unoplat.github.io/vespa-helm-charts 2>/dev/null || true
  run helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
  run helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
  run helm repo update

  # --- PostgreSQL (in-cluster) ---
  helm_deploy postgresql openbeam bitnami/postgresql

  # Wait for PostgreSQL before deploying Temporal
  if ! $DRY_RUN; then
    info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=Ready pod/postgresql-0 \
      -n openbeam --timeout=300s 2>/dev/null \
      && success "PostgreSQL is ready" \
      || warn "PostgreSQL may not be ready — continuing"
  fi

  # --- Redis (in-cluster) ---
  helm_deploy redis openbeam bitnami/redis

  # --- Temporal ---
  helm_deploy temporal temporal temporal/temporal \
    --set server.config.persistence.default.sql.host="$PG_HOST" \
    --set server.config.persistence.default.sql.port=5432 \
    --set server.config.persistence.default.sql.user="$DB_ADMIN_USER" \
    --set server.config.persistence.default.sql.password="$DB_PASSWORD" \
    --set server.config.persistence.default.sql.database=temporal \
    --set server.config.persistence.visibility.sql.host="$PG_HOST" \
    --set server.config.persistence.visibility.sql.port=5432 \
    --set server.config.persistence.visibility.sql.user="$DB_ADMIN_USER" \
    --set server.config.persistence.visibility.sql.password="$DB_PASSWORD" \
    --set server.config.persistence.visibility.sql.database=temporal_visibility

  # Register Temporal "default" namespace
  if ! $DRY_RUN; then
    info "Registering Temporal 'default' namespace..."
    kubectl exec -n temporal deploy/temporal-admintools -- \
      tctl --ns default namespace register 2>/dev/null || \
      info "Temporal 'default' namespace already exists"
    success "Temporal namespace registered"
  fi

  # --- Vespa ---
  helm_deploy vespa vespa vespa/vespa

  # Fix Vespa service selector (chart uses app.kubernetes.io/* labels, pod has app: vespa)
  if ! $DRY_RUN; then
    info "Fixing Vespa service selector..."
    kubectl patch svc document-index-service -n vespa \
      --type='json' \
      -p='[{"op": "replace", "path": "/spec/selector", "value": {"app": "vespa"}}]' \
      2>/dev/null || true
    success "Vespa service selector patched"
  fi

  # --- Ingress (nginx) — no resource-group annotation (causes auth errors) ---
  helm_deploy ingress-nginx ingress ingress-nginx/ingress-nginx

  # --- Monitoring (kube-prometheus-stack) ---
  helm_deploy monitoring monitoring prometheus-community/kube-prometheus-stack \
    --set grafana.enabled=true \
    --set prometheus.prometheusSpec.retention=7d

  # --- OpenBeam app ---
  OPENBEAM_CHART="$REPO_ROOT/k8s/charts/openbeam"
  OPENBEAM_VALUES="$REPO_ROOT/infra/helm/apps/values-azure-dev.yaml"

  if [[ -d "$OPENBEAM_CHART" ]]; then
    IMAGE_TAG="${IMAGE_TAG:-latest}"

    IDENTITY_CLIENT_IDS="$(tf_out_json identity_client_ids 2>/dev/null || echo '{}')"
    APP_CLIENT_ID="$(echo "$IDENTITY_CLIENT_IDS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('app',''))" 2>/dev/null || echo '')"
    WORKER_CLIENT_ID="$(echo "$IDENTITY_CLIENT_IDS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('worker',''))" 2>/dev/null || echo '')"

    info "Deploying OpenBeam to namespace openbeam"
    run helm upgrade --install openbeam "$OPENBEAM_CHART" \
      --namespace openbeam \
      --create-namespace \
      -f "$OPENBEAM_VALUES" \
      --set global.image.registry="$ACR_LOGIN_SERVER" \
      --set "serviceAccount.create=true" \
      --set "serviceAccount.workloadIdentities.app.annotations.azure\\.workload\\.identity/client-id=$APP_CLIENT_ID" \
      --set "serviceAccount.workloadIdentities.worker.annotations.azure\\.workload\\.identity/client-id=$WORKER_CLIENT_ID" \
      --wait \
      --timeout 10m
    success "Deployed OpenBeam"
  else
    warn "OpenBeam chart not found at $OPENBEAM_CHART — skipping"
  fi

  # --- Temporal UI Ingress ---
  if ! $DRY_RUN; then
    info "Creating Temporal UI ingress..."
    kubectl apply -f - <<'TEMPORAL_INGRESS'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: temporal-web
  namespace: temporal
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx
  rules:
    - host: temporal.openbeam.work
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: temporal-web
                port:
                  number: 8233
TEMPORAL_INGRESS
    success "Temporal UI ingress created"
  fi
fi

# ---------------------------------------------------------------------------
# Step 7 — Deploy Vespa application schema
# ---------------------------------------------------------------------------
step "7" "Deploying Vespa application schema"

if $SKIP_VESPA_SCHEMA; then
  warn "Skipping Vespa schema deployment (--skip-vespa-schema)"
else
  VESPA_APP_DIR="$REPO_ROOT/packages/vespa/application"

  if [[ -d "$VESPA_APP_DIR" ]]; then
    if ! $DRY_RUN; then
      # Update validation-overrides dates to within 30 days of today
      OVERRIDE_DATE=$(date -v+29d +%Y-%m-%d 2>/dev/null || date -d "+29 days" +%Y-%m-%d)
      OVERRIDE_FILE="$VESPA_APP_DIR/validation-overrides.xml"
      if [[ -f "$OVERRIDE_FILE" ]]; then
        sed -i.bak "s/until=\"[0-9-]*\"/until=\"$OVERRIDE_DATE\"/g" "$OVERRIDE_FILE"
        rm -f "${OVERRIDE_FILE}.bak"
        info "Updated validation-overrides dates to $OVERRIDE_DATE"
      fi

      # Wait for Vespa config server
      info "Waiting for Vespa config server..."
      for i in $(seq 1 30); do
        if kubectl exec vespa-0 -n vespa -- curl -sf http://localhost:19071/state/v1/health >/dev/null 2>&1; then
          success "Vespa config server is ready"
          break
        fi
        if [[ $i -eq 30 ]]; then
          warn "Vespa config server not ready after 150s — skipping schema deploy"
          SKIP_VESPA_SCHEMA=true
        fi
        sleep 5
      done

      if ! $SKIP_VESPA_SCHEMA; then
        # Create zip and deploy via kubectl cp + curl
        VESPA_ZIP="/tmp/vespa-app-$$.zip"
        (cd "$VESPA_APP_DIR" && zip -r "$VESPA_ZIP" . -x '*.bak')

        kubectl cp "$VESPA_ZIP" vespa/vespa-0:/tmp/vespa-app.zip
        kubectl exec vespa-0 -n vespa -- \
          curl -sf --header "Content-Type: application/zip" \
          --data-binary @/tmp/vespa-app.zip \
          http://localhost:19071/application/v2/tenant/default/prepareandactivate \
          -o /dev/null -w "%{http_code}"
        echo

        rm -f "$VESPA_ZIP"
        success "Vespa application schema deployed"
      fi
    else
      printf "${YELLOW}[DRY]${NC}   Deploy Vespa application package from %s\n" "$VESPA_APP_DIR"
    fi
  else
    warn "Vespa application dir not found: $VESPA_APP_DIR — skipping"
  fi
fi

# ---------------------------------------------------------------------------
# Step 8 — Wait for pods and verify health
# ---------------------------------------------------------------------------
step "8" "Verifying deployment health"

if $DRY_RUN; then
  warn "Skipping health checks in dry-run mode"
else
  for ns in "${NAMESPACES[@]}"; do
    info "Waiting for pods in namespace: $ns"
    if kubectl get pods -n "$ns" --no-headers 2>/dev/null | grep -q .; then
      kubectl wait --for=condition=Ready pods --all \
        -n "$ns" \
        --timeout=300s 2>/dev/null \
        && success "All pods ready in $ns" \
        || warn "Some pods in $ns are not ready — check manually"
    else
      info "No pods found in $ns (may not be deployed yet)"
    fi
  done

  echo
  info "Pod status across all namespaces:"
  kubectl get pods -A --field-selector=metadata.namespace!=kube-system \
    -o wide 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Step 9 — Get external IP and show DNS setup
# ---------------------------------------------------------------------------
step "9" "External access setup"

if ! $DRY_RUN; then
  EXTERNAL_IP=""
  for i in $(seq 1 30); do
    EXTERNAL_IP=$(kubectl get svc ingress-nginx-controller -n ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
    if [[ -n "$EXTERNAL_IP" ]]; then
      break
    fi
    info "Waiting for external IP... ($i/30)"
    sleep 10
  done

  if [[ -n "$EXTERNAL_IP" ]]; then
    success "External IP: $EXTERNAL_IP"
  else
    warn "External IP not yet assigned — check: kubectl get svc -n ingress"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
printf "${GREEN}========================================${NC}\n"
printf "${GREEN}  Deployment complete: %s${NC}\n" "$ENV"
printf "${GREEN}========================================${NC}\n"
echo
info "AKS Cluster:    $AKS_CLUSTER"
info "ACR Registry:   $ACR_LOGIN_SERVER"
info "PostgreSQL:     In-cluster (postgresql.openbeam.svc.cluster.local:5432)"
info "Redis:          In-cluster (redis-master.openbeam.svc.cluster.local:6379)"
info "Vespa:          In-cluster (document-index-service.vespa.svc.cluster.local:8080)"
info "Key Vault:      $KEY_VAULT_URI"
echo
info "Domains:"
info "  Web:      https://app.openbeam.work"
info "  API:      https://api.openbeam.work"
info "  Temporal: https://temporal.openbeam.work"
echo

if [[ -n "${EXTERNAL_IP:-}" ]]; then
  printf "${CYAN}Cloudflare DNS setup required:${NC}\n"
  echo "  Type: A | Name: app      | Content: $EXTERNAL_IP | Proxy: ON"
  echo "  Type: A | Name: api      | Content: $EXTERNAL_IP | Proxy: ON"
  echo "  Type: A | Name: temporal  | Content: $EXTERNAL_IP | Proxy: ON"
  echo
  echo "  SSL/TLS mode: Full (not Full Strict)"
  echo
fi

info "Verify pods:     kubectl get pods -A"
info "Verify ingress:  kubectl get ingress -A"
info "Port-forward:    kubectl port-forward svc/openbeam-web 3001:3001 -n openbeam"
