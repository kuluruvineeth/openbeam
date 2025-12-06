from fastapi import APIRouter

from engine import __version__
from engine.models.responses import HealthResponse, ReadyResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="healthy", version=__version__)


@router.get("/ready", response_model=ReadyResponse)
async def ready() -> ReadyResponse:
    checks = {
        "app": True,
    }
    return ReadyResponse(ready=all(checks.values()), checks=checks)
