from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import redis.asyncio as redis
from fastapi import FastAPI

from engine.core.config import settings
from engine.core.logging import configure_logging, get_logger
from engine.embeddings.cache import EmbeddingCache
from engine.embeddings.model import BGEM3
from engine.parsers import register_all_parsers
from engine.reranker import RerankerService, get_cross_encoder_model
from engine.reranker.cache import RerankCache
from engine.services.embedding import EmbeddingService


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger = get_logger(__name__)

    temp_path = Path(settings.temp_dir)
    temp_path.mkdir(parents=True, exist_ok=True)

    register_all_parsers()

    redis_client = redis.from_url(settings.redis_url)
    model = BGEM3.get_instance()
    cache = EmbeddingCache(redis_client, memory_size=10_000)
    app.state.embedding_service = EmbeddingService(model, cache)

    cross_encoder = get_cross_encoder_model()
    rerank_cache = RerankCache(redis_client=redis_client)
    app.state.reranker_service = RerankerService(
        model=cross_encoder,
        cache=rerank_cache,
    )

    logger.info(
        "engine_started",
        environment=settings.environment,
        debug=settings.debug,
        embedding_device=model.device,
        reranker_model=cross_encoder.model_name,
        reranker_device=cross_encoder.device,
    )

    yield

    await cache.close()
    await redis_client.aclose()
    logger.info("engine_shutdown")
