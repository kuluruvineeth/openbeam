from __future__ import annotations

from typing import Any

from ray import serve

from engine.common.config import get_gpu_settings
from engine.common.logging import configure_logging, get_logger
from engine.gpu_service.deployments.embedding import EmbeddingDeployment
from engine.gpu_service.deployments.entity import EntityDeployment
from engine.gpu_service.deployments.reranker import RerankerDeployment

logger = get_logger(__name__)


def create_app() -> dict[str, Any]:
    settings = get_gpu_settings()
    configure_logging(settings)

    logger.info(
        "creating_gpu_service",
        provider_type=settings.provider_type,
        embedding_model=settings.embedding_model,
        reranker_model=settings.reranker_model,
        entity_model=settings.entity_model,
    )

    embedding = EmbeddingDeployment.bind(  # type: ignore[attr-defined]
        model_name=settings.embedding_model,
        max_batch_size=settings.embedding_batch_size,
        cache_dir=f"{settings.model_cache_dir}/embeddings",
    )

    reranker = RerankerDeployment.bind(  # type: ignore[attr-defined]
        model_name=settings.reranker_model,
        max_batch_size=settings.reranker_batch_size,
        cache_dir=f"{settings.model_cache_dir}/reranker",
    )

    entity = EntityDeployment.bind(  # type: ignore[attr-defined]
        model_name=settings.entity_model,
        cache_dir=f"{settings.model_cache_dir}/entity",
    )

    return {
        "/v1/embeddings": embedding,
        "/v1/rerank": reranker,
        "/v1/entities": entity,
    }


def run() -> None:
    settings = get_gpu_settings()
    configure_logging(settings)

    logger.info(
        "starting_gpu_service",
        host=settings.host,
        port=settings.port,
        provider_type=settings.provider_type,
    )

    serve.run(
        create_app(),
        host=settings.host,
        port=settings.port,
    )


if __name__ == "__main__":
    run()
