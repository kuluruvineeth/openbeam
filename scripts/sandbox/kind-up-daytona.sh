#!/usr/bin/env bash
set -euo pipefail

SANDBOX_DAYTONA_ENV_FILE="${SANDBOX_DAYTONA_ENV_FILE:-.sandbox/daytona-kind.env}"

mkdir -p "$(dirname "${SANDBOX_DAYTONA_ENV_FILE}")"

DAYTONA_ENV_FILE="${SANDBOX_DAYTONA_ENV_FILE}" scripts/sandbox/daytona-kind-up.sh

set -a
# shellcheck disable=SC1090
source "${SANDBOX_DAYTONA_ENV_FILE}"
set +a

export SANDBOX_DEFAULT_PROVIDER="daytona"

scripts/sandbox/kind-up.sh

echo "Self-hosted Daytona sandbox gateway is ready."
echo "Run smoke suite: SANDBOX_TEST_PROVIDER=daytona scripts/sandbox/smoke-kind.sh"
