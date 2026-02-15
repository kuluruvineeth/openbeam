#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAN_DIR="${ROOT_DIR}/docs/man"
COMPLETION_DIR="${ROOT_DIR}/docs/completion"

mkdir -p "${MAN_DIR}" "${COMPLETION_DIR}"

cd "${ROOT_DIR}"

go run ./cmd/openplane completion bash > "${COMPLETION_DIR}/openplane.bash"
go run ./cmd/openplane completion zsh > "${COMPLETION_DIR}/_openplane"
go run ./cmd/openplane completion fish > "${COMPLETION_DIR}/openplane.fish"
go run ./cmd/openplane completion powershell > "${COMPLETION_DIR}/openplane.ps1"
go run ./cmd/openplane --help > "${MAN_DIR}/openplane.1"

echo "wrote docs in ${MAN_DIR} and ${COMPLETION_DIR}"
