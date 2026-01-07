from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from engine.common.exceptions import GPUServiceError
from engine.common.logging import get_logger
from engine.common.metrics import GPU_SERVICE_CALLS_TOTAL, GPU_SERVICE_LATENCY
from engine.models.embedding import EmbeddingResponse
from engine.models.entity import EntityResponse
from engine.models.rerank import RerankResponse

logger = get_logger(__name__)


class GPUClient:
    def __init__(
        self,
        base_url: str,
        timeout_seconds: float = 30.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = httpx.Timeout(timeout_seconds)
        self._client: httpx.AsyncClient | None = None
        self._lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        async with self._lock:
            if self._client is None or self._client.is_closed:
                self._client = httpx.AsyncClient(
                    base_url=self._base_url,
                    timeout=self._timeout,
                    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
                )
            return self._client

    async def close(self) -> None:
        async with self._lock:
            if self._client is not None and not self._client.is_closed:
                await self._client.aclose()
                self._client = None

    async def _request(
        self,
        method: str,
        endpoint: str,
        json_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        client = await self._get_client()
        start = time.perf_counter()

        try:
            response = await client.request(method, endpoint, json=json_data)
            elapsed = time.perf_counter() - start

            GPU_SERVICE_LATENCY.labels(endpoint=endpoint).observe(elapsed)

            if response.status_code >= 400:
                GPU_SERVICE_CALLS_TOTAL.labels(
                    endpoint=endpoint, status="error"
                ).inc()
                raise GPUServiceError(
                    message=f"GPU service error: {response.text}",
                    status_code=response.status_code,
                    retryable=response.status_code >= 500,
                )

            GPU_SERVICE_CALLS_TOTAL.labels(endpoint=endpoint, status="success").inc()
            result: dict[str, Any] = response.json()
            return result

        except httpx.TimeoutException as e:
            GPU_SERVICE_CALLS_TOTAL.labels(endpoint=endpoint, status="timeout").inc()
            raise GPUServiceError(
                message=f"GPU service timeout: {e}",
                retryable=True,
            ) from e
        except httpx.RequestError as e:
            GPU_SERVICE_CALLS_TOTAL.labels(
                endpoint=endpoint, status="connection_error"
            ).inc()
            raise GPUServiceError(
                message=f"GPU service connection error: {e}",
                retryable=True,
            ) from e

    async def encode(
        self,
        texts: list[str],
        return_sparse: bool = False,
    ) -> EmbeddingResponse:
        data = await self._request(
            "POST",
            "/embeddings",
            json_data={"texts": texts, "return_sparse": return_sparse},
        )
        return EmbeddingResponse.model_validate(data)

    async def rerank(
        self,
        query: str,
        passages: list[str],
        top_k: int | None = None,
    ) -> RerankResponse:
        payload: dict[str, Any] = {"query": query, "passages": passages}
        if top_k is not None:
            payload["top_k"] = top_k

        data = await self._request("POST", "/rerank", json_data=payload)
        return RerankResponse.model_validate(data)

    async def extract_entities(
        self,
        text: str,
        labels: list[str] | None = None,
        threshold: float = 0.5,
    ) -> EntityResponse:
        payload: dict[str, Any] = {"text": text, "threshold": threshold}
        if labels is not None:
            payload["labels"] = labels

        data = await self._request("POST", "/entities", json_data=payload)
        return EntityResponse.model_validate(data)

    async def health(self) -> dict[str, Any]:
        return await self._request("GET", "/health")
