from __future__ import annotations

import threading

import torch
from FlagEmbedding import FlagReranker

from engine.core.logging import get_logger

logger = get_logger(__name__)

_model_instance: CrossEncoderModel | None = None
_model_lock = threading.Lock()


class ModelLoadError(Exception):
    pass


class CrossEncoderModel:
    MODEL_NAME = "BAAI/bge-reranker-v2-m3"

    _instance: CrossEncoderModel | None = None

    def __init__(self, model_name: str | None = None) -> None:
        self._model_name = model_name or self.MODEL_NAME
        self._device = self._select_device()
        self._model = self._load_model()

    def _select_device(self) -> str:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _load_model(self) -> FlagReranker:
        logger.info(
            "loading_cross_encoder",
            model=self._model_name,
            device=self._device,
        )
        try:
            model = FlagReranker(
                self._model_name,
                use_fp16=self._device != "cpu",
                device=self._device,
            )
            logger.info(
                "cross_encoder_loaded",
                model=self._model_name,
                device=self._device,
            )
            return model
        except Exception as e:
            logger.error(
                "cross_encoder_load_failed",
                model=self._model_name,
                device=self._device,
                error=str(e),
            )
            raise ModelLoadError(f"Failed to load {self._model_name}: {e}") from e

    @property
    def device(self) -> str:
        return self._device

    @property
    def model_name(self) -> str:
        return self._model_name

    def compute_scores(
        self,
        query: str,
        passages: list[str],
        normalize: bool = True,
        batch_size: int = 32,
    ) -> list[float]:
        if not passages:
            return []

        pairs = [[query, passage] for passage in passages]

        scores = self._model.compute_score(
            pairs,
            normalize=normalize,
            batch_size=batch_size,
        )

        if isinstance(scores, (int, float)):
            return [float(scores)]

        return [float(s) for s in scores]

    def compute_scores_batch(
        self,
        queries: list[str],
        passages_per_query: list[list[str]],
        normalize: bool = True,
        batch_size: int = 64,
    ) -> list[list[float]]:
        all_pairs: list[list[str]] = []
        indices: list[tuple[int, int]] = []

        for query_idx, (query, passages) in enumerate(
            zip(queries, passages_per_query, strict=True)
        ):
            for passage_idx, passage in enumerate(passages):
                all_pairs.append([query, passage])
                indices.append((query_idx, passage_idx))

        if not all_pairs:
            return [[] for _ in queries]

        all_scores = self._model.compute_score(
            all_pairs,
            normalize=normalize,
            batch_size=batch_size,
        )

        if isinstance(all_scores, (int, float)):
            all_scores = [all_scores]

        results: list[list[float]] = [[] for _ in queries]
        for idx, (query_idx, _) in enumerate(indices):
            results[query_idx].append(float(all_scores[idx]))

        return results


def get_cross_encoder_model() -> CrossEncoderModel:
    global _model_instance

    if _model_instance is not None:
        return _model_instance

    with _model_lock:
        if _model_instance is None:
            _model_instance = CrossEncoderModel()

    return _model_instance
