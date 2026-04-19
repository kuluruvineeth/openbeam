#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build"
MAN_DIR="${BUILD_DIR}/manpages"
COMPLETION_DIR="${BUILD_DIR}/completions"

cd "${ROOT_DIR}"

rm -rf "${MAN_DIR}" "${COMPLETION_DIR}"
go run ./cmd/docgen "${BUILD_DIR}"

if command -v gzip >/dev/null; then
  find "${MAN_DIR}" -name '*.1' -print0 | xargs -0 gzip -f -n
fi

echo "wrote manpages to ${MAN_DIR}"
echo "wrote completions to ${COMPLETION_DIR}"
