#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Contract Validation ==="

echo ""
echo "[1/4] Checking engine OpenAPI spec is up to date..."
cd "${ROOT_DIR}/apps/engine"
TEMP_SPEC=$(mktemp)
ENGINE_SPEC_OK=true

uv run python -c "
from engine.cpu_service.main import create_app
import json
import sys
app = create_app()
spec = app.openapi()
json.dump(spec, sys.stdout, indent=2)
print()
" > "${TEMP_SPEC}" 2>/dev/null || {
    echo "  WARN: Could not generate engine OpenAPI spec (engine deps may not be installed)"
    echo "        Skipping engine contract check."
    ENGINE_SPEC_OK=false
    rm -f "${TEMP_SPEC}"
}

if [ "${ENGINE_SPEC_OK}" = true ]; then
    EXISTING_SPEC="${ROOT_DIR}/packages/types/src/services/engine/openapi.json"
    if [ -f "${EXISTING_SPEC}" ]; then
        if ! diff -q "${TEMP_SPEC}" "${EXISTING_SPEC}" > /dev/null 2>&1; then
            echo "  FAIL: Engine OpenAPI spec is out of date!"
            echo "        Run: ./scripts/engine-openapi-gen.sh"
            rm -f "${TEMP_SPEC}"
            exit 1
        fi
        echo "  OK: Engine OpenAPI spec is current."
    else
        echo "  WARN: No existing OpenAPI spec found at ${EXISTING_SPEC}"
        echo "        Run: ./scripts/engine-openapi-gen.sh"
    fi
    rm -f "${TEMP_SPEC}"
fi

echo ""
echo "[2/4] Checking CLI OpenAPI spec freshness..."
CLI_SPEC="${ROOT_DIR}/apps/cli/internal/openapi/openbeam.openapi.json"
CLI_SPEC_SHA="${CLI_SPEC}.sha256"

if [ -f "${CLI_SPEC}" ]; then
    if [ -f "${CLI_SPEC_SHA}" ]; then
        STORED_SHA=$(cat "${CLI_SPEC_SHA}" | awk '{print $1}')
        ACTUAL_SHA=$(shasum -a 256 "${CLI_SPEC}" | awk '{print $1}')
        if [ "${STORED_SHA}" != "${ACTUAL_SHA}" ]; then
            echo "  FAIL: CLI OpenAPI spec has been modified without updating its checksum."
            echo "        Run: cd apps/cli && ./scripts/update-openapi.sh"
            exit 1
        fi
        echo "  OK: CLI OpenAPI spec checksum matches."
    else
        echo "  WARN: No CLI OpenAPI spec checksum found. Run: cd apps/cli && ./scripts/update-openapi.sh"
    fi
else
    echo "  WARN: No CLI OpenAPI spec found at ${CLI_SPEC}"
    echo "        The Go CLI has no codegen from the server API yet."
    echo "        Run: cd apps/cli && ./scripts/update-openapi.sh"
fi

echo ""
echo "[3/4] Checking TypeScript package export consistency..."
cd "${ROOT_DIR}"
ERRORS=0

check_types_export() {
    local pkg_dir="$1"
    local pkg_name="$2"
    local export_key="$3"

    local types_path
    types_path=$(node -e "
const pkg = require('./${pkg_dir}/package.json');
const exp = pkg.exports && pkg.exports['${export_key}'];
if (exp && exp.types) console.log(exp.types);
" 2>/dev/null || echo "")

    if [ -z "${types_path}" ]; then
        return
    fi

    if echo "${types_path}" | grep -q "^./src/"; then
        echo "  FAIL: ${pkg_name} export '${export_key}' types points to src/ instead of dist/"
        echo "        types: ${types_path}"
        ERRORS=$((ERRORS + 1))
    fi
}

check_types_export "packages/types" "@openbeam/types" "."
check_types_export "packages/types" "@openbeam/types" "./ai"
check_types_export "packages/types" "@openbeam/types" "./db"
check_types_export "packages/types" "@openbeam/types" "./services"
check_types_export "packages/services" "@openbeam/services" "./engine/generated"
check_types_export "packages/ai" "@openbeam/ai" "."
check_types_export "packages/ai" "@openbeam/ai" "./tools"
check_types_export "packages/ai" "@openbeam/ai" "./agents"
check_types_export "packages/ai" "@openbeam/ai" "./providers"

if [ "${ERRORS}" -eq 0 ]; then
    echo "  OK: Package exports point to dist/ for types."
fi

echo ""
echo "[4/4] Checking for circular dependencies in types package..."
cd "${ROOT_DIR}"
if command -v bun > /dev/null 2>&1; then
    CIRCULAR_OUTPUT=$(bun x madge --circular --extensions ts packages/types/src/index.ts 2>&1) || true
    if echo "${CIRCULAR_OUTPUT}" | grep -q "Found [1-9]"; then
        echo "  FAIL: Circular dependencies detected in @openbeam/types:"
        echo "${CIRCULAR_OUTPUT}" | head -20
        ERRORS=$((ERRORS + 1))
    else
        echo "  OK: No circular dependencies in @openbeam/types."
    fi
else
    echo "  WARN: bun not available, skipping circular dependency check."
fi

echo ""
if [ "${ERRORS}" -gt 0 ]; then
    echo "=== FAILED: ${ERRORS} contract violation(s) found ==="
    exit 1
fi
echo "=== All contracts valid ==="
