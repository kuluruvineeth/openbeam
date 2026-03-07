#!/usr/bin/env bash
set -euo pipefail

HOST="${OPENBEAM_HOST:-http://localhost:3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/internal/openapi"
OUTPUT_FILE="${OUTPUT_DIR}/openbeam.openapi.json"
TMP_FILE="${OUTPUT_FILE}.tmp"

mkdir -p "${OUTPUT_DIR}"
curl -fsSL "${HOST}/doc" > "${TMP_FILE}"
mv "${TMP_FILE}" "${OUTPUT_FILE}"
shasum -a 256 "${OUTPUT_FILE}" | awk '{print $1}' > "${OUTPUT_FILE}.sha256"
echo "wrote ${OUTPUT_FILE}"
