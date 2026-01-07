from __future__ import annotations

from fastapi import APIRouter, Request

from engine.models.responses import HealthResponse, ReadyResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="healthy", version="0.2.0")


@router.get("/ready", response_model=ReadyResponse)
async def ready(request: Request) -> ReadyResponse:
    gpu_healthy = False
    try:
        gpu_client = request.app.state.gpu_client
        await gpu_client.health()
        gpu_healthy = True
    except Exception:
        pass

    checks = {
        "cpu_service": True,
        "gpu_service": gpu_healthy,
        "ltr": request.app.state.ltr_service.is_ready,
    }
    return ReadyResponse(ready=all(checks.values()), checks=checks)
