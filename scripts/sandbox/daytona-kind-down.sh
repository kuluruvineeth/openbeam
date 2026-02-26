#!/usr/bin/env bash
set -euo pipefail

DAYTONA_NAMESPACE="${DAYTONA_NAMESPACE:-daytona}"
DAYTONA_RELEASE="${DAYTONA_HELM_RELEASE:-daytona}"

if ! command -v helm >/dev/null 2>&1; then
  echo "helm is required"
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required"
  exit 1
fi

if helm status "${DAYTONA_RELEASE}" -n "${DAYTONA_NAMESPACE}" >/dev/null 2>&1; then
  helm uninstall "${DAYTONA_RELEASE}" -n "${DAYTONA_NAMESPACE}"
fi

echo "Daytona release '${DAYTONA_RELEASE}' removed from namespace '${DAYTONA_NAMESPACE}'."
