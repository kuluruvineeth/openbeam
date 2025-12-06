from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from engine.core.config import settings
from engine.core.logging import configure_logging, get_logger
from engine.parsers import register_all_parsers


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger = get_logger(__name__)

    temp_path = Path(settings.temp_dir)
    temp_path.mkdir(parents=True, exist_ok=True)

    # Register all available parsers
    register_all_parsers()

    logger.info(
        "engine_started",
        environment=settings.environment,
        debug=settings.debug,
    )

    yield

    logger.info("engine_shutdown")
