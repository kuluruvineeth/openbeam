from __future__ import annotations

import time
from dataclasses import dataclass

from engine.core.logging import get_logger

from .cache import RerankCache
from .model import CrossEncoderModel

logger = get_logger(__name__)


@dataclass
class RerankInput:
    doc_id: str
    content: str
    title: str | None = None
    original_score: float | None = None
    original_rank: int | None = None


@dataclass
class RerankOutput:
    doc_id: str
    score: float
    original_score: float | None
    original_rank: int | None


class RerankerService:
    MAX_CONTENT_LENGTH = 512
    DEFAULT_TOP_K = 20
    DEFAULT_BATCH_SIZE = 32

    def __init__(
        self,
        model: CrossEncoderModel,
        cache: RerankCache,
    ) -> None:
        self._model = model
        self._cache = cache

    async def rerank(
        self,
        query: str,
        documents: list[RerankInput],
        top_k: int | None = None,
    ) -> tuple[list[RerankOutput], float]:
        start_time = time.perf_counter()
        top_k = top_k or self.DEFAULT_TOP_K

        if not documents:
            return [], 0.0

        passages = [self._prepare_passage(doc) for doc in documents]
        cached_scores, uncached_indices = await self._cache.get_batch(
            query,
            passages,
            self._model.model_name,
        )

        scores = list(cached_scores)

        if uncached_indices:
            uncached_passages = [passages[i] for i in uncached_indices]
            computed_scores = self._model.compute_scores(
                query,
                uncached_passages,
                normalize=True,
                batch_size=self.DEFAULT_BATCH_SIZE,
            )

            for idx, score in zip(uncached_indices, computed_scores, strict=True):
                scores[idx] = score

            await self._cache.set_batch(
                query,
                uncached_passages,
                self._model.model_name,
                computed_scores,
            )

        ranked_docs = sorted(
            zip(documents, scores, strict=True),
            key=lambda x: x[1] if x[1] is not None else 0,
            reverse=True,
        )[:top_k]

        results = [
            RerankOutput(
                doc_id=doc.doc_id,
                score=score if score is not None else 0.0,
                original_score=doc.original_score,
                original_rank=doc.original_rank,
            )
            for doc, score in ranked_docs
        ]

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        logger.info(
            "rerank_completed",
            query_length=len(query),
            input_docs=len(documents),
            output_docs=len(results),
            cache_hits=len(documents) - len(uncached_indices),
            elapsed_ms=round(elapsed_ms, 2),
        )

        return results, elapsed_ms

    def _prepare_passage(self, doc: RerankInput) -> str:
        if doc.title:
            text = f"{doc.title}\n\n{doc.content}"
        else:
            text = doc.content

        if len(text) > self.MAX_CONTENT_LENGTH:
            text = text[: self.MAX_CONTENT_LENGTH]

        return text

    @property
    def model_name(self) -> str:
        return self._model.model_name

    def get_stats(self) -> dict[str, str | dict[str, int | float]]:
        return {
            "model": self._model.model_name,
            "device": self._model.device,
            "cache": self._cache.get_stats(),
        }
