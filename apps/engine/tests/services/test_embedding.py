from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from engine.models.embedding import SingleEmbeddingResponse
from engine.services.embedding import EmbeddingService


class TestEmbeddingServiceConstants:
    def test_query_max_length(self):
        assert EmbeddingService.QUERY_MAX_LENGTH == 256

    def test_document_max_length(self):
        assert EmbeddingService.DOCUMENT_MAX_LENGTH == 512


class TestEmbeddingServiceInit:
    def test_init_stores_dependencies(self):
        mock_model = MagicMock()
        mock_cache = MagicMock()

        service = EmbeddingService(model=mock_model, cache=mock_cache)

        assert service._model is mock_model
        assert service._cache is mock_cache


class TestEmbedQuery:
    @pytest.fixture
    def service(self):
        mock_model = MagicMock()
        mock_cache = AsyncMock()
        return EmbeddingService(model=mock_model, cache=mock_cache)

    @pytest.mark.asyncio
    async def test_returns_cached_result(self, service):
        cached_data = {"dense": [0.1, 0.2], "sparse": {"1": 0.5}}
        service._cache.get.return_value = cached_data

        result = await service.embed_query("test query")

        assert isinstance(result, SingleEmbeddingResponse)
        assert result.dense == [0.1, 0.2]
        assert result.sparse == {"1": 0.5}
        service._model.encode.assert_not_called()

    @pytest.mark.asyncio
    async def test_encodes_when_not_cached(self, service):
        service._cache.get.return_value = None
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1, 0.2]]),
            "lexical_weights": [{1: 0.5, 2: 0.3}],
        }

        result = await service.embed_query("test query")

        service._model.encode.assert_called_once_with(
            ["test query"],
            max_length=EmbeddingService.QUERY_MAX_LENGTH,
        )
        assert isinstance(result, SingleEmbeddingResponse)
        assert result.dense == [0.1, 0.2]

    @pytest.mark.asyncio
    async def test_caches_result(self, service):
        service._cache.get.return_value = None
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1, 0.2]]),
            "lexical_weights": [{1: 0.5}],
        }

        await service.embed_query("test query")

        service._cache.set.assert_called_once()
        call_args = service._cache.set.call_args
        assert call_args[0][0] == "test query"
        assert call_args[0][1] == "query"

    @pytest.mark.asyncio
    async def test_custom_max_length(self, service):
        service._cache.get.return_value = None
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [{}],
        }

        await service.embed_query("test", max_length=128)

        service._model.encode.assert_called_once_with(
            ["test"],
            max_length=128,
        )


class TestEmbedDocument:
    @pytest.fixture
    def service(self):
        mock_model = MagicMock()
        mock_cache = AsyncMock()
        return EmbeddingService(model=mock_model, cache=mock_cache)

    @pytest.mark.asyncio
    async def test_returns_cached_result(self, service):
        cached_data = {"dense": [0.3, 0.4], "sparse": {"5": 0.8}}
        service._cache.get.return_value = cached_data

        result = await service.embed_document("test document")

        assert isinstance(result, SingleEmbeddingResponse)
        assert result.dense == [0.3, 0.4]
        assert result.sparse == {"5": 0.8}
        service._model.encode.assert_not_called()

    @pytest.mark.asyncio
    async def test_encodes_when_not_cached(self, service):
        service._cache.get.return_value = None
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.3, 0.4]]),
            "lexical_weights": [{5: 0.8}],
        }

        result = await service.embed_document("test document")

        service._model.encode.assert_called_once_with(
            ["test document"],
            max_length=EmbeddingService.DOCUMENT_MAX_LENGTH,
        )
        assert isinstance(result, SingleEmbeddingResponse)

    @pytest.mark.asyncio
    async def test_caches_result(self, service):
        service._cache.get.return_value = None
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [{}],
        }

        await service.embed_document("test document")

        service._cache.set.assert_called_once()
        call_args = service._cache.set.call_args
        assert call_args[0][0] == "test document"
        assert call_args[0][1] == "document"

    @pytest.mark.asyncio
    async def test_custom_max_length(self, service):
        service._cache.get.return_value = None
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [{}],
        }

        await service.embed_document("test", max_length=1024)

        service._model.encode.assert_called_once_with(
            ["test"],
            max_length=1024,
        )


class TestEmbedBatch:
    @pytest.fixture
    def service(self):
        mock_model = MagicMock()
        mock_cache = AsyncMock()
        return EmbeddingService(model=mock_model, cache=mock_cache)

    @pytest.mark.asyncio
    async def test_encodes_multiple_texts(self, service):
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1, 0.2], [0.3, 0.4]]),
            "lexical_weights": [{1: 0.5}, {2: 0.6}],
        }

        results = await service.embed_batch(["text1", "text2"])

        assert len(results) == 2
        assert all(isinstance(r, SingleEmbeddingResponse) for r in results)
        assert results[0].dense == [0.1, 0.2]
        assert results[1].dense == [0.3, 0.4]

    @pytest.mark.asyncio
    async def test_document_mode_default(self, service):
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [{}],
        }

        await service.embed_batch(["text"])

        service._model.encode.assert_called_once_with(
            ["text"],
            max_length=EmbeddingService.DOCUMENT_MAX_LENGTH,
        )

    @pytest.mark.asyncio
    async def test_query_mode(self, service):
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [{}],
        }

        await service.embed_batch(["text"], mode="query")

        service._model.encode.assert_called_once_with(
            ["text"],
            max_length=EmbeddingService.QUERY_MAX_LENGTH,
        )

    @pytest.mark.asyncio
    async def test_custom_max_length(self, service):
        service._model.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [{}],
        }

        await service.embed_batch(["text"], max_length=1024)

        service._model.encode.assert_called_once_with(
            ["text"],
            max_length=1024,
        )


class TestSparseToDict:
    @pytest.fixture
    def service(self):
        mock_model = MagicMock()
        mock_cache = AsyncMock()
        return EmbeddingService(model=mock_model, cache=mock_cache)

    def test_converts_int_keys_to_str(self, service):
        result = service._sparse_to_dict({1: 0.5, 2: 0.3})
        assert result == {"1": 0.5, "2": 0.3}

    def test_empty_dict(self, service):
        result = service._sparse_to_dict({})
        assert result == {}

    def test_preserves_float_values(self, service):
        result = service._sparse_to_dict({100: 0.123456})
        assert result == {"100": 0.123456}


class TestGetCacheStats:
    def test_returns_cache_stats(self):
        mock_model = MagicMock()
        mock_cache = MagicMock()
        mock_cache.get_stats.return_value = {
            "memory": 10,
            "redis": 5,
            "disk": 2,
            "miss": 3,
            "hit_rate": 0.85,
        }
        service = EmbeddingService(model=mock_model, cache=mock_cache)

        stats = service.get_cache_stats()

        assert stats["memory"] == 10
        assert stats["hit_rate"] == 0.85
        mock_cache.get_stats.assert_called_once()
