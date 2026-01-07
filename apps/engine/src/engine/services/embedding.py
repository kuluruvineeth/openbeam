from __future__ import annotations

from typing import TYPE_CHECKING

from engine.embeddings.cache import CacheStats
from engine.models.embedding import SingleEmbeddingResponse

if TYPE_CHECKING:
    from engine.embeddings.cache import EmbeddingCache
    from engine.embeddings.model import BGEM3


class EmbeddingService:
    QUERY_MAX_LENGTH = 256
    DOCUMENT_MAX_LENGTH = 512

    def __init__(self, model: BGEM3, cache: EmbeddingCache) -> None:
        self._model = model
        self._cache = cache

    async def embed_query(
        self,
        text: str,
        max_length: int | None = None,
    ) -> SingleEmbeddingResponse:
        length = max_length or self.QUERY_MAX_LENGTH
        cached = await self._cache.get(text, "query")
        if cached:
            return SingleEmbeddingResponse(dense=cached["dense"], sparse=cached["sparse"])

        result = self._model.encode([text], max_length=length)
        dense = result["dense_vecs"][0].tolist()
        sparse = self._sparse_to_dict(result["lexical_weights"][0])
        await self._cache.set(text, "query", {"dense": dense, "sparse": sparse})
        return SingleEmbeddingResponse(dense=dense, sparse=sparse)

    async def embed_document(
        self,
        text: str,
        max_length: int | None = None,
    ) -> SingleEmbeddingResponse:
        length = max_length or self.DOCUMENT_MAX_LENGTH
        cached = await self._cache.get(text, "document")
        if cached:
            return SingleEmbeddingResponse(dense=cached["dense"], sparse=cached["sparse"])

        result = self._model.encode([text], max_length=length)
        dense = result["dense_vecs"][0].tolist()
        sparse = self._sparse_to_dict(result["lexical_weights"][0])
        await self._cache.set(text, "document", {"dense": dense, "sparse": sparse})
        return SingleEmbeddingResponse(dense=dense, sparse=sparse)

    async def embed_batch(
        self,
        texts: list[str],
        mode: str = "document",
        max_length: int | None = None,
    ) -> list[SingleEmbeddingResponse]:
        length = max_length or (
            self.QUERY_MAX_LENGTH if mode == "query" else self.DOCUMENT_MAX_LENGTH
        )
        result = self._model.encode(texts, max_length=length)
        return [
            SingleEmbeddingResponse(
                dense=result["dense_vecs"][i].tolist(),
                sparse=self._sparse_to_dict(result["lexical_weights"][i]),
            )
            for i in range(len(texts))
        ]

    def _sparse_to_dict(self, weights: dict[int, float]) -> dict[str, float]:
        return {str(k): float(v) for k, v in weights.items()}

    def get_cache_stats(self) -> CacheStats:
        return self._cache.get_stats()
