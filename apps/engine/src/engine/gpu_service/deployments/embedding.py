from __future__ import annotations

import time
import warnings
from typing import TYPE_CHECKING

import torch
from ray import serve

from engine.common.exceptions import ModelLoadError
from engine.common.logging import get_logger
from engine.common.metrics import MODEL_BATCH_SIZE, MODEL_INFERENCE_LATENCY
from engine.models.embedding import EmbeddingResponse

if TYPE_CHECKING:
    from FlagEmbedding import BGEM3FlagModel

warnings.filterwarnings(
    "ignore",
    message=".*fast tokenizer.*pad method.*",
    category=UserWarning,
)

logger = get_logger(__name__)


@serve.deployment(
    ray_actor_options={"num_gpus": 0.5},
    max_ongoing_requests=100,
    autoscaling_config={
        "min_replicas": 1,
        "max_replicas": 5,
        "target_ongoing_requests": 50,
    },
)
class EmbeddingDeployment:
    def __init__(
        self,
        model_name: str = "BAAI/bge-m3",
        max_batch_size: int = 32,
        cache_dir: str = "/models/embeddings",
    ) -> None:
        self._model_name = model_name
        self._max_batch_size = max_batch_size
        self._cache_dir = cache_dir
        self._model: BGEM3FlagModel | None = None
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
        from FlagEmbedding import BGEM3FlagModel

        self._device = self._select_device()

        logger.info(
            "loading_embedding_model",
            model=self._model_name,
            device=self._device,
        )

        try:
            self._model = BGEM3FlagModel(
                self._model_name,
                use_fp16=self._device != "cpu",
                device=self._device,
                cache_dir=self._cache_dir,
            )
            self._is_ready = True
            logger.info("embedding_model_loaded", model=self._model_name)
        except Exception as e:
            logger.error("embedding_model_load_failed", error=str(e))
            raise ModelLoadError(f"Failed to load {self._model_name}: {e}") from e

    def ready(self) -> bool:
        return self._is_ready

    async def encode(
        self,
        texts: list[str],
        return_sparse: bool = False,
    ) -> EmbeddingResponse:
        if not self._is_ready or self._model is None:
            raise ModelLoadError("Model not loaded")

        if not texts:
            return EmbeddingResponse(
                embeddings=[],
                sparse_embeddings=[] if return_sparse else None,
                model=self._model_name,
                usage={"total_tokens": 0, "latency_ms": 0.0},
            )

        start_time = time.perf_counter()
        MODEL_BATCH_SIZE.labels(model="bge-m3").observe(len(texts))

        output = self._model.encode(
            texts,
            batch_size=min(self._max_batch_size, len(texts)),
            return_dense=True,
            return_sparse=return_sparse,
            return_colbert_vecs=False,
        )

        elapsed = time.perf_counter() - start_time
        MODEL_INFERENCE_LATENCY.labels(model="bge-m3", operation="encode").observe(
            elapsed
        )

        return EmbeddingResponse(
            embeddings=output["dense_vecs"].tolist(),
            sparse_embeddings=self._format_sparse(output.get("lexical_weights"))
            if return_sparse
            else None,
            model=self._model_name,
            usage={
                "total_tokens": sum(len(t.split()) for t in texts),
                "latency_ms": round(elapsed * 1000, 2),
            },
        )

    def _format_sparse(
        self, weights: list[dict[str, float]] | None
    ) -> list[dict[str, float]] | None:
        if weights is None:
            return None
        return [dict(w) for w in weights]
