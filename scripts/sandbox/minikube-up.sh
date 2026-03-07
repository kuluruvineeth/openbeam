#!/usr/bin/env bash
set -euo pipefail

PROFILE="${MINIKUBE_PROFILE:-openbeam-sandbox}"
NAMESPACE="${SANDBOX_NAMESPACE:-openbeam-sandbox}"
RELEASE_NAME="${SANDBOX_HELM_RELEASE:-sandbox-gateway}"
IMAGE="${SANDBOX_GATEWAY_IMAGE:-openbeam/sandbox-gateway:local}"
TOKEN="${SANDBOX_API_TOKEN:-dev-sandbox-token}"
PROVIDER="${SANDBOX_DEFAULT_PROVIDER:-daytona}"
HELM_DAYTONA_API_KEY="${SANDBOX_DAYTONA_API_KEY:-${DAYTONA_API_KEY:-}}"
HELM_DAYTONA_API_URL="${SANDBOX_DAYTONA_API_URL:-${DAYTONA_API_URL:-}}"
HELM_DAYTONA_TARGET="${SANDBOX_DAYTONA_TARGET:-${DAYTONA_TARGET:-}}"
HELM_DAYTONA_JWT_TOKEN="${SANDBOX_DAYTONA_JWT_TOKEN:-${DAYTONA_JWT_TOKEN:-}}"
HELM_DAYTONA_ORGANIZATION_ID="${SANDBOX_DAYTONA_ORGANIZATION_ID:-${DAYTONA_ORGANIZATION_ID:-}}"
HELM_DAYTONA_WORKDIR="${SANDBOX_DAYTONA_WORKDIR:-${DAYTONA_WORKDIR:-}}"
HELM_DAYTONA_TEAM_PREFIX="${SANDBOX_DAYTONA_TEAM_PREFIX:-${DAYTONA_TEAM_PREFIX:-op}}"
HELM_SANDBOX_REDIS_URL="${SANDBOX_REDIS_URL:-${REDIS_URL:-}}"
HELM_SANDBOX_RATE_LIMIT_STORE="${SANDBOX_RATE_LIMIT_STORE:-}"
HELM_SANDBOX_RATE_LIMIT_KEY_PREFIX="${SANDBOX_RATE_LIMIT_KEY_PREFIX:-}"
HELM_SANDBOX_OWNERSHIP_STORE="${SANDBOX_OWNERSHIP_STORE:-}"
HELM_SANDBOX_OWNERSHIP_KEY_PREFIX="${SANDBOX_OWNERSHIP_KEY_PREFIX:-}"
HELM_SANDBOX_OWNERSHIP_TTL_MS="${SANDBOX_OWNERSHIP_TTL_MS:-}"

if ! command -v minikube >/dev/null 2>&1; then
  echo "minikube is required"
  exit 1
fi
if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required"
  exit 1
fi
if ! command -v helm >/dev/null 2>&1; then
  echo "helm is required"
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required"
  exit 1
fi

if [[ "${PROVIDER}" != "daytona" && "${PROVIDER}" != "local" ]]; then
  echo "SANDBOX_DEFAULT_PROVIDER must be 'daytona' or 'local'"
  exit 1
fi

if [[ "${PROVIDER}" == "daytona" ]]; then
  if [[ -z "${HELM_DAYTONA_API_KEY}" ]]; then
    if [[ -z "${HELM_DAYTONA_JWT_TOKEN}" || -z "${HELM_DAYTONA_ORGANIZATION_ID}" ]]; then
      echo "SANDBOX_DAYTONA_API_KEY or SANDBOX_DAYTONA_JWT_TOKEN + SANDBOX_DAYTONA_ORGANIZATION_ID is required for daytona provider"
      exit 1
    fi
  fi
fi

minikube start -p "${PROFILE}"

if [[ "${SKIP_IMAGE_BUILD:-false}" != "true" ]]; then
  docker build -f apps/sandbox-gateway/Dockerfile -t "${IMAGE}" .
fi

minikube image load -p "${PROFILE}" "${IMAGE}"

IMAGE_REPOSITORY="${IMAGE%:*}"
IMAGE_TAG="${IMAGE##*:}"
if [[ "${IMAGE_REPOSITORY}" == "${IMAGE_TAG}" ]]; then
  IMAGE_TAG="latest"
fi

HELM_ARGS=(
  --namespace "${NAMESPACE}"
  --create-namespace
  --set image.repository="${IMAGE_REPOSITORY}"
  --set image.tag="${IMAGE_TAG}"
  --set gateway.defaultProvider="${PROVIDER}"
  --set gateway.token="${TOKEN}"
  --set gateway.requireTeamId=true
)

if [[ -n "${HELM_DAYTONA_API_KEY}" ]]; then
  HELM_ARGS+=(--set gateway.daytona.apiKey="${HELM_DAYTONA_API_KEY}")
fi
if [[ -n "${HELM_DAYTONA_API_URL}" ]]; then
  HELM_ARGS+=(--set gateway.daytona.apiUrl="${HELM_DAYTONA_API_URL}")
fi
if [[ -n "${HELM_DAYTONA_TARGET}" ]]; then
  HELM_ARGS+=(--set gateway.daytona.target="${HELM_DAYTONA_TARGET}")
fi
if [[ -n "${HELM_DAYTONA_JWT_TOKEN}" ]]; then
  HELM_ARGS+=(--set gateway.daytona.jwtToken="${HELM_DAYTONA_JWT_TOKEN}")
fi
if [[ -n "${HELM_DAYTONA_ORGANIZATION_ID}" ]]; then
  HELM_ARGS+=(--set gateway.daytona.organizationId="${HELM_DAYTONA_ORGANIZATION_ID}")
fi
if [[ -n "${HELM_DAYTONA_WORKDIR}" ]]; then
  HELM_ARGS+=(--set gateway.daytona.workspaceDir="${HELM_DAYTONA_WORKDIR}")
fi
if [[ -n "${HELM_DAYTONA_TEAM_PREFIX}" ]]; then
  HELM_ARGS+=(--set gateway.daytona.teamPrefix="${HELM_DAYTONA_TEAM_PREFIX}")
fi
if [[ -n "${HELM_SANDBOX_REDIS_URL}" ]]; then
  HELM_ARGS+=(--set gateway.redis.url="${HELM_SANDBOX_REDIS_URL}")
fi
if [[ -n "${HELM_SANDBOX_RATE_LIMIT_STORE}" ]]; then
  HELM_ARGS+=(--set gateway.rateLimit.store="${HELM_SANDBOX_RATE_LIMIT_STORE}")
fi
if [[ -n "${HELM_SANDBOX_RATE_LIMIT_KEY_PREFIX}" ]]; then
  HELM_ARGS+=(--set gateway.rateLimit.keyPrefix="${HELM_SANDBOX_RATE_LIMIT_KEY_PREFIX}")
fi
if [[ -n "${HELM_SANDBOX_OWNERSHIP_STORE}" ]]; then
  HELM_ARGS+=(--set gateway.ownership.store="${HELM_SANDBOX_OWNERSHIP_STORE}")
fi
if [[ -n "${HELM_SANDBOX_OWNERSHIP_KEY_PREFIX}" ]]; then
  HELM_ARGS+=(--set gateway.ownership.keyPrefix="${HELM_SANDBOX_OWNERSHIP_KEY_PREFIX}")
fi
if [[ -n "${HELM_SANDBOX_OWNERSHIP_TTL_MS}" ]]; then
  HELM_ARGS+=(--set gateway.ownership.ttlMs="${HELM_SANDBOX_OWNERSHIP_TTL_MS}")
fi

helm upgrade --install "${RELEASE_NAME}" packages/sandbox/helm/sandbox-gateway "${HELM_ARGS[@]}"

DEPLOYMENT_NAME="$(
  kubectl get deployment \
    -n "${NAMESPACE}" \
    -l "app.kubernetes.io/instance=${RELEASE_NAME}" \
    -o jsonpath='{.items[0].metadata.name}'
)"

if [[ -z "${DEPLOYMENT_NAME}" ]]; then
  echo "Unable to resolve sandbox gateway deployment name"
  exit 1
fi

kubectl rollout status deployment/"${DEPLOYMENT_NAME}" -n "${NAMESPACE}" --timeout=120s

echo "Sandbox gateway is ready in minikube profile '${PROFILE}'."
