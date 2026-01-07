from __future__ import annotations

import asyncio
import json
import tempfile
from typing import TYPE_CHECKING

import pytest

from engine.embeddings.cache import EmbeddingCache, EmbeddingData
from engine.reranker.cache import RerankCache

if TYPE_CHECKING:
    from redis.asyncio import Redis


@pytest.mark.integration
class TestEmbeddingCacheHierarchy:
    @pytest.fixture
    async def cache(self, redis_client: Redis, temp_dir: str):
        cache = EmbeddingCache(
            redis_client=redis_client,
            memory_size=100,
            disk_path=temp_dir,
        )
        yield cache
        await cache.close()

    @pytest.mark.asyncio
    async def test_miss_then_set_then_memory_hit(self, cache: EmbeddingCache):
        data: EmbeddingData = {"dense": [0.1, 0.2, 0.3], "sparse": None}

        result = await cache.get("text", "model")
        assert result is None
        assert cache._stats["miss"] == 1

        await cache.set("text", "model", data)

        result = await cache.get("text", "model")
        assert result == data
        assert cache._stats["memory"] == 1

    @pytest.mark.asyncio
    async def test_redis_fallback_when_memory_cleared(
        self, cache: EmbeddingCache, redis_client: Redis
    ):
        data: EmbeddingData = {"dense": [0.5, 0.6], "sparse": {"token": 0.9}}

        await cache.set("text", "model", data)
        cache._memory.clear()

        result = await cache.get("text", "model")
        assert result == data
        assert cache._stats["redis"] == 1

    @pytest.mark.asyncio
    async def test_disk_fallback_when_redis_empty(self, cache: EmbeddingCache):
        data: EmbeddingData = {"dense": [0.7, 0.8], "sparse": None}

        key = cache._key("text", "model")
        cache._disk.set(key, data)

        result = await cache.get("text", "model")
        assert result == data
        assert cache._stats["disk"] == 1

    @pytest.mark.asyncio
    async def test_full_fallback_chain(
        self, cache: EmbeddingCache, redis_client: Redis
    ):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}

        await cache.set("text", "model", data)

        result1 = await cache.get("text", "model")
        assert result1 == data
        assert cache._stats["memory"] == 1

        cache._memory.clear()
        result2 = await cache.get("text", "model")
        assert result2 == data
        assert cache._stats["redis"] == 1

        cache._memory.clear()
        key = cache._key("text", "model")
        await redis_client.delete(f"emb:{key}")
        result3 = await cache.get("text", "model")
        assert result3 == data
        assert cache._stats["disk"] == 1

    @pytest.mark.asyncio
    async def test_memory_promotion_from_redis(
        self, cache: EmbeddingCache, redis_client: Redis
    ):
        data: EmbeddingData = {"dense": [0.3, 0.4], "sparse": None}
        key = cache._key("text", "model")

        await redis_client.setex(f"emb:{key}", 3600, json.dumps(data))

        assert key not in cache._memory

        result = await cache.get("text", "model")
        assert result == data
        assert key in cache._memory

    @pytest.mark.asyncio
    async def test_memory_promotion_from_disk(self, cache: EmbeddingCache):
        data: EmbeddingData = {"dense": [0.9, 0.1], "sparse": None}
        key = cache._key("text", "model")

        cache._disk.set(key, data)
        assert key not in cache._memory

        result = await cache.get("text", "model")
        assert result == data
        assert key in cache._memory

    @pytest.mark.asyncio
    async def test_memory_eviction_under_pressure(self, redis_client: Redis):
        with tempfile.TemporaryDirectory() as tmpdir:
            cache = EmbeddingCache(
                redis_client=redis_client,
                memory_size=3,
                disk_path=tmpdir,
            )
            data: EmbeddingData = {"dense": [0.1], "sparse": None}

            await cache.set("text1", "model", data)
            await cache.set("text2", "model", data)
            await cache.set("text3", "model", data)
            await cache.set("text4", "model", data)

            assert len(cache._memory) == 3

            key1 = cache._key("text1", "model")
            assert key1 not in cache._memory

            result = await cache.get("text1", "model")
            assert result == data
            assert cache._stats["redis"] == 1

            await cache.close()

    @pytest.mark.asyncio
    async def test_concurrent_access(self, cache: EmbeddingCache):
        data: EmbeddingData = {"dense": [0.5, 0.5], "sparse": None}

        async def set_and_get(text: str) -> EmbeddingData | None:
            await cache.set(text, "model", data)
            return await cache.get(text, "model")

        tasks = [set_and_get(f"text{i}") for i in range(50)]
        results = await asyncio.gather(*tasks)

        assert all(r == data for r in results)

    @pytest.mark.asyncio
    async def test_stats_accuracy(self, cache: EmbeddingCache):
        data: EmbeddingData = {"dense": [0.1], "sparse": None}

        await cache.get("miss1", "model")
        await cache.get("miss2", "model")

        await cache.set("hit", "model", data)
        await cache.get("hit", "model")
        await cache.get("hit", "model")

        stats = cache.get_stats()
        assert stats["miss"] == 2
        assert stats["memory"] == 2
        assert stats["hit_rate"] == pytest.approx(0.5)


@pytest.mark.integration
class TestRerankCacheHierarchy:
    @pytest.fixture
    async def cache(self, redis_client: Redis):
        yield RerankCache(redis_client=redis_client)

    @pytest.mark.asyncio
    async def test_miss_then_set_then_memory_hit(self, cache: RerankCache):
        result = await cache.get("query", "passage", "model")
        assert result is None
        assert cache._stats["misses"] == 1

        await cache.set("query", "passage", "model", 0.85)

        result = await cache.get("query", "passage", "model")
        assert result == 0.85
        assert cache._stats["memory_hits"] == 1

    @pytest.mark.asyncio
    async def test_redis_fallback_when_memory_cleared(
        self, cache: RerankCache, redis_client: Redis
    ):
        await cache.set("query", "passage", "model", 0.92)
        cache._memory.clear()

        result = await cache.get("query", "passage", "model")
        assert result == 0.92
        assert cache._stats["redis_hits"] == 1

    @pytest.mark.asyncio
    async def test_batch_get_with_mixed_hits(
        self, cache: RerankCache, redis_client: Redis
    ):
        await cache.set("q", "p1", "m", 0.9)
        await cache.set("q", "p2", "m", 0.8)

        cache._memory.clear()
        key1 = cache._make_key("q", "p1", "m")
        await redis_client.delete(f"{RerankCache.REDIS_KEY_PREFIX}{key1}")

        results, uncached = await cache.get_batch("q", ["p1", "p2", "p3"], "m")

        assert results[0] is None
        assert results[1] == 0.8
        assert results[2] is None
        assert uncached == [0, 2]

    @pytest.mark.asyncio
    async def test_lru_eviction_behavior(self, redis_client: Redis):
        from unittest.mock import patch

        with patch.object(RerankCache, "MEMORY_SIZE", 3):
            cache = RerankCache(redis_client=redis_client)

            await cache.set("q", "p1", "m", 0.1)
            await cache.set("q", "p2", "m", 0.2)
            await cache.set("q", "p3", "m", 0.3)

            await cache.get("q", "p1", "m")

            await cache.set("q", "p4", "m", 0.4)

            key1 = cache._make_key("q", "p1", "m")
            key2 = cache._make_key("q", "p2", "m")
            assert key1 in cache._memory
            assert key2 not in cache._memory

    @pytest.mark.asyncio
    async def test_batch_set_and_get(self, cache: RerankCache):
        passages = ["passage1", "passage2", "passage3"]
        scores = [0.9, 0.7, 0.5]

        await cache.set_batch("query", passages, "model", scores)

        results, uncached = await cache.get_batch("query", passages, "model")

        assert results == scores
        assert uncached == []

    @pytest.mark.asyncio
    async def test_stats_with_redis_errors(self, redis_client: Redis):
        cache = RerankCache(redis_client=redis_client)

        await cache.set("q", "p", "m", 0.5)

        cache._memory.clear()

        original_get = redis_client.get

        async def failing_get(*args, **kwargs):
            raise ConnectionError("Redis unavailable")

        redis_client.get = failing_get

        result = await cache.get("q", "p", "m")

        assert result is None
        assert cache._stats["redis_errors"] == 1
        assert cache._stats["misses"] == 1

        redis_client.get = original_get


@pytest.mark.integration
class TestCacheDataIntegrity:
    @pytest.fixture
    async def embedding_cache(self, redis_client: Redis, temp_dir: str):
        cache = EmbeddingCache(
            redis_client=redis_client,
            memory_size=100,
            disk_path=temp_dir,
        )
        yield cache
        await cache.close()

    @pytest.mark.asyncio
    async def test_sparse_vectors_preserved(self, embedding_cache: EmbeddingCache):
        data: EmbeddingData = {
            "dense": [0.1, 0.2, 0.3, 0.4, 0.5],
            "sparse": {"token1": 0.9, "token2": 0.7, "token3": 0.5},
        }

        await embedding_cache.set("text", "model", data)

        result = await embedding_cache.get("text", "model")
        assert result is not None
        assert result["sparse"] == data["sparse"]

    @pytest.mark.asyncio
    async def test_large_dense_vectors(self, embedding_cache: EmbeddingCache):
        dense = [float(i) / 1024.0 for i in range(1024)]
        data: EmbeddingData = {"dense": dense, "sparse": None}

        await embedding_cache.set("text", "model", data)

        embedding_cache._memory.clear()
        result = await embedding_cache.get("text", "model")

        assert result is not None
        assert len(result["dense"]) == 1024
        assert result["dense"] == data["dense"]

    @pytest.mark.asyncio
    async def test_unicode_text_handling(self, embedding_cache: EmbeddingCache):
        texts = [
            "Hello, 世界!",
            "مرحبا بالعالم",
            "🎉🚀💻",
            "αβγδ",
        ]
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}

        for text in texts:
            await embedding_cache.set(text, "model", data)
            result = await embedding_cache.get(text, "model")
            assert result == data, f"Failed for text: {text}"

    @pytest.mark.asyncio
    async def test_special_characters_in_model_id(
        self, embedding_cache: EmbeddingCache
    ):
        models = [
            "org/model-name",
            "model:v1.2.3",
            "model@latest",
            "path/to/model.bin",
        ]
        data: EmbeddingData = {"dense": [0.1], "sparse": None}

        for model in models:
            await embedding_cache.set("text", model, data)
            result = await embedding_cache.get("text", model)
            assert result == data, f"Failed for model: {model}"
