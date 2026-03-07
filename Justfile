# OpenBeam — Polyglot Task Runner
# Install: brew install just (macOS) | cargo install just (any)
# Usage:  just <recipe>  or  just --list

set dotenv-load := true
set shell := ["bash", "-euo", "pipefail", "-c"]

# ─── Meta ────────────────────────────────────────────────────────

# List all recipes
default:
    @just --list --unsorted

# ─── Development ─────────────────────────────────────────────────

# Start all services (web, server, worker)
dev:
    bun run dev

# Start web frontend only
dev-web:
    turbo -F web dev

# Start API server only
dev-server:
    turbo -F server dev

# Start Python engine (CPU mode)
dev-engine:
    cd apps/engine && uv run engine-cpu

# Start Python engine with browser support
dev-engine-browser:
    cd apps/engine && CPU_ENABLE_BROWSER=true uv run engine-cpu

# Build CLI binary
dev-cli:
    cd apps/cli && go build -o dist/openbeam ./cmd/openbeam

# ─── Build ───────────────────────────────────────────────────────

# Build all TypeScript packages
build:
    bun run build

# Build CLI release binary
build-cli:
    cd apps/cli && goreleaser build --snapshot --clean

# Build engine Docker images
build-engine-cpu:
    docker build -f apps/engine/Dockerfile.cpu -t openbeam/engine-cpu apps/engine

build-engine-gpu:
    docker build -f apps/engine/Dockerfile.gpu -t openbeam/engine-gpu apps/engine

# ─── Quality ─────────────────────────────────────────────────────

# Run all checks (lint + types + tests)
check-all: check check-types test

# Lint and format (Biome for TS, Ruff for Python, golangci-lint for Go)
check:
    bun run check
    cd apps/engine && uv run ruff check src tests
    cd apps/cli && GOTOOLCHAIN=go1.24.2 go run github.com/golangci/golangci-lint/cmd/golangci-lint@v1.64.8 run

# Type check all languages
check-types:
    bun x tsc --noEmit
    cd apps/engine && uv run mypy src
    cd apps/cli && go vet ./...

# Format all code
fmt:
    bun run check
    cd apps/engine && uv run ruff format src tests

# ─── Testing ─────────────────────────────────────────────────────

# Run all tests across all languages
test: test-ts test-py test-go

# TypeScript tests (bun:test)
test-ts:
    bun test ./apps/ ./packages/ai/ ./packages/api/ ./packages/db/ ./packages/redis/ ./packages/services/ ./packages/types/ ./packages/ui/ ./packages/vespa/

# Temporal tests (vitest + Node.js)
test-temporal:
    cd packages/temporal && bun run test

# Python engine tests
test-py:
    cd apps/engine && uv run pytest tests/ -v

# Go CLI tests
test-go:
    cd apps/cli && go test ./...

test-ts-cov:
    bun test --coverage ./apps/ ./packages/ai/ ./packages/api/ ./packages/db/ ./packages/redis/ ./packages/services/ ./packages/types/ ./packages/ui/ ./packages/vespa/

test-py-cov:
    cd apps/engine && uv run pytest tests/ -v --cov=src/engine --cov-report=term-missing --cov-report=html:htmlcov

test-go-cov:
    cd apps/cli && go test ./... -coverprofile=coverage.out && go tool cover -func=coverage.out

test-cov: test-ts-cov test-py-cov test-go-cov

check-circular:
    bun x madge --circular --extensions ts,tsx packages/*/src/index.ts

# Validate observability dashboards and Prometheus rules
observability-validate:
    bun run observability:validate

# Run end-to-end monitoring smoke checks
observability-smoke:
    bun run observability:smoke

# Generate a typed Prometheus metric stub
observability-new-metric:
    @echo "Example:"
    @echo "bun run observability:new-metric -- --name openbeam_example_total --type counter --labels service,env --help \"Example metric\" --out apps/server/src/metrics/openbeam-example-total.ts"

# Generate a typed structured log helper
observability-new-log-event:
    @echo "Example:"
    @echo "bun run observability:new-log-event -- --event connector_sync_failed --fields connector_id:string,team_id:string,error_code:string --level error --out packages/services/src/observability/log-connector-sync-failed.ts"

# ─── Database ────────────────────────────────────────────────────

# Push Prisma schema to database
db-push:
    turbo -F @openbeam/db db:push

# Open Prisma Studio
db-studio:
    turbo -F @openbeam/db db:studio

# Generate Prisma client
db-generate:
    turbo -F @openbeam/db db:generate

# Run database migrations
db-migrate:
    turbo -F @openbeam/db db:migrate

# Start database containers
db-start:
    turbo -F @openbeam/db db:start

# Stop database containers
db-stop:
    turbo -F @openbeam/db db:stop

# ─── Dependencies ────────────────────────────────────────────────

# Install all dependencies across all languages
install:
    bun install
    cd apps/engine && uv sync --extra cpu --extra dev
    cd apps/cli && go mod download

# Install engine with browser support
install-engine-browser:
    cd apps/engine && uv sync --extra cpu --extra browser --extra dev && playwright install chromium

# Install engine with GPU support
install-engine-gpu:
    cd apps/engine && uv sync --extra gpu --extra dev

# ─── Code Generation ─────────────────────────────────────────────

# Export engine OpenAPI spec and generate TypeScript client
openapi-gen:
    ./scripts/engine-openapi-gen.sh

# Update CLI's OpenAPI spec from running server
openapi-cli:
    cd apps/cli && ./scripts/update-openapi.sh

# ─── Kubernetes (Local) ──────────────────────────────────────────

# Create local kind cluster
k8s-up:
    kind get clusters 2>/dev/null | grep -q openbeam-dev || \
        kind create cluster --config k8s/kind-config.yaml
    kubectl cluster-info --context kind-openbeam-dev

# Delete local kind cluster
k8s-down:
    kind delete cluster --name openbeam-dev

# Start local K8s dev environment
k8s-dev: k8s-up
    cd k8s && tilt up

# Start with full monitoring stack
k8s-dev-full: k8s-up
    cd k8s && tilt up -- --monitoring

# Start with voice agents
k8s-dev-voice: k8s-up
    cd k8s && tilt up -- --voice

# Start with everything enabled
k8s-dev-all: k8s-up
    cd k8s && tilt up -- --monitoring --voice

# Show pod status
k8s-status:
    kubectl get pods -n openbeam -o wide

# Tail logs for a service
k8s-logs service:
    kubectl logs -n openbeam -l app={{service}} -f --tail=100

# Open database shell
k8s-db-shell:
    kubectl exec -n openbeam -it deploy/postgres -- psql -U postgres openbeam

# Open redis shell
k8s-redis-shell:
    kubectl exec -n openbeam -it deploy/redis -- redis-cli

# ─── Cleanup ─────────────────────────────────────────────────────

# Clean all build artifacts
clean:
    rm -rf node_modules/.cache .turbo
    find . -name "dist" -type d -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".mypy_cache" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name ".ruff_cache" -type d -exec rm -rf {} + 2>/dev/null || true
    cd apps/cli && rm -rf dist

# Prune dangling Docker images and build cache (keep 5GB)
docker-gc:
    docker image prune -f
    docker builder prune --keep-storage=5GB -f
    @echo "Docker GC complete. Current disk usage:"
    @docker system df

# Prune unused images inside Kind node via crictl
k8s-gc:
    docker exec openbeam-dev-control-plane crictl rmi --prune 2>/dev/null || echo "Kind node not running"

# Run all garbage collection (Docker + Kind)
gc: docker-gc k8s-gc

# One-time: configure Docker daemon GC (builder.gc.enabled + 10GB keep)
docker-setup-gc:
    #!/usr/bin/env bash
    DAEMON_JSON="${HOME}/.docker/daemon.json"
    if [ -f "$DAEMON_JSON" ]; then
        echo "Existing ${DAEMON_JSON}:"
        cat "$DAEMON_JSON"
        echo ""
        echo "Merging builder GC settings..."
        TEMP=$(mktemp)
        jq '. + {"builder": {"gc": {"enabled": true, "defaultKeepStorage": "10GB"}}}' "$DAEMON_JSON" > "$TEMP" && mv "$TEMP" "$DAEMON_JSON"
    else
        mkdir -p "$(dirname "$DAEMON_JSON")"
        echo '{"builder": {"gc": {"enabled": true, "defaultKeepStorage": "10GB"}}}' > "$DAEMON_JSON"
    fi
    echo "Updated ${DAEMON_JSON}:"
    cat "$DAEMON_JSON"
    echo ""
    echo "Restart Docker Desktop for changes to take effect."
