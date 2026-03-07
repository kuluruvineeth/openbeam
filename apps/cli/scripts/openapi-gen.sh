#!/usr/bin/env bash
set -euo pipefail

HOST="${OPENBEAM_HOST:-http://localhost:3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/internal/openapi"
SPEC_FILE="${OUTPUT_DIR}/openbeam.openapi.json"

mkdir -p "${OUTPUT_DIR}"

echo "Step 1: Fetching OpenAPI spec from ${HOST}/doc..."
TMP_FILE=$(mktemp)
curl -fsSL "${HOST}/doc" > "${TMP_FILE}"
mv "${TMP_FILE}" "${SPEC_FILE}"
shasum -a 256 "${SPEC_FILE}" | awk '{print $1}' > "${SPEC_FILE}.sha256"
echo "  Wrote ${SPEC_FILE}"

echo ""
echo "Step 2: Generating Go types from OpenAPI spec..."

if ! command -v oapi-codegen > /dev/null 2>&1; then
    echo "  oapi-codegen not found. Installing..."
    go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
fi

GENERATED_DIR="${OUTPUT_DIR}/generated"
mkdir -p "${GENERATED_DIR}"

oapi-codegen \
    -generate "types" \
    -package "generated" \
    -o "${GENERATED_DIR}/types.gen.go" \
    "${SPEC_FILE}"

echo "  Wrote ${GENERATED_DIR}/types.gen.go"

echo ""
echo "Step 3: Formatting generated Go code..."
gofmt -w "${GENERATED_DIR}/types.gen.go"

echo ""
echo "Done. Generated Go types in ${GENERATED_DIR}/"
