from __future__ import annotations

from engine.gpu_service.providers.protocol import (
    EmbeddingProvider,
    EntityProvider,
    RerankerProvider,
)
from engine.models.embedding import EmbeddingResponse
from engine.models.entity import Entity, EntityResponse
from engine.models.rerank import RerankResponse, RerankResult


class MockEmbeddingProvider:
    def __init__(self, is_ready: bool = True):
        self._ready = is_ready

    async def encode(
        self,
        texts: list[str],
        return_sparse: bool = False,  # noqa: ARG002
    ) -> EmbeddingResponse:
        embeddings = [[0.1 * i for i in range(10)] for _ in texts]
        return EmbeddingResponse(
            embeddings=embeddings,
            sparse_embeddings=None,
            model="mock-embedding",
            usage={"total_tokens": len(texts), "latency_ms": 10.0},
        )

    def ready(self) -> bool:
        return self._ready


class MockRerankerProvider:
    def __init__(self, is_ready: bool = True):
        self._ready = is_ready

    async def rerank(
        self,
        query: str,  # noqa: ARG002
        passages: list[str],
        top_k: int | None = None,
    ) -> RerankResponse:
        results = [
            RerankResult(index=i, score=1.0 - (i * 0.1), passage=p)
            for i, p in enumerate(passages)
        ]
        if top_k is not None:
            results = results[:top_k]
        return RerankResponse(
            results=results,
            model="mock-reranker",
            usage={"latency_ms": 5.0},
        )

    def ready(self) -> bool:
        return self._ready


class MockEntityProvider:
    def __init__(self, is_ready: bool = True):
        self._ready = is_ready

    async def extract(
        self,
        text: str,  # noqa: ARG002
        labels: list[str] | None = None,  # noqa: ARG002
        threshold: float = 0.5,  # noqa: ARG002
    ) -> EntityResponse:
        return EntityResponse(
            entities=[
                Entity(
                    text="Mock",
                    label="test",
                    score=0.9,
                    start=0,
                    end=4,
                    source="mock",
                )
            ],
            model="mock-entity",
            usage={"latency_ms": 3.0},
        )

    def ready(self) -> bool:
        return self._ready


class TestEmbeddingProviderProtocol:
    def test_mock_implements_protocol(self):
        provider = MockEmbeddingProvider()
        assert isinstance(provider, EmbeddingProvider)

    def test_ready_true(self):
        provider = MockEmbeddingProvider(is_ready=True)
        assert provider.ready() is True

    def test_ready_false(self):
        provider = MockEmbeddingProvider(is_ready=False)
        assert provider.ready() is False

    async def test_encode(self):
        provider = MockEmbeddingProvider()
        result = await provider.encode(["hello", "world"])
        assert len(result.embeddings) == 2
        assert result.model == "mock-embedding"


class TestRerankerProviderProtocol:
    def test_mock_implements_protocol(self):
        provider = MockRerankerProvider()
        assert isinstance(provider, RerankerProvider)

    def test_ready(self):
        provider = MockRerankerProvider()
        assert provider.ready() is True

    async def test_rerank(self):
        provider = MockRerankerProvider()
        result = await provider.rerank("query", ["doc1", "doc2", "doc3"])
        assert len(result.results) == 3
        assert result.results[0].score > result.results[1].score

    async def test_rerank_with_top_k(self):
        provider = MockRerankerProvider()
        result = await provider.rerank("query", ["a", "b", "c"], top_k=2)
        assert len(result.results) == 2


class TestEntityProviderProtocol:
    def test_mock_implements_protocol(self):
        provider = MockEntityProvider()
        assert isinstance(provider, EntityProvider)

    def test_ready(self):
        provider = MockEntityProvider()
        assert provider.ready() is True

    async def test_extract(self):
        provider = MockEntityProvider()
        result = await provider.extract("Test text with entities")
        assert len(result.entities) == 1
        assert result.entities[0].source == "mock"
