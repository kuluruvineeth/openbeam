from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from prometheus_client import make_asgi_app
from ray import serve

from engine.common.config import get_gpu_settings
from engine.common.logging import configure_logging, get_logger
from engine.common.metrics_middleware import MetricsMiddleware
from engine.gpu_service.deployments.embedding import EmbeddingDeployment
from engine.gpu_service.deployments.entity import EntityDeployment
from engine.gpu_service.deployments.reranker import RerankerDeployment

GPU_SERVICE_NAME = "openplane-engine-gpu"

logger = get_logger(__name__)


def _create_metrics_app() -> FastAPI:
    app = FastAPI(
        title="OpenPlane Engine GPU Metrics",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.add_middleware(MetricsMiddleware)
    app.mount("/", make_asgi_app())
    return app


@serve.deployment(
    name="metrics-ingress",
    ray_actor_options={"num_cpus": 0.1},
)
@serve.ingress(_create_metrics_app())
class MetricsIngress:
    pass


def create_app() -> dict[str, Any]:
    settings = get_gpu_settings()
    configure_logging(settings, service_name=GPU_SERVICE_NAME)

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
        "/metrics": MetricsIngress.bind(),  # type: ignore[attr-defined]
        "/v1/embeddings": embedding,
        "/v1/rerank": reranker,
        "/v1/entities": entity,
    }


def run() -> None:
    settings = get_gpu_settings()
    configure_logging(settings, service_name=GPU_SERVICE_NAME)

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
