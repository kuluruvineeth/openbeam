from __future__ import annotations

import asyncio

import pytest

from engine.gpu_service.batching.dynamic_batcher import (
    BatchRequest,
    DynamicBatcher,
    EmbeddingBatcher,
    RerankBatcher,
)


class TestBatchRequest:
    def test_create_request(self):
        request: BatchRequest[str] = BatchRequest(data="test")
        assert request.data == "test"
        assert not request.future.done()
        assert request.created_at > 0

    def test_request_with_future(self):
        request: BatchRequest[int] = BatchRequest(data=42)
        request.future.set_result("result")
        assert request.future.done()
        assert request.future.result() == "result"


class SimpleBatcher(DynamicBatcher[int, int]):
    def __init__(self, multiplier: int = 2):
        super().__init__(max_batch_size=4, max_wait_ms=50, name="simple")
        self._multiplier = multiplier

    async def _process_batch(self, items: list[int]) -> list[int]:
        return [item * self._multiplier for item in items]


class TestDynamicBatcher:
    @pytest.mark.asyncio
    async def test_start_stop(self):
        batcher = SimpleBatcher()
        assert not batcher.is_running

        await batcher.start()
        assert batcher.is_running

        await batcher.stop()
        assert not batcher.is_running

    @pytest.mark.asyncio
    async def test_start_idempotent(self):
        batcher = SimpleBatcher()
        await batcher.start()
        await batcher.start()
        assert batcher.is_running
        await batcher.stop()

    @pytest.mark.asyncio
    async def test_stop_idempotent(self):
        batcher = SimpleBatcher()
        await batcher.stop()
        await batcher.stop()
        assert not batcher.is_running

    @pytest.mark.asyncio
    async def test_submit_not_running_raises(self):
        batcher = SimpleBatcher()
        with pytest.raises(RuntimeError, match="not running"):
            await batcher.submit(1)

    @pytest.mark.asyncio
    async def test_single_request(self):
        batcher = SimpleBatcher(multiplier=3)
        await batcher.start()
        try:
            result = await batcher.submit(5)
            assert result == 15
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_multiple_concurrent_requests(self):
        batcher = SimpleBatcher(multiplier=2)
        await batcher.start()
        try:
            results = await asyncio.gather(
                batcher.submit(1),
                batcher.submit(2),
                batcher.submit(3),
            )
            assert results == [2, 4, 6]
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_batch_size_limit(self):
        batcher = SimpleBatcher()
        batcher._max_batch_size = 2
        await batcher.start()
        try:
            results = await asyncio.gather(
                batcher.submit(1),
                batcher.submit(2),
                batcher.submit(3),
                batcher.submit(4),
            )
            assert sorted(results) == [2, 4, 6, 8]
        finally:
            await batcher.stop()


class TestEmbeddingBatcher:
    @pytest.mark.asyncio
    async def test_embedding_batcher(self):
        async def mock_encode(texts: list[str]) -> list[list[float]]:
            return [[float(len(t))] for t in texts]

        batcher = EmbeddingBatcher(encode_fn=mock_encode, max_batch_size=10)
        await batcher.start()
        try:
            result = await batcher.submit(["hello", "world"])
            assert result == [[5.0], [5.0]]
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_embedding_empty_input(self):
        async def mock_encode(texts: list[str]) -> list[list[float]]:
            return [[1.0] for _ in texts]

        batcher = EmbeddingBatcher(encode_fn=mock_encode)
        await batcher.start()
        try:
            result = await batcher.submit([])
            assert result == []
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_embedding_concurrent_batches(self):
        call_count = 0

        async def mock_encode(texts: list[str]) -> list[list[float]]:
            nonlocal call_count
            call_count += 1
            return [[float(len(t))] for t in texts]

        batcher = EmbeddingBatcher(encode_fn=mock_encode, max_batch_size=10)
        await batcher.start()
        try:
            results = await asyncio.gather(
                batcher.submit(["a"]),
                batcher.submit(["bb"]),
                batcher.submit(["ccc"]),
            )
            assert results == [[[1.0]], [[2.0]], [[3.0]]]
        finally:
            await batcher.stop()


class TestRerankBatcher:
    @pytest.mark.asyncio
    async def test_rerank_batcher(self):
        async def mock_rerank(pairs: list[tuple[str, str]]) -> list[float]:
            return [float(len(q) + len(p)) for q, p in pairs]

        batcher = RerankBatcher(rerank_fn=mock_rerank, max_batch_size=10)
        await batcher.start()
        try:
            result = await batcher.submit(("query", ["doc1", "doc2"]))
            assert result == [9.0, 9.0]
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_rerank_empty_passages(self):
        async def mock_rerank(pairs: list[tuple[str, str]]) -> list[float]:
            return [1.0 for _ in pairs]

        batcher = RerankBatcher(rerank_fn=mock_rerank)
        await batcher.start()
        try:
            result = await batcher.submit(("query", []))
            assert result == []
        finally:
            await batcher.stop()


class FailingBatcher(DynamicBatcher[int, int]):
    def __init__(self, fail_on: set[int] | None = None, fail_all: bool = False):
        super().__init__(max_batch_size=4, max_wait_ms=50, name="failing")
        self._fail_on = fail_on or set()
        self._fail_all = fail_all
        self._process_count = 0

    async def _process_batch(self, items: list[int]) -> list[int]:
        self._process_count += 1
        if self._fail_all:
            raise RuntimeError("Batch processing failed")
        return [item * 2 if item not in self._fail_on else -1 for item in items]


class TestBatcherErrorHandling:
    @pytest.mark.asyncio
    async def test_process_batch_exception_propagates_to_futures(self):
        batcher = FailingBatcher(fail_all=True)
        await batcher.start()
        try:
            with pytest.raises(RuntimeError, match="Batch processing failed"):
                await batcher.submit(1)
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_multiple_futures_receive_same_exception(self):
        batcher = FailingBatcher(fail_all=True)
        await batcher.start()
        try:
            tasks = [
                asyncio.create_task(batcher.submit(1)),
                asyncio.create_task(batcher.submit(2)),
                asyncio.create_task(batcher.submit(3)),
            ]
            await asyncio.sleep(0.1)

            for task in tasks:
                with pytest.raises(RuntimeError, match="Batch processing failed"):
                    await task
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_batcher_continues_after_batch_failure(self):
        call_count = 0

        class RecoveringBatcher(DynamicBatcher[int, int]):
            async def _process_batch(self, items: list[int]) -> list[int]:
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    raise RuntimeError("First batch fails")
                return [x * 2 for x in items]

        batcher = RecoveringBatcher(max_batch_size=2, max_wait_ms=20, name="recovering")
        await batcher.start()
        try:
            with pytest.raises(RuntimeError, match="First batch fails"):
                await batcher.submit(1)

            result = await batcher.submit(5)
            assert result == 10
            assert call_count == 2
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_embedding_batcher_encode_failure(self):
        async def failing_encode(texts: list[str]) -> list[list[float]]:
            raise ValueError("Encoding failed")

        batcher = EmbeddingBatcher(encode_fn=failing_encode)
        await batcher.start()
        try:
            with pytest.raises(ValueError, match="Encoding failed"):
                await batcher.submit(["hello"])
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_rerank_batcher_rerank_failure(self):
        async def failing_rerank(pairs: list[tuple[str, str]]) -> list[float]:
            raise ConnectionError("Model service unavailable")

        batcher = RerankBatcher(rerank_fn=failing_rerank)
        await batcher.start()
        try:
            with pytest.raises(ConnectionError, match="Model service unavailable"):
                await batcher.submit(("query", ["doc"]))
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_concurrent_failures_isolated(self):
        failure_count = 0

        class AlternatingBatcher(DynamicBatcher[int, int]):
            async def _process_batch(self, items: list[int]) -> list[int]:
                nonlocal failure_count
                failure_count += 1
                if failure_count % 2 == 1:
                    raise RuntimeError(f"Failure {failure_count}")
                return [x * 2 for x in items]

        batcher = AlternatingBatcher(max_batch_size=1, max_wait_ms=10, name="alternating")
        await batcher.start()
        try:
            with pytest.raises(RuntimeError, match="Failure 1"):
                await batcher.submit(1)

            result = await batcher.submit(2)
            assert result == 4

            with pytest.raises(RuntimeError, match="Failure 3"):
                await batcher.submit(3)

            result = await batcher.submit(4)
            assert result == 8
        finally:
            await batcher.stop()


class TestBatcherEdgeCases:
    @pytest.mark.asyncio
    async def test_stop_while_processing(self):
        processed = []

        class SlowBatcher(DynamicBatcher[int, int]):
            async def _process_batch(self, items: list[int]) -> list[int]:
                await asyncio.sleep(0.1)
                processed.extend(items)
                return [x * 2 for x in items]

        batcher = SlowBatcher(max_batch_size=4, max_wait_ms=10, name="slow")
        await batcher.start()

        task = asyncio.create_task(batcher.submit(42))
        await asyncio.sleep(0.02)
        await batcher.stop()

        await asyncio.sleep(0.2)
        assert not batcher.is_running

    @pytest.mark.asyncio
    async def test_large_batch_split_processing(self):
        batch_sizes = []

        class TrackingBatcher(DynamicBatcher[int, int]):
            async def _process_batch(self, items: list[int]) -> list[int]:
                batch_sizes.append(len(items))
                return [x * 2 for x in items]

        batcher = TrackingBatcher(max_batch_size=3, max_wait_ms=50, name="tracking")
        await batcher.start()
        try:
            results = await asyncio.gather(
                batcher.submit(1),
                batcher.submit(2),
                batcher.submit(3),
                batcher.submit(4),
                batcher.submit(5),
            )
            assert sorted(results) == [2, 4, 6, 8, 10]
            assert all(size <= 3 for size in batch_sizes)
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_rapid_submit_and_stop(self):
        batcher = SimpleBatcher()
        await batcher.start()
        task = asyncio.create_task(batcher.submit(1))
        await batcher.stop()
        assert not batcher.is_running

    @pytest.mark.asyncio
    async def test_embedding_batcher_mixed_sizes(self):
        async def mock_encode(texts: list[str]) -> list[list[float]]:
            return [[float(len(t))] for t in texts]

        batcher = EmbeddingBatcher(encode_fn=mock_encode, max_batch_size=10)
        await batcher.start()
        try:
            results = await asyncio.gather(
                batcher.submit(["a"]),
                batcher.submit(["bb", "ccc"]),
                batcher.submit([]),
                batcher.submit(["dddd"]),
            )
            assert results[0] == [[1.0]]
            assert results[1] == [[2.0], [3.0]]
            assert results[2] == []
            assert results[3] == [[4.0]]
        finally:
            await batcher.stop()


class TestBatcherTimeouts:
    @pytest.mark.asyncio
    async def test_max_wait_triggers_batch(self):
        processed_at = []

        class TimedBatcher(DynamicBatcher[int, int]):
            async def _process_batch(self, items: list[int]) -> list[int]:
                processed_at.append(asyncio.get_event_loop().time())
                return [x * 2 for x in items]

        batcher = TimedBatcher(max_batch_size=100, max_wait_ms=50, name="timed")
        await batcher.start()
        try:
            start = asyncio.get_event_loop().time()
            result = await batcher.submit(1)
            elapsed = asyncio.get_event_loop().time() - start

            assert result == 2
            assert elapsed < 0.2
        finally:
            await batcher.stop()

    @pytest.mark.asyncio
    async def test_batch_fills_before_timeout(self):
        batch_sizes = []

        class SizingBatcher(DynamicBatcher[int, int]):
            async def _process_batch(self, items: list[int]) -> list[int]:
                batch_sizes.append(len(items))
                return [x * 2 for x in items]

        batcher = SizingBatcher(max_batch_size=3, max_wait_ms=1000, name="sizing")
        await batcher.start()
        try:
            results = await asyncio.gather(
                batcher.submit(1),
                batcher.submit(2),
                batcher.submit(3),
            )
            assert sorted(results) == [2, 4, 6]
            assert 3 in batch_sizes
        finally:
            await batcher.stop()
