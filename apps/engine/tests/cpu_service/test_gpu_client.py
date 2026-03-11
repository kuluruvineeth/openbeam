from __future__ import annotations

import pytest
import respx
from httpx import Response

from engine.common.exceptions import GPUServiceError
from engine.cpu_service.clients.gpu_client import GPUClient


@pytest.fixture
def gpu_client():
    return GPUClient(base_url="http://localhost:8001", timeout_seconds=5.0)


class TestGPUClientEncode:
    @respx.mock
    @pytest.mark.asyncio
    async def test_encode_success(self, gpu_client: GPUClient):
        mock_response = {
            "embeddings": [[0.1, 0.2, 0.3]],
            "sparse_embeddings": None,
            "model": "BAAI/bge-m3",
            "usage": {"total_tokens": 5, "latency_ms": 50.0},
        }

        respx.post("http://localhost:8001/v1/embeddings").mock(
            return_value=Response(200, json=mock_response)
        )

        result = await gpu_client.encode(["test text"])

        assert result.embeddings == [[0.1, 0.2, 0.3]]
        assert result.model == "BAAI/bge-m3"
        assert result.usage["total_tokens"] == 5

    @respx.mock
    @pytest.mark.asyncio
    async def test_encode_with_sparse(self, gpu_client: GPUClient):
        mock_response = {
            "embeddings": [[0.1, 0.2]],
            "sparse_embeddings": [{"token1": 0.5}],
            "model": "BAAI/bge-m3",
            "usage": {"total_tokens": 3, "latency_ms": 60.0},
        }

        respx.post("http://localhost:8001/v1/embeddings").mock(
            return_value=Response(200, json=mock_response)
        )

        result = await gpu_client.encode(["test"], return_sparse=True)

        assert result.sparse_embeddings == [{"token1": 0.5}]

    @respx.mock
    @pytest.mark.asyncio
    async def test_encode_server_error(self, gpu_client: GPUClient):
        respx.post("http://localhost:8001/v1/embeddings").mock(
            return_value=Response(500, text="Internal Server Error")
        )

        with pytest.raises(GPUServiceError) as exc_info:
            await gpu_client.encode(["test"])

        assert exc_info.value.status_code == 500
        assert exc_info.value.retryable is True


class TestGPUClientRerank:
    @respx.mock
    @pytest.mark.asyncio
    async def test_rerank_success(self, gpu_client: GPUClient):
        mock_response = {
            "results": [
                {"index": 1, "score": 0.9, "passage": "passage 2"},
                {"index": 0, "score": 0.7, "passage": "passage 1"},
            ],
            "model": "BAAI/bge-reranker-v2-m3",
            "usage": {"latency_ms": 30.0},
        }

        respx.post("http://localhost:8001/v1/rerank").mock(
            return_value=Response(200, json=mock_response)
        )

        result = await gpu_client.rerank("query", ["passage 1", "passage 2"])

        assert len(result.results) == 2
        assert result.results[0].score == 0.9
        assert result.model == "BAAI/bge-reranker-v2-m3"

    @respx.mock
    @pytest.mark.asyncio
    async def test_rerank_with_top_k(self, gpu_client: GPUClient):
        mock_response = {
            "results": [{"index": 0, "score": 0.9, "passage": "passage 1"}],
            "model": "BAAI/bge-reranker-v2-m3",
            "usage": {"latency_ms": 25.0},
        }

        respx.post("http://localhost:8001/v1/rerank").mock(
            return_value=Response(200, json=mock_response)
        )

        result = await gpu_client.rerank("query", ["p1", "p2", "p3"], top_k=1)

        assert len(result.results) == 1


class TestGPUClientEntities:
    @respx.mock
    @pytest.mark.asyncio
    async def test_extract_entities_success(self, gpu_client: GPUClient):
        mock_response = {
            "entities": [
                {
                    "text": "John",
                    "label": "person",
                    "score": 0.95,
                    "start": 0,
                    "end": 4,
                    "source": "gliner",
                }
            ],
            "model": "urchade/gliner_medium-v2.1",
            "usage": {"latency_ms": 40.0},
        }

        respx.post("http://localhost:8001/v1/entities").mock(
            return_value=Response(200, json=mock_response)
        )

        result = await gpu_client.extract_entities("John works at OpenAI")

        assert len(result.entities) == 1
        assert result.entities[0].text == "John"
        assert result.entities[0].label == "person"

    @respx.mock
    @pytest.mark.asyncio
    async def test_extract_entities_with_labels(self, gpu_client: GPUClient):
        mock_response = {
            "entities": [],
            "model": "urchade/gliner_medium-v2.1",
            "usage": {"latency_ms": 35.0},
        }

        respx.post("http://localhost:8001/v1/entities").mock(
            return_value=Response(200, json=mock_response)
        )

        result = await gpu_client.extract_entities(
            "Hello world",
            labels=["organization"],
            threshold=0.7,
        )

        assert result.entities == []


class TestGPUClientHealth:
    @respx.mock
    @pytest.mark.asyncio
    async def test_health_check(self, gpu_client: GPUClient):
        mock_response = {"status": "healthy", "version": "0.2.0"}

        respx.get("http://localhost:8001/v1/health").mock(
            return_value=Response(200, json=mock_response)
        )

        result = await gpu_client.health()

        assert result["status"] == "healthy"


class TestGPUClientClose:
    @pytest.mark.asyncio
    async def test_close_client(self, gpu_client: GPUClient):
        await gpu_client.close()
        assert gpu_client._client is None

    @pytest.mark.asyncio
    async def test_close_idempotent(self, gpu_client: GPUClient):
        await gpu_client.close()
        await gpu_client.close()
        assert gpu_client._client is None
