# Contributing to OpenPlane

## Prerequisites

Install [mise](https://mise.jdx.dev) for tool version management:

```bash
curl https://mise.jdx.dev/install.sh | sh
mise install
```

This installs the exact versions of Bun, Node.js, Python, Go, and uv used by the project.

## Setup

```bash
just install          # Install all language dependencies
just db-start         # Start PostgreSQL + Redis
just db-push          # Apply database schema
just dev              # Start all services
```

## Development Workflow

```bash
just check-all        # Lint + type check + test (all languages)
just test             # Run all tests
just check            # Lint only
just check-types      # Type check only
```

### Per-Language Commands

| Language | Test | Lint | Type Check |
|----------|------|------|------------|
| TypeScript | `just test-ts` | `bun run check` | `bun x tsc --noEmit` |
| Python | `just test-py` | `cd apps/engine && uv run ruff check src tests` | `cd apps/engine && uv run mypy src` |
| Go | `just test-go` | `cd apps/cli && golangci-lint run` | `cd apps/cli && go vet ./...` |

## Architecture

```
apps/web        Next.js frontend
apps/server     Hono API server
apps/worker     Temporal workers
apps/engine     Python ML service (FastAPI)
apps/cli        Go CLI (Cobra)
packages/*      Shared TypeScript packages
```

See `.claude/rules/architecture.md` for dependency rules.

## Code Style

- **TypeScript**: Biome via Ultracite (`bun run check`)
- **Python**: Ruff + mypy strict (`uv run ruff check`, `uv run mypy src`)
- **Go**: golangci-lint

## Package Manager

**Bun only.** Never use npm, pnpm, or yarn.

```bash
bun install           # Install dependencies
bun add <pkg>         # Add dependency
bun x <cmd>           # Run one-off command (not npx)
```

## Commit Convention

```
<type>(<scope>): <subject>
```

**Types**: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`

**Scopes**: `web`, `server`, `worker`, `engine`, `cli`, `api`, `db`, `services`, `redis`, `temporal`, `vespa`, `ai`, `types`, `integrations`

Examples: `feat(api): Add user search endpoint`, `fix(engine): Handle empty document input`

## Pull Requests

- Branch from `dev`
- Keep PRs under 400 lines
- All CI checks must pass
- Squash merge to keep history clean

## Running Specific Services

```bash
just dev-web          # Web frontend only
just dev-server       # API server only
just dev-engine       # Python engine (CPU)
just dev-cli          # Build CLI binary
```
