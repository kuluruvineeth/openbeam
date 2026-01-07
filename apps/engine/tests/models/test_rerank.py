from __future__ import annotations

import pytest
from pydantic import ValidationError

from engine.models.rerank import (
    RerankDocument,
    RerankDocumentResult,
    RerankDocumentsRequest,
    RerankDocumentsResponse,
    RerankRequest,
    RerankResponse,
    RerankResult,
    RerankStatsResponse,
)


class TestRerankDocument:
    def test_valid_document(self):
        doc = RerankDocument(
            id="doc123",
            content="This is the document content",
        )
        assert doc.id == "doc123"
        assert doc.content == "This is the document content"
        assert doc.title is None
        assert doc.score is None
        assert doc.rank is None

    def test_with_all_fields(self):
        doc = RerankDocument(
            id="doc456",
            content="Content",
            title="Document Title",
            score=0.85,
            rank=3,
        )
        assert doc.title == "Document Title"
        assert doc.score == 0.85
        assert doc.rank == 3


class TestRerankRequest:
    def test_valid_request(self):
        request = RerankRequest(
            query="search query",
            passages=["passage 1", "passage 2"],
        )
        assert request.query == "search query"
        assert len(request.passages) == 2
        assert request.top_k is None

    def test_with_top_k(self):
        request = RerankRequest(
            query="query",
            passages=["p1"],
            top_k=5,
        )
        assert request.top_k == 5

    def test_empty_query_invalid(self):
        with pytest.raises(ValidationError):
            RerankRequest(query="", passages=["test"])

    def test_empty_passages_invalid(self):
        with pytest.raises(ValidationError):
            RerankRequest(query="test", passages=[])

    def test_top_k_bounds(self):
        with pytest.raises(ValidationError):
            RerankRequest(query="test", passages=["p"], top_k=0)

        with pytest.raises(ValidationError):
            RerankRequest(query="test", passages=["p"], top_k=101)


class TestRerankDocumentsRequest:
    def test_valid_request(self):
        request = RerankDocumentsRequest(
            query="search",
            documents=[
                RerankDocument(id="1", content="doc1"),
                RerankDocument(id="2", content="doc2"),
            ],
        )
        assert len(request.documents) == 2
        assert request.top_k == 20

    def test_custom_top_k(self):
        request = RerankDocumentsRequest(
            query="test",
            documents=[RerankDocument(id="1", content="c")],
            top_k=10,
        )
        assert request.top_k == 10


class TestRerankResult:
    def test_valid_result(self):
        result = RerankResult(
            index=0,
            score=0.95,
            passage="relevant passage",
        )
        assert result.index == 0
        assert result.score == 0.95
        assert result.passage == "relevant passage"


class TestRerankDocumentResult:
    def test_valid_result(self):
        result = RerankDocumentResult(
            id="doc123",
            score=0.88,
            original_score=0.75,
            original_rank=5,
        )
        assert result.id == "doc123"
        assert result.score == 0.88
        assert result.original_score == 0.75
        assert result.original_rank == 5

    def test_without_original_values(self):
        result = RerankDocumentResult(
            id="doc456",
            score=0.9,
            original_score=None,
            original_rank=None,
        )
        assert result.original_score is None
        assert result.original_rank is None


class TestRerankResponse:
    def test_valid_response(self):
        response = RerankResponse(
            results=[
                RerankResult(index=1, score=0.95, passage="best"),
                RerankResult(index=0, score=0.80, passage="second"),
            ],
            model="bge-reranker",
            usage={"latency_ms": 50.0},
        )
        assert len(response.results) == 2
        assert response.model == "bge-reranker"
        assert response.results[0].score > response.results[1].score

    def test_empty_results(self):
        response = RerankResponse(
            results=[],
            model="test",
            usage={"latency_ms": 10.0},
        )
        assert response.results == []


class TestRerankDocumentsResponse:
    def test_valid_response(self):
        response = RerankDocumentsResponse(
            results=[
                RerankDocumentResult(
                    id="1", score=0.9, original_score=0.7, original_rank=2
                )
            ],
            elapsed_ms=45.5,
            model="test-model",
        )
        assert len(response.results) == 1
        assert response.elapsed_ms == 45.5


class TestRerankStatsResponse:
    def test_valid_response(self):
        response = RerankStatsResponse(
            model="bge-reranker-v2-m3",
            device="cuda",
            cache={"hits": 100, "misses": 20},
        )
        assert response.model == "bge-reranker-v2-m3"
        assert response.device == "cuda"
        assert response.cache["hits"] == 100
