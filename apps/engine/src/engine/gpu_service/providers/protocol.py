from __future__ import annotations

from typing import TYPE_CHECKING, Protocol, runtime_checkable

if TYPE_CHECKING:
    from engine.models.embedding import EmbeddingResponse
    from engine.models.entity import EntityResponse
    from engine.models.rerank import RerankResponse


@runtime_checkable
class EmbeddingProvider(Protocol):
    async def encode(
        self,
        texts: list[str],
        return_sparse: bool = False,
    ) -> EmbeddingResponse: ...

    def ready(self) -> bool: ...


@runtime_checkable
class RerankerProvider(Protocol):
    async def rerank(
        self,
        query: str,
        passages: list[str],
        top_k: int | None = None,
    ) -> RerankResponse: ...

    def ready(self) -> bool: ...


@runtime_checkable
class EntityProvider(Protocol):
    async def extract(
        self,
        text: str,
        labels: list[str] | None = None,
        threshold: float = 0.5,
    ) -> EntityResponse: ...

    def ready(self) -> bool: ...
