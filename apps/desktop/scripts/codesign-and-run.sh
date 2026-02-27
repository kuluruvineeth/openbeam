#!/bin/bash
set -euo pipefail

BINARY="$1"
shift

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTITLEMENTS="$SCRIPT_DIR/../src-tauri/Entitlements.plist"

if [[ "$(uname)" == "Darwin" ]] && [[ -f "$ENTITLEMENTS" ]]; then
  codesign --force --sign - --entitlements "$ENTITLEMENTS" "$BINARY" 2>/dev/null || true
fi

exec "$BINARY" "$@"
