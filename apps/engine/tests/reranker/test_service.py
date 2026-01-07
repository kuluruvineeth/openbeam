from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from engine.reranker.service import (
    RerankerService,
    RerankInput,
    RerankOutput,
)


class TestRerankInput:
    def test_dataclass_with_defaults(self):
        doc = RerankInput(doc_id="doc1", content="Some content")
        assert doc.doc_id == "doc1"
        assert doc.content == "Some content"
        assert doc.title is None
        assert doc.original_score is None
        assert doc.original_rank is None

    def test_dataclass_with_all_fields(self):
        doc = RerankInput(
            doc_id="doc1",
            content="Some content",
            title="Test Title",
            original_score=0.8,
            original_rank=1,
        )
        assert doc.title == "Test Title"
        assert doc.original_score == 0.8
        assert doc.original_rank == 1


class TestRerankOutput:
    def test_dataclass_creation(self):
        output = RerankOutput(
            doc_id="doc1",
            score=0.95,
            original_score=0.8,
            original_rank=3,
        )
        assert output.doc_id == "doc1"
        assert output.score == 0.95
        assert output.original_score == 0.8
        assert output.original_rank == 3


class TestRerankerServiceConstants:
    def test_max_content_length(self):
        assert RerankerService.MAX_CONTENT_LENGTH == 512

    def test_default_top_k(self):
        assert RerankerService.DEFAULT_TOP_K == 20

    def test_default_batch_size(self):
        assert RerankerService.DEFAULT_BATCH_SIZE == 32


class TestRerankerServiceInit:
    def test_init_stores_dependencies(self):
        mock_model = MagicMock()
        mock_cache = MagicMock()

        service = RerankerService(model=mock_model, cache=mock_cache)

        assert service._model is mock_model
        assert service._cache is mock_cache


class TestPreparePassage:
    @pytest.fixture
    def service(self):
        mock_model = MagicMock()
        mock_cache = MagicMock()
        return RerankerService(model=mock_model, cache=mock_cache)

    def test_content_only(self, service):
        doc = RerankInput(doc_id="doc1", content="Test content here")
        result = service._prepare_passage(doc)
        assert result == "Test content here"

    def test_with_title(self, service):
        doc = RerankInput(
            doc_id="doc1",
            content="Test content here",
            title="Title",
        )
        result = service._prepare_passage(doc)
        assert result == "Title\n\nTest content here"

    def test_truncates_long_content(self, service):
        long_content = "x" * 1000
        doc = RerankInput(doc_id="doc1", content=long_content)
        result = service._prepare_passage(doc)
        assert len(result) == RerankerService.MAX_CONTENT_LENGTH

    def test_truncates_long_content_with_title(self, service):
        doc = RerankInput(
            doc_id="doc1",
            content="x" * 1000,
            title="Title",
        )
        result = service._prepare_passage(doc)
        assert len(result) == RerankerService.MAX_CONTENT_LENGTH
        assert result.startswith("Title")


class TestModelName:
    def test_returns_model_name(self):
        mock_model = MagicMock()
        mock_model.model_name = "cross-encoder/ms-marco"
        mock_cache = MagicMock()

        service = RerankerService(model=mock_model, cache=mock_cache)

        assert service.model_name == "cross-encoder/ms-marco"


class TestGetStats:
    def test_returns_stats_dict(self):
        mock_model = MagicMock()
        mock_model.model_name = "cross-encoder/ms-marco"
        mock_model.device = "cuda"

        mock_cache = MagicMock()
        mock_cache.get_stats.return_value = {"hits": 10, "misses": 5}

        service = RerankerService(model=mock_model, cache=mock_cache)
        stats = service.get_stats()

        assert stats["model"] == "cross-encoder/ms-marco"
        assert stats["device"] == "cuda"
        assert stats["cache"] == {"hits": 10, "misses": 5}


class TestRerank:
    @pytest.fixture
    def mock_model(self):
        model = MagicMock()
        model.model_name = "cross-encoder/ms-marco"
        return model

    @pytest.fixture
    def mock_cache(self):
        cache = MagicMock()
        cache.get_batch = AsyncMock()
        cache.set_batch = AsyncMock()
        return cache

    @pytest.fixture
    def service(self, mock_model, mock_cache):
        return RerankerService(model=mock_model, cache=mock_cache)

    @pytest.mark.asyncio
    async def test_empty_documents_returns_empty(self, service):
        results, elapsed = await service.rerank("test query", [])
        assert results == []
        assert elapsed == 0.0

    @pytest.mark.asyncio
    async def test_all_cached(self, service, mock_cache, mock_model):
        docs = [
            RerankInput(doc_id="doc1", content="First document"),
            RerankInput(doc_id="doc2", content="Second document"),
        ]

        mock_cache.get_batch.return_value = ([0.9, 0.7], [])

        results, elapsed = await service.rerank("test query", docs)

        assert len(results) == 2
        assert results[0].doc_id == "doc1"
        assert results[0].score == 0.9
        assert results[1].doc_id == "doc2"
        assert results[1].score == 0.7
        mock_model.compute_scores.assert_not_called()
        mock_cache.set_batch.assert_not_called()

    @pytest.mark.asyncio
    async def test_none_cached(self, service, mock_cache, mock_model):
        docs = [
            RerankInput(doc_id="doc1", content="First document"),
            RerankInput(doc_id="doc2", content="Second document"),
        ]

        mock_cache.get_batch.return_value = ([None, None], [0, 1])
        mock_model.compute_scores.return_value = [0.85, 0.6]

        results, elapsed = await service.rerank("test query", docs)

        assert len(results) == 2
        assert results[0].doc_id == "doc1"
        assert results[0].score == 0.85
        mock_model.compute_scores.assert_called_once()
        mock_cache.set_batch.assert_called_once()

    @pytest.mark.asyncio
    async def test_partial_cache(self, service, mock_cache, mock_model):
        docs = [
            RerankInput(doc_id="doc1", content="First document"),
            RerankInput(doc_id="doc2", content="Second document"),
            RerankInput(doc_id="doc3", content="Third document"),
        ]

        mock_cache.get_batch.return_value = ([0.9, None, 0.5], [1])
        mock_model.compute_scores.return_value = [0.7]

        results, _ = await service.rerank("test query", docs)

        assert len(results) == 3
        mock_model.compute_scores.assert_called_once()
        call_args = mock_model.compute_scores.call_args
        assert len(call_args[0][1]) == 1

    @pytest.mark.asyncio
    async def test_respects_top_k(self, service, mock_cache, mock_model):
        docs = [
            RerankInput(doc_id="doc1", content="First"),
            RerankInput(doc_id="doc2", content="Second"),
            RerankInput(doc_id="doc3", content="Third"),
        ]

        mock_cache.get_batch.return_value = ([0.5, 0.9, 0.3], [])

        results, _ = await service.rerank("test query", docs, top_k=2)

        assert len(results) == 2
        assert results[0].doc_id == "doc2"
        assert results[1].doc_id == "doc1"

    @pytest.mark.asyncio
    async def test_sorts_by_score_descending(self, service, mock_cache, mock_model):
        docs = [
            RerankInput(doc_id="doc1", content="First", original_rank=1),
            RerankInput(doc_id="doc2", content="Second", original_rank=2),
            RerankInput(doc_id="doc3", content="Third", original_rank=3),
        ]

        mock_cache.get_batch.return_value = ([0.3, 0.9, 0.6], [])

        results, _ = await service.rerank("test query", docs)

        assert results[0].doc_id == "doc2"
        assert results[0].score == 0.9
        assert results[1].doc_id == "doc3"
        assert results[1].score == 0.6
        assert results[2].doc_id == "doc1"
        assert results[2].score == 0.3

    @pytest.mark.asyncio
    async def test_preserves_original_metadata(self, service, mock_cache, mock_model):
        docs = [
            RerankInput(
                doc_id="doc1",
                content="First",
                original_score=0.8,
                original_rank=1,
            ),
        ]

        mock_cache.get_batch.return_value = ([0.95], [])

        results, _ = await service.rerank("test query", docs)

        assert results[0].original_score == 0.8
        assert results[0].original_rank == 1

    @pytest.mark.asyncio
    async def test_handles_none_scores(self, service, mock_cache, mock_model):
        docs = [
            RerankInput(doc_id="doc1", content="First"),
            RerankInput(doc_id="doc2", content="Second"),
        ]

        mock_cache.get_batch.return_value = ([None, 0.5], [0])
        mock_model.compute_scores.return_value = [None]

        results, _ = await service.rerank("test query", docs)

        assert results[0].doc_id == "doc2"
        assert results[0].score == 0.5
        assert results[1].doc_id == "doc1"
        assert results[1].score == 0.0

    @pytest.mark.asyncio
    async def test_default_top_k_used_when_none(self, service, mock_cache, mock_model):
        docs = [RerankInput(doc_id=f"doc{i}", content=f"Doc {i}") for i in range(30)]

        mock_cache.get_batch.return_value = ([float(i) / 30 for i in range(30)], [])

        results, _ = await service.rerank("test query", docs, top_k=None)

        assert len(results) == RerankerService.DEFAULT_TOP_K

    @pytest.mark.asyncio
    async def test_returns_elapsed_time(self, service, mock_cache, mock_model):
        docs = [RerankInput(doc_id="doc1", content="First")]
        mock_cache.get_batch.return_value = ([0.9], [])

        _, elapsed = await service.rerank("test query", docs)

        assert elapsed >= 0
        assert isinstance(elapsed, float)

    @pytest.mark.asyncio
    async def test_uses_correct_batch_size(self, service, mock_cache, mock_model):
        docs = [RerankInput(doc_id="doc1", content="First")]
        mock_cache.get_batch.return_value = ([None], [0])
        mock_model.compute_scores.return_value = [0.9]

        await service.rerank("test query", docs)

        call_kwargs = mock_model.compute_scores.call_args[1]
        assert call_kwargs["batch_size"] == RerankerService.DEFAULT_BATCH_SIZE

    @pytest.mark.asyncio
    async def test_cache_set_called_with_correct_args(
        self, service, mock_cache, mock_model
    ):
        docs = [RerankInput(doc_id="doc1", content="First")]
        mock_cache.get_batch.return_value = ([None], [0])
        mock_model.compute_scores.return_value = [0.85]

        await service.rerank("test query", docs)

        mock_cache.set_batch.assert_called_once_with(
            "test query",
            ["First"],
            mock_model.model_name,
            [0.85],
        )
