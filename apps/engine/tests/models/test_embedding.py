from __future__ import annotations

import pytest
from pydantic import ValidationError

from engine.models.embedding import (
    BatchEmbeddingRequest,
    BatchEmbeddingResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    SingleEmbeddingRequest,
    SingleEmbeddingResponse,
)


class TestEmbeddingRequest:
    def test_valid_request(self):
        request = EmbeddingRequest(texts=["hello", "world"])
        assert request.texts == ["hello", "world"]
        assert request.return_sparse is False
        assert request.max_length == 512

    def test_with_options(self):
        request = EmbeddingRequest(
            texts=["test"],
            return_sparse=True,
            max_length=1024,
        )
        assert request.return_sparse is True
        assert request.max_length == 1024

    def test_empty_texts_invalid(self):
        with pytest.raises(ValidationError):
            EmbeddingRequest(texts=[])

    def test_max_length_bounds(self):
        with pytest.raises(ValidationError):
            EmbeddingRequest(texts=["test"], max_length=0)

        with pytest.raises(ValidationError):
            EmbeddingRequest(texts=["test"], max_length=10000)


class TestEmbeddingResponse:
    def test_valid_response(self):
        response = EmbeddingResponse(
            embeddings=[[0.1, 0.2], [0.3, 0.4]],
            model="test-model",
            usage={"total_tokens": 10, "latency_ms": 50.0},
        )
        assert len(response.embeddings) == 2
        assert response.model == "test-model"
        assert response.sparse_embeddings is None

    def test_with_sparse(self):
        response = EmbeddingResponse(
            embeddings=[[0.1]],
            sparse_embeddings=[{"token1": 0.5}],
            model="test",
            usage={"tokens": 5},
        )
        assert response.sparse_embeddings == [{"token1": 0.5}]


class TestSingleEmbeddingRequest:
    def test_valid_request(self):
        request = SingleEmbeddingRequest(text="hello world")
        assert request.text == "hello world"
        assert request.return_sparse is True
        assert request.max_length == 512

    def test_empty_text_invalid(self):
        with pytest.raises(ValidationError):
            SingleEmbeddingRequest(text="")


class TestSingleEmbeddingResponse:
    def test_valid_response(self):
        response = SingleEmbeddingResponse(dense=[0.1, 0.2, 0.3])
        assert response.dense == [0.1, 0.2, 0.3]
        assert response.sparse is None

    def test_with_sparse(self):
        response = SingleEmbeddingResponse(
            dense=[0.1],
            sparse={"word": 0.5},
        )
        assert response.sparse == {"word": 0.5}


class TestBatchEmbeddingRequest:
    def test_valid_request(self):
        request = BatchEmbeddingRequest(texts=["a", "b", "c"])
        assert len(request.texts) == 3
        assert request.mode == "document"

    def test_query_mode(self):
        request = BatchEmbeddingRequest(texts=["query"], mode="query")
        assert request.mode == "query"


class TestBatchEmbeddingResponse:
    def test_valid_response(self):
        response = BatchEmbeddingResponse(
            embeddings=[
                SingleEmbeddingResponse(dense=[0.1]),
                SingleEmbeddingResponse(dense=[0.2]),
            ]
        )
        assert len(response.embeddings) == 2
