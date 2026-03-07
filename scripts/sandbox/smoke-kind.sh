#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${SANDBOX_NAMESPACE:-openbeam-sandbox}"
RELEASE_NAME="${SANDBOX_HELM_RELEASE:-sandbox-gateway}"
SERVICE_NAME="${SANDBOX_SERVICE_NAME:-}"
LOCAL_PORT="${SANDBOX_LOCAL_PORT:-3800}"
PRIMARY_TEAM_ID="${SANDBOX_TEAM_ID:-team-smoke}"
SECONDARY_TEAM_ID="${SANDBOX_SECONDARY_TEAM_ID:-team-smoke-secondary}"
TOKEN="${SANDBOX_API_TOKEN:-dev-sandbox-token}"
PROVIDER="${SANDBOX_TEST_PROVIDER:-${SANDBOX_DEFAULT_PROVIDER:-daytona}}"
ASSERT_TENANT_AUTHZ="${SANDBOX_SMOKE_ASSERT_AUTHZ:-true}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required"
    exit 1
  fi
}

require_command kubectl
require_command curl
require_command jq

if [[ -z "${SERVICE_NAME}" ]]; then
  SERVICE_NAME="$(kubectl get service \
    -n "${NAMESPACE}" \
    -l "app.kubernetes.io/instance=${RELEASE_NAME}" \
    -o jsonpath='{.items[0].metadata.name}' || true)"
fi

if [[ -z "${SERVICE_NAME}" ]]; then
  echo "Unable to resolve sandbox gateway service name"
  exit 1
fi

PORT_FORWARD_LOG="$(mktemp "${TMPDIR:-/tmp}/openbeam-sandbox-portforward.XXXXXX")"
AUTHZ_BODY_FILE="$(mktemp "${TMPDIR:-/tmp}/openbeam-sandbox-authz.XXXXXX")"

kubectl -n "${NAMESPACE}" port-forward "service/${SERVICE_NAME}" "${LOCAL_PORT}:80" >"${PORT_FORWARD_LOG}" 2>&1 &
PORT_FORWARD_PID=$!
trap 'kill "${PORT_FORWARD_PID}" >/dev/null 2>&1 || true; rm -f "${PORT_FORWARD_LOG}" "${AUTHZ_BODY_FILE}"' EXIT
sleep 2

API_BASE_URL="http://127.0.0.1:${LOCAL_PORT}"
PRIMARY_AUTH_HEADERS=(
  -H "authorization: Bearer ${TOKEN}"
  -H "x-openbeam-team-id: ${PRIMARY_TEAM_ID}"
  -H "content-type: application/json"
)
SECONDARY_AUTH_HEADERS=(
  -H "authorization: Bearer ${TOKEN}"
  -H "x-openbeam-team-id: ${SECONDARY_TEAM_ID}"
  -H "content-type: application/json"
)

curl -sSf "${API_BASE_URL}/health" >/dev/null

CREATE_RESPONSE="$(curl -sSf "${API_BASE_URL}/sandboxes" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  -d "{\"provider\":\"${PROVIDER}\",\"template\":\"base\",\"timeout\":300000,\"cpuCores\":1,\"memoryMb\":512,\"diskMb\":1024,\"internetAccess\":false}" || true)"

SANDBOX_ID="$(echo "${CREATE_RESPONSE}" | jq -r '.id')"
if [[ -z "${SANDBOX_ID}" || "${SANDBOX_ID}" == "null" ]]; then
  echo "Failed to create sandbox"
  echo "${CREATE_RESPONSE}"
  exit 1
fi

RUN_RESPONSE="$(curl -sSf "${API_BASE_URL}/${SANDBOX_ID}/exec/run?provider=${PROVIDER}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  -d '{"command":"echo openbeam-smoke"}' || true)"
echo "${RUN_RESPONSE}" | jq -e '.exitCode == 0' >/dev/null
echo "${RUN_RESPONSE}" | jq -e '.stdout | contains("openbeam-smoke")' >/dev/null

curl -sSf "${API_BASE_URL}/${SANDBOX_ID}/files/write?provider=${PROVIDER}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  -d '{"path":"notes.txt","content":"sandbox-ok"}' >/dev/null

READ_RESPONSE="$(curl -sSf "${API_BASE_URL}/${SANDBOX_ID}/files/read?provider=${PROVIDER}" \
  "${PRIMARY_AUTH_HEADERS[@]}" \
  -d '{"path":"notes.txt"}' || true)"
echo "${READ_RESPONSE}" | jq -e '.content == "sandbox-ok"' >/dev/null

  if [[ "${ASSERT_TENANT_AUTHZ}" == "true" ]]; then
  SECONDARY_LIST="$(curl -sSf "${API_BASE_URL}/sandboxes?provider=${PROVIDER}" \
    "${SECONDARY_AUTH_HEADERS[@]}" || true)"
  echo "${SECONDARY_LIST}" | jq -e --arg sandboxId "${SANDBOX_ID}" '(.sandboxes // []) | all(.[]; .id != $sandboxId)' >/dev/null

  SECONDARY_EXEC_STATUS="$(curl -sS -o "${AUTHZ_BODY_FILE}" -w '%{http_code}' \
    "${API_BASE_URL}/${SANDBOX_ID}/exec/run?provider=${PROVIDER}" \
    "${SECONDARY_AUTH_HEADERS[@]}" \
    -d '{"command":"echo should-not-run"}')"

  if [[ "${SECONDARY_EXEC_STATUS}" != "404" ]]; then
    echo "Expected cross-tenant exec denial (404), got ${SECONDARY_EXEC_STATUS}"
    cat "${AUTHZ_BODY_FILE}"
    exit 1
  fi

  jq -e '(.error // .code) == "SANDBOX_NOT_FOUND"' "${AUTHZ_BODY_FILE}" >/dev/null

  SECONDARY_DELETE_STATUS="$(curl -sS -o "${AUTHZ_BODY_FILE}" -w '%{http_code}' -X DELETE \
    "${API_BASE_URL}/sandboxes/${SANDBOX_ID}?provider=${PROVIDER}" \
    -H "authorization: Bearer ${TOKEN}" \
    -H "x-openbeam-team-id: ${SECONDARY_TEAM_ID}")"

  if [[ "${SECONDARY_DELETE_STATUS}" != "404" ]]; then
    echo "Expected cross-tenant delete denial (404), got ${SECONDARY_DELETE_STATUS}"
    cat "${AUTHZ_BODY_FILE}"
    exit 1
  fi

  jq -e '(.error // .code) == "SANDBOX_NOT_FOUND"' "${AUTHZ_BODY_FILE}" >/dev/null
fi

curl -sSf -X DELETE "${API_BASE_URL}/sandboxes/${SANDBOX_ID}?provider=${PROVIDER}" \
  -H "authorization: Bearer ${TOKEN}" \
  -H "x-openbeam-team-id: ${PRIMARY_TEAM_ID}" >/dev/null

echo "Sandbox API smoke passed for sandbox ${SANDBOX_ID} (provider=${PROVIDER}, tenant-authz=${ASSERT_TENANT_AUTHZ})"
