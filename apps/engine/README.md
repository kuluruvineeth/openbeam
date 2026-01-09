# Engine (CPU + GPU services)

This app exposes two FastAPI services:

- **CPU service (`engine-cpu`)**: parsing, chunking, LTR (and optionally ML on CPU for local dev)
- **GPU service (`engine-gpu`)**: embeddings / rerank / entities (intended for production)

## Setup

```bash
cd apps/engine
uv sync --extra cpu --extra dev
```

## Local development (Mac) — run “everything” in CPU service

Recommended on macOS to avoid `FlagEmbedding` segfaults:

```bash
cd apps/engine
uv sync --extra cpu --extra ml --extra dev
CPU_ML_BACKEND=transformers CPU_WORKERS=1 CPU_ENABLE_ML=true uv run engine-cpu
```

This enables these CPU endpoints:

- `/v1/parse`, `/v1/chunk`, `/v1/supported-types`, `/v1/ltr`
- `/v1/embeddings/*`, `/v1/rerank`, `/v1/entities` (because `CPU_ENABLE_ML=true`)

## Production (or prod-style local) — split CPU + GPU

Run both services and send ML traffic to **GPU**.

Terminal A (GPU service):

```bash
cd apps/engine
uv sync --extra gpu --extra dev
uv run engine-gpu
```

Terminal B (CPU service, ML disabled):

```bash
cd apps/engine
CPU_ENABLE_ML=false CPU_WORKERS=1 CPU_GPU_SERVICE_URL=http://localhost:8001 uv run engine-cpu
```

Notes:

- The CPU service does **not** proxy its `/v1/embeddings`, `/v1/rerank`, `/v1/entities` routes to GPU.
  If `CPU_ENABLE_ML=false`, those endpoints return `503`. In production, call the GPU service for those.
- CPU → GPU connectivity is configured via `CPU_GPU_SERVICE_URL` (used for health checks and integration).

## Reference

- **Entrypoints**: `engine-cpu` and `engine-gpu` (see `apps/engine/pyproject.toml`)
- **Kubernetes manifests**: `apps/engine/k8s/`
- **Dockerfiles**: `apps/engine/Dockerfile.cpu`, `apps/engine/Dockerfile.gpu`
