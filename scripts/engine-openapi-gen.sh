#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Step 1: Exporting OpenAPI spec from engine..."
"${SCRIPT_DIR}/engine-openapi-export.sh"

echo ""
echo "Step 2: Generating TypeScript client..."
cd "${ROOT_DIR}"
bun x @hey-api/openapi-ts

echo ""
echo "Step 3: Formatting generated code..."
bun x biome check --write packages/services/src/engine/generated/ 2>/dev/null || true

echo ""
echo "Done. Generated client in packages/services/src/engine/generated/"
