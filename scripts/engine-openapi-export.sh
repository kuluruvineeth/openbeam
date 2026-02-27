#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENGINE_DIR="${ROOT_DIR}/apps/engine"
OUTPUT_FILE="${ROOT_DIR}/packages/types/src/services/engine/openapi.json"

mkdir -p "$(dirname "${OUTPUT_FILE}")"

echo "Exporting OpenAPI spec from engine..."

cd "${ENGINE_DIR}"
uv run python -c "
from engine.cpu_service.main import create_app
import json
import sys

app = create_app()
schema = app.openapi()
json.dump(schema, sys.stdout, indent=2)
print()
" > "${OUTPUT_FILE}"

echo "Wrote ${OUTPUT_FILE}"
shasum -a 256 "${OUTPUT_FILE}" | awk '{print $1}'
