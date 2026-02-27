from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING, Any

import redis.asyncio as redis
from fastapi import FastAPI

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

from engine.common.config import CPUServiceSettings, get_cpu_settings
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

    browser_service = None
    if settings.enable_browser:
        logger.info("initializing_browser_service")
        try:
            from engine.browser.service import BrowserService

            browser_service = BrowserService(settings)
            await browser_service.initialize()
        except ImportError as e:
            logger.warning(
                "browser_service_missing_deps",
                error=str(e),
                hint="Install browser deps: uv sync --extra browser",
            )
        except Exception as e:
            logger.warning("browser_service_init_failed", error=str(e))
    app.state.browser_service = browser_service

    embedding_service = None
    reranker_service = None
    entity_extractor = None

    if settings.enable_ml:
        logger.info("initializing_ml_services")
        try:
            embedding_service, reranker_service, entity_extractor = await _init_ml_services(
                settings, redis_client, logger
            )
        except BaseException as e:
            # Surface fatal exits (e.g. SystemExit) that wouldn't be caught by
            # `except Exception` and can otherwise look like a "silent crash".
            logger.error(
                "ml_services_init_fatal",
                error=repr(e),
                error_type=type(e).__name__,
            )
            raise

    app.state.embedding_service = embedding_service
    app.state.reranker_service = reranker_service
    app.state.entity_extractor = entity_extractor

    logger.info(
        "cpu_service_started",
        environment=settings.environment,
        debug=settings.debug,
        gpu_service_url=settings.gpu_service_url,
        ltr_ready=ltr_service.is_ready,
        ltr_model_version=ltr_service.model_version if ltr_service.is_ready else None,
        browser_enabled=settings.enable_browser,
        browser_ready=browser_service is not None,
        ml_enabled=settings.enable_ml,
        embedding_ready=embedding_service is not None,
        reranker_ready=reranker_service is not None,
        entity_ready=entity_extractor is not None,
    )

    yield

    if browser_service is not None:
        await browser_service.close()

    if embedding_service is not None:
        from engine.embeddings.cache import EmbeddingCache

        cache: EmbeddingCache = embedding_service._cache
        await cache.close()

    await redis_client.aclose()
    await gpu_client.close()
    logger.info("cpu_service_shutdown")


async def _init_ml_services(
    settings: CPUServiceSettings,
    redis_client: redis.Redis,
    logger: Any,
) -> tuple[Any, Any, Any]:
    embedding_service = None
    reranker_service = None
    entity_extractor = None

    ml_hint = "Install ML deps: uv sync --extra cpu --extra ml --extra dev"

    try:
        from engine.embeddings.cache import EmbeddingCache
        from engine.embeddings.model import BGEM3
        from engine.services.embedding import EmbeddingService

        cache_dir = settings.embedding_cache_dir or f"{settings.temp_dir}/embedding_cache"
        embedding_model = BGEM3.get_instance(
            device=None if settings.ml_device == "auto" else settings.ml_device
        )
        embedding_cache = EmbeddingCache(
            redis_client=redis_client,
            memory_size=settings.embedding_cache_size,
            disk_path=cache_dir,
        )
        embedding_service = EmbeddingService(model=embedding_model, cache=embedding_cache)
        logger.info("embedding_service_initialized", device=embedding_model.device)
    except ModuleNotFoundError as e:
        logger.warning("embedding_service_missing_deps", error=str(e), hint=ml_hint)
    except Exception as e:
        logger.warning("embedding_service_init_failed", error=str(e))

    try:
        from engine.reranker.cache import RerankCache
        from engine.reranker.model import get_cross_encoder_model
        from engine.reranker.service import RerankerService

        reranker_model = get_cross_encoder_model(
            device=None if settings.ml_device == "auto" else settings.ml_device
        )
        reranker_cache = RerankCache(redis_client=redis_client)
        reranker_service = RerankerService(model=reranker_model, cache=reranker_cache)
        logger.info("reranker_service_initialized", device=reranker_model.device)
    except ModuleNotFoundError as e:
        logger.warning("reranker_service_missing_deps", error=str(e), hint=ml_hint)
    except Exception as e:
        logger.warning("reranker_service_init_failed", error=str(e))

    try:
        from engine.entities import EntityExtractor

        entity_extractor = EntityExtractor.get_instance()
        logger.info("entity_extractor_initialized", device=entity_extractor.device)
    except ModuleNotFoundError as e:
        logger.warning("entity_extractor_missing_deps", error=str(e), hint=ml_hint)
    except Exception as e:
        logger.warning("entity_extractor_init_failed", error=str(e))

    return embedding_service, reranker_service, entity_extractor
