#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="${KIND_CLUSTER_NAME:-openplane-sandbox}"
DAYTONA_NAMESPACE="${DAYTONA_NAMESPACE:-daytona}"
DAYTONA_RELEASE="${DAYTONA_HELM_RELEASE:-daytona}"
DAYTONA_CHART="${DAYTONA_HELM_CHART:-daytonaio/daytona}"
DAYTONA_VALUES_FILE="${DAYTONA_VALUES_FILE:-k8s/infra/daytona/values.kind.yaml}"
DAYTONA_HELM_TIMEOUT="${DAYTONA_HELM_TIMEOUT:-20m}"
DAYTONA_ROLLOUT_TIMEOUT="${DAYTONA_ROLLOUT_TIMEOUT:-900s}"
DAYTONA_BOOTSTRAP_KEY_NAME="${DAYTONA_BOOTSTRAP_KEY_NAME:-openplane-sandbox-gateway}"
DAYTONA_CREDENTIAL_SECRET_NAME="${DAYTONA_CREDENTIAL_SECRET_NAME:-daytona-openplane}"
DAYTONA_CREDENTIAL_SECRET_KEY="${DAYTONA_CREDENTIAL_SECRET_KEY:-DAYTONA_API_KEY}"
DAYTONA_ENV_FILE="${DAYTONA_ENV_FILE:-}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required"
    exit 1
  fi
}

ensure_helm_repo() {
  local name="$1"
  local url="$2"

  if helm repo list | awk 'NR > 1 {print $1}' | grep -qx "$name"; then
    return
  fi

  helm repo add "$name" "$url" >/dev/null
}

wait_for_deployment() {
  local namespace="$1"
  local name="$2"

  if kubectl get deployment "$name" -n "$namespace" >/dev/null 2>&1; then
    kubectl rollout status deployment/"$name" -n "$namespace" --timeout="${DAYTONA_ROLLOUT_TIMEOUT}"
  fi
}

wait_for_daemonset() {
  local namespace="$1"
  local name="$2"

  if kubectl get daemonset "$name" -n "$namespace" >/dev/null 2>&1; then
    kubectl rollout status daemonset/"$name" -n "$namespace" --timeout="${DAYTONA_ROLLOUT_TIMEOUT}"
  fi
}

require_command kind
require_command kubectl
require_command helm

if [[ ! -f "${DAYTONA_VALUES_FILE}" ]]; then
  echo "Daytona values file not found: ${DAYTONA_VALUES_FILE}"
  exit 1
fi

if ! kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  kind create cluster --name "${CLUSTER_NAME}"
fi

KIND_CONTEXT="kind-${CLUSTER_NAME}"
if ! kubectl config get-contexts "${KIND_CONTEXT}" >/dev/null 2>&1; then
  echo "Unable to find kubectl context: ${KIND_CONTEXT}"
  exit 1
fi
kubectl config use-context "${KIND_CONTEXT}" >/dev/null

kubectl taint nodes --all node-role.kubernetes.io/control-plane- >/dev/null 2>&1 || true
kubectl taint nodes --all node-role.kubernetes.io/master- >/dev/null 2>&1 || true

while IFS= read -r node; do
  kubectl label node "$node" daytona-sandbox-c=true --overwrite >/dev/null
  kubectl label node "$node" openplane.daytona=true --overwrite >/dev/null
  kubectl annotate node "$node" openplane.daytona/bootstrap=enabled --overwrite >/dev/null
done < <(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

ensure_helm_repo daytonaio https://charts.daytona.io
helm repo update daytonaio >/dev/null

DAYTONA_API_URL="http://${DAYTONA_RELEASE}-api.${DAYTONA_NAMESPACE}.svc.cluster.local:3000/api"
DAYTONA_API_ORIGIN="${DAYTONA_API_URL%/api}"
DAYTONA_HARBOR_URL="http://${DAYTONA_RELEASE}-harbor-core.${DAYTONA_NAMESPACE}.svc.cluster.local"

helm upgrade --install "${DAYTONA_RELEASE}" "${DAYTONA_CHART}" \
  --namespace "${DAYTONA_NAMESPACE}" \
  --create-namespace \
  --wait \
  --timeout "${DAYTONA_HELM_TIMEOUT}" \
  -f "${DAYTONA_VALUES_FILE}" \
  --set-string harbor.externalURL="${DAYTONA_HARBOR_URL}" \
  --set-string services.api.env.DASHBOARD_BASE_API_URL="${DAYTONA_API_ORIGIN}" \
  --set-string services.api.env.DASHBOARD_URL="${DAYTONA_API_ORIGIN}/dashboard" \
  --set-string services.runnermanager.env.SERVER_URL="${DAYTONA_API_URL}" \
  --set-string services.runner.env.DAYTONA_API_URL="${DAYTONA_API_URL}" \
  --set-string services.runner.env.SERVER_URL="${DAYTONA_API_URL}"

wait_for_deployment "${DAYTONA_NAMESPACE}" "${DAYTONA_RELEASE}-api"
wait_for_deployment "${DAYTONA_NAMESPACE}" "${DAYTONA_RELEASE}-proxy"
wait_for_deployment "${DAYTONA_NAMESPACE}" "${DAYTONA_RELEASE}-runnermanager"
wait_for_daemonset "${DAYTONA_NAMESPACE}" "${DAYTONA_RELEASE}-runner"

API_POD="$(kubectl get pods \
  -n "${DAYTONA_NAMESPACE}" \
  -l "app.kubernetes.io/instance=${DAYTONA_RELEASE},app.kubernetes.io/component=api" \
  -o jsonpath='{.items[0].metadata.name}' || true)"

if [[ -z "${API_POD}" ]]; then
  echo "Unable to find Daytona API pod"
  exit 1
fi

API_KEY_OUTPUT="$(kubectl exec -n "${DAYTONA_NAMESPACE}" "${API_POD}" -- \
  node dist/apps/api/main.js --create-admin-api-key "${DAYTONA_BOOTSTRAP_KEY_NAME}" 2>/dev/null || true)"

DAYTONA_API_KEY="$(printf '%s\n' "${API_KEY_OUTPUT}" | grep -Eo 'dtn_[A-Za-z0-9._-]+' | tail -n 1 || true)"

if [[ -z "${DAYTONA_API_KEY}" ]]; then
  echo "Failed to extract Daytona API key from bootstrap command output"
  echo "Run manually: kubectl exec -n ${DAYTONA_NAMESPACE} ${API_POD} -- node dist/apps/api/main.js --create-admin-api-key ${DAYTONA_BOOTSTRAP_KEY_NAME}"
  exit 1
fi

kubectl create secret generic "${DAYTONA_CREDENTIAL_SECRET_NAME}" \
  -n "${DAYTONA_NAMESPACE}" \
  --from-literal="${DAYTONA_CREDENTIAL_SECRET_KEY}=${DAYTONA_API_KEY}" \
  --dry-run=client -o yaml | kubectl apply -f - >/dev/null

if [[ -n "${DAYTONA_ENV_FILE}" ]]; then
  mkdir -p "$(dirname "${DAYTONA_ENV_FILE}")"
  cat > "${DAYTONA_ENV_FILE}" <<ENV
SANDBOX_DAYTONA_API_URL=${DAYTONA_API_URL}
SANDBOX_DAYTONA_API_KEY=${DAYTONA_API_KEY}
ENV
  chmod 600 "${DAYTONA_ENV_FILE}"
fi

echo "Daytona is installed in kind cluster '${CLUSTER_NAME}'."
echo "Daytona API URL: ${DAYTONA_API_URL}"
echo "Credential secret: ${DAYTONA_NAMESPACE}/${DAYTONA_CREDENTIAL_SECRET_NAME}"
if [[ -n "${DAYTONA_ENV_FILE}" ]]; then
  echo "Wrote sandbox credentials env file: ${DAYTONA_ENV_FILE}"
fi
