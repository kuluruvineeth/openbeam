from __future__ import annotations

import asyncio
import contextlib
import time
from dataclasses import dataclass, field
from collections.abc import Awaitable, Callable
from typing import Any

from engine.common.logging import get_logger

logger = get_logger(__name__)


@dataclass
class BatchRequest[T, R]:
    data: T
    future: asyncio.Future[R] = field(default_factory=asyncio.Future)
    created_at: float = field(default_factory=time.perf_counter)


class DynamicBatcher[T, R]:
    def __init__(
        self,
        max_batch_size: int = 32,
        max_wait_ms: float = 50.0,
        name: str = "batcher",
    ) -> None:
        self._max_batch_size = max_batch_size
        self._max_wait_seconds = max_wait_ms / 1000.0
        self._name = name
        self._queue: asyncio.Queue[BatchRequest[T, R]] = asyncio.Queue()
        self._running = False
        self._task: asyncio.Task[None] | None = None

    @property
    def is_running(self) -> bool:
        return self._running

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._batch_loop())
        logger.info("batcher_started", name=self._name)

    async def stop(self) -> None:
        if not self._running:
            return
        self._running = False
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        logger.info("batcher_stopped", name=self._name)

    async def submit(self, data: T) -> R:
        if not self._running:
            raise RuntimeError(f"Batcher {self._name} is not running")

        request: BatchRequest[T, R] = BatchRequest(data=data)
        await self._queue.put(request)
        result: R = await request.future
        return result

    async def _batch_loop(self) -> None:
        while self._running:
            batch = await self._collect_batch()
            if not batch:
                continue

            try:
                results = await self._process_batch([req.data for req in batch])
                for req, result in zip(batch, results, strict=True):
                    if not req.future.done():
                        req.future.set_result(result)
            except Exception as e:
                logger.error("batch_processing_failed", name=self._name, error=str(e))
                for req in batch:
                    if not req.future.done():
                        req.future.set_exception(e)

    async def _collect_batch(self) -> list[BatchRequest[T, R]]:
        batch: list[BatchRequest[T, R]] = []
        deadline = time.perf_counter() + self._max_wait_seconds

        try:
            first = await asyncio.wait_for(
                self._queue.get(),
                timeout=1.0,
            )
            batch.append(first)
        except TimeoutError:
            return []

        while len(batch) < self._max_batch_size:
            remaining = deadline - time.perf_counter()
            if remaining <= 0:
                break

            try:
                item = await asyncio.wait_for(
                    self._queue.get(),
                    timeout=remaining,
                )
                batch.append(item)
            except TimeoutError:
                break

        return batch

    async def _process_batch(self, items: list[T]) -> list[R]:
        raise NotImplementedError("Subclasses must implement _process_batch")


class EmbeddingBatcher(DynamicBatcher[list[str], list[list[float]]]):
    def __init__(
        self,
        encode_fn: Callable[[list[str]], Awaitable[list[list[float]]]],
        max_batch_size: int = 32,
        max_wait_ms: float = 50.0,
    ) -> None:
        super().__init__(
            max_batch_size=max_batch_size,
            max_wait_ms=max_wait_ms,
            name="embedding",
        )
        self._encode_fn = encode_fn

    async def _process_batch(
        self, items: list[list[str]]
    ) -> list[list[list[float]]]:
        flattened = [text for texts in items for text in texts]
        lengths = [len(texts) for texts in items]

        if not flattened:
            return [[] for _ in items]

        all_embeddings = await self._encode_fn(flattened)

        results: list[list[list[float]]] = []
        offset = 0
        for length in lengths:
            results.append(all_embeddings[offset : offset + length])
            offset += length

        return results


class RerankBatcher(DynamicBatcher[tuple[str, list[str]], list[float]]):
    def __init__(
        self,
        rerank_fn: Callable[[list[tuple[str, str]]], Awaitable[list[float]]],
        max_batch_size: int = 16,
        max_wait_ms: float = 50.0,
    ) -> None:
        super().__init__(
            max_batch_size=max_batch_size,
            max_wait_ms=max_wait_ms,
            name="rerank",
        )
        self._rerank_fn = rerank_fn

    async def _process_batch(
        self, items: list[tuple[str, list[str]]]
    ) -> list[list[float]]:
        all_pairs: list[tuple[str, str]] = []
        lengths: list[int] = []

        for query, passages in items:
            for passage in passages:
                all_pairs.append((query, passage))
            lengths.append(len(passages))

        if not all_pairs:
            return [[] for _ in items]

        all_scores = await self._rerank_fn(all_pairs)

        results: list[list[float]] = []
        offset = 0
        for length in lengths:
            results.append(all_scores[offset : offset + length])
            offset += length

        return results
