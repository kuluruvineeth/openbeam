from __future__ import annotations

import time
from typing import TYPE_CHECKING

import torch
from ray import serve

from engine.common.exceptions import ModelLoadError
from engine.common.logging import get_logger
from engine.common.metrics import MODEL_BATCH_SIZE, MODEL_INFERENCE_LATENCY
from engine.models.rerank import RerankResponse, RerankResult

if TYPE_CHECKING:
    from FlagEmbedding import FlagReranker

logger = get_logger(__name__)


@serve.deployment(
    ray_actor_options={"num_gpus": 0.3},
    max_ongoing_requests=50,
    autoscaling_config={
        "min_replicas": 1,
        "max_replicas": 5,
        "target_ongoing_requests": 25,
    },
)
class RerankerDeployment:
    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-v2-m3",
        max_batch_size: int = 16,
        cache_dir: str = "/models/reranker",
    ) -> None:
        self._model_name = model_name
        self._max_batch_size = max_batch_size
        self._cache_dir = cache_dir
        self._model: FlagReranker | None = None
        self._device: str = "cpu"
        self._is_ready = False

        self._load_model()

    def _select_device(self) -> str:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _load_model(self) -> None:
        from FlagEmbedding import FlagReranker

        self._device = self._select_device()

        logger.info(
            "loading_reranker_model",
            model=self._model_name,
            device=self._device,
        )

        try:
            self._model = FlagReranker(
                self._model_name,
                use_fp16=self._device != "cpu",
                device=self._device,
                cache_dir=self._cache_dir,
            )
            self._is_ready = True
            logger.info("reranker_model_loaded", model=self._model_name)
        except Exception as e:
            logger.error("reranker_model_load_failed", error=str(e))
            raise ModelLoadError(f"Failed to load {self._model_name}: {e}") from e

    def ready(self) -> bool:
        return self._is_ready

    async def rerank(
        self,
        query: str,
        passages: list[str],
        top_k: int | None = None,
    ) -> RerankResponse:
        if not self._is_ready or self._model is None:
            raise ModelLoadError("Model not loaded")

        if not passages:
            return RerankResponse(
                results=[],
                model=self._model_name,
                usage={"latency_ms": 0.0},
            )

        start_time = time.perf_counter()
        MODEL_BATCH_SIZE.labels(model="bge-reranker").observe(len(passages))

        pairs = [[query, passage] for passage in passages]

        scores = self._model.compute_score(
            pairs,
            normalize=True,
            batch_size=min(self._max_batch_size, len(pairs)),
        )

        if isinstance(scores, (int, float)):
            scores = [scores]

        elapsed = time.perf_counter() - start_time
        MODEL_INFERENCE_LATENCY.labels(
            model="bge-reranker", operation="rerank"
        ).observe(elapsed)

        results = [
            RerankResult(index=i, score=float(score), passage=passages[i])
            for i, score in enumerate(scores)
        ]

        results.sort(key=lambda r: r.score, reverse=True)

        if top_k is not None:
            results = results[:top_k]

        return RerankResponse(
            results=results,
            model=self._model_name,
            usage={"latency_ms": round(elapsed * 1000, 2)},
        )
