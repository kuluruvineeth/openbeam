#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAN_DIR="${ROOT_DIR}/docs/man"
COMPLETION_DIR="${ROOT_DIR}/docs/completion"

mkdir -p "${MAN_DIR}" "${COMPLETION_DIR}"

cd "${ROOT_DIR}"

go run ./cmd/openbeam completion bash > "${COMPLETION_DIR}/openbeam.bash"
go run ./cmd/openbeam completion zsh > "${COMPLETION_DIR}/_openbeam"
go run ./cmd/openbeam completion fish > "${COMPLETION_DIR}/openbeam.fish"
go run ./cmd/openbeam completion powershell > "${COMPLETION_DIR}/openbeam.ps1"
go run ./cmd/openbeam --help > "${MAN_DIR}/openbeam.1"

echo "wrote docs in ${MAN_DIR} and ${COMPLETION_DIR}"
