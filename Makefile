.PHONY: help setup dev apps apps-all apps-docker apps-down down clean logs status
.PHONY: infra infra-up infra-down infra-logs
.PHONY: web server worker engine
.PHONY: db db-migrate db-push db-studio db-reset
.PHONY: temporal temporal-ui temporal-logs
.PHONY: check build test typecheck
.PHONY: docker-prune docker-stats prod-build prod-up prod-down

.DEFAULT_GOAL := help

help:
	@echo "Setup:"
	@echo "  make setup        - First-time setup"
	@echo "  make apps-all     - Start all apps including engine"
	@echo ""
	@echo "Apps:"
	@echo "  make apps         - TS apps only (web, server, worker)"
	@echo "  make apps-docker  - All apps via Docker Compose"
	@echo "  make apps-down    - Stop Docker dev apps"
	@echo "  make web          - Web only"
	@echo "  make server       - Server only"
	@echo "  make worker       - Worker only"
	@echo "  make engine       - Engine only"
	@echo ""
	@echo "Infrastructure:"
	@echo "  make dev          - Start infrastructure"
	@echo "  make infra-up     - Start infra services"
	@echo "  make down         - Stop infrastructure"
	@echo "  make status       - Service status"
	@echo ""
	@echo "Database:"
	@echo "  make db-push      - Push schema"
	@echo "  make db-studio    - Prisma Studio"
	@echo "  make db-migrate   - Run migrations"
	@echo "  make db-reset     - Reset database"
	@echo ""
	@echo "Quality:"
	@echo "  make check        - Lint and format"
	@echo "  make test         - Run tests"
	@echo "  make typecheck    - Type check"
	@echo "  make build        - Build all"

setup:
	@[ -f .env ] || cp .env.development .env
	@bun install
	@$(MAKE) infra-up
	@./scripts/wait-for-infra.sh
	@bun run db:generate
	@bun run db:push
	@echo "Setup complete. Run 'make apps' to start."

dev: infra-up
	@$(MAKE) status

apps:
	@bun run dev

apps-all:
	@trap 'kill 0' EXIT; \
	bun run dev & \
	cd apps/engine && uv run uvicorn src.engine.main:app --reload --host 0.0.0.0 --port 8000 & \
	wait

apps-docker:
	@docker compose -f docker-compose.infra.yml -f docker-compose.dev.yml up -d
	@$(MAKE) status

apps-down:
	@docker compose -f docker-compose.dev.yml down

infra infra-up:
	@docker compose -f docker-compose.infra.yml up -d
	@./scripts/wait-for-infra.sh || true

infra-down down:
	@docker compose -f docker-compose.infra.yml down

infra-logs:
	@docker compose -f docker-compose.infra.yml logs -f

clean:
	@docker compose -f docker-compose.infra.yml down -v

status:
	@docker compose -f docker-compose.infra.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Not running"
	@echo ""
	@echo "Web:         http://localhost:3001"
	@echo "Server:      http://localhost:3000"
	@echo "Engine:      http://localhost:8000"
	@echo "Temporal UI: http://localhost:8233"
	@echo "MinIO:       http://localhost:9001"
	@echo "Grafana:     http://localhost:3002"

logs:
	@docker compose -f docker-compose.infra.yml logs -f openplane-$(s)

web:
	@bun run dev:web

server:
	@bun run dev:server

worker:
	@cd apps/worker && bun run dev

engine:
	@cd apps/engine && uv run uvicorn src.engine.main:app --reload --host 0.0.0.0 --port 8000

db db-studio:
	@bun run db:studio

db-migrate:
	@bun run db:migrate

db-push:
	@bun run db:push

db-generate:
	@bun run db:generate

db-reset:
	@docker compose -f docker-compose.infra.yml exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS openplane;"
	@docker compose -f docker-compose.infra.yml exec postgres psql -U postgres -c "CREATE DATABASE openplane;"
	@bun run db:push

temporal:
	@docker compose -f docker-compose.infra.yml exec temporal-admin-tools bash

temporal-ui:
	@open http://localhost:8233 2>/dev/null || xdg-open http://localhost:8233 2>/dev/null || echo "Open http://localhost:8233"

temporal-logs:
	@docker compose -f docker-compose.infra.yml logs -f temporal

check:
	@bun run check

build:
	@bun run build

test:
	@bun test

typecheck:
	@bun x tsc --noEmit

docker-prune:
	@docker system prune -f

docker-stats:
	@docker stats --no-stream

prod-build:
	@docker compose build

prod-up:
	@docker compose -f docker-compose.infra.yml -f docker-compose.yml up -d

prod-down:
	@docker compose -f docker-compose.infra.yml -f docker-compose.yml down
