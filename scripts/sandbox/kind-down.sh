#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="${KIND_CLUSTER_NAME:-openbeam-sandbox}"

if ! command -v kind >/dev/null 2>&1; then
  echo "kind is required"
  exit 1
fi

if kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  kind delete cluster --name "${CLUSTER_NAME}"
fi

echo "Deleted kind cluster '${CLUSTER_NAME}'."
