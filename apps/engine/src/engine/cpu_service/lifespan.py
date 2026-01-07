from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING

import redis.asyncio as redis
from fastapi import FastAPI

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

from engine.common.config import get_cpu_settings
from engine.common.logging import get_logger
from engine.cpu_service.clients.gpu_client import GPUClient
from engine.ltr import get_ltr_service
from engine.parsers import register_all_parsers
from engine.services.chunker import ChunkerService


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_cpu_settings()
    logger = get_logger(__name__)

    temp_path = Path(settings.temp_dir)
    temp_path.mkdir(parents=True, exist_ok=True)

    register_all_parsers()

    redis_client = redis.from_url(settings.redis_url)  # type: ignore[no-untyped-call]
    app.state.redis = redis_client

    app.state.chunker = ChunkerService(
        default_max_characters=settings.chunk_max_size,
        default_overlap=settings.chunk_overlap,
    )

    ltr_service = get_ltr_service()
    app.state.ltr_service = ltr_service

    gpu_client = GPUClient(
        base_url=settings.gpu_service_url,
        timeout_seconds=settings.gpu_service_timeout_seconds,
    )
    app.state.gpu_client = gpu_client

    logger.info(
        "cpu_service_started",
        environment=settings.environment,
        debug=settings.debug,
        gpu_service_url=settings.gpu_service_url,
        ltr_ready=ltr_service.is_ready,
        ltr_model_version=ltr_service.model_version if ltr_service.is_ready else None,
    )

    yield

    await redis_client.aclose()
    await gpu_client.close()
    logger.info("cpu_service_shutdown")
