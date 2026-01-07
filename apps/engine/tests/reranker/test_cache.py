from __future__ import annotations

import hashlib
from collections import OrderedDict
from unittest.mock import AsyncMock, patch

import pytest

from engine.reranker.cache import RerankCache

HASH_KEY_LENGTH = 32


class TestRerankCacheConstants:
    def test_memory_size(self):
        assert RerankCache.MEMORY_SIZE == 5000

    def test_redis_ttl_seconds(self):
        assert RerankCache.REDIS_TTL_SECONDS == 3600

    def test_redis_key_prefix(self):
        assert RerankCache.REDIS_KEY_PREFIX == "rerank:"


class TestRerankCacheInit:
    def test_init_without_redis(self):
        cache = RerankCache()

        assert cache._redis is None
        assert isinstance(cache._memory, OrderedDict)
        assert len(cache._memory) == 0
        assert cache._stats == {
            "memory_hits": 0,
            "redis_hits": 0,
            "misses": 0,
            "redis_errors": 0,
        }

    def test_init_with_redis(self):
        mock_redis = AsyncMock()

        cache = RerankCache(redis_client=mock_redis)

        assert cache._redis is mock_redis


class TestMakeKey:
    def test_generates_hash_key(self):
        cache = RerankCache()

        key = cache._make_key("query", "passage", "model")

        expected = hashlib.sha256(b"model:query:passage").hexdigest()[:32]
        assert key == expected

    def test_different_query_different_key(self):
        cache = RerankCache()

        key1 = cache._make_key("query1", "passage", "model")
        key2 = cache._make_key("query2", "passage", "model")

        assert key1 != key2

    def test_different_passage_different_key(self):
        cache = RerankCache()

        key1 = cache._make_key("query", "passage1", "model")
        key2 = cache._make_key("query", "passage2", "model")

        assert key1 != key2

    def test_different_model_different_key(self):
        cache = RerankCache()

        key1 = cache._make_key("query", "passage", "model1")
        key2 = cache._make_key("query", "passage", "model2")

        assert key1 != key2

    def test_key_length(self):
        cache = RerankCache()

        key = cache._make_key("query", "passage", "model")

        assert len(key) == HASH_KEY_LENGTH


class TestGet:
    @pytest.mark.asyncio
    async def test_memory_hit(self):
        cache = RerankCache()
        key = cache._make_key("query", "passage", "model")
        cache._memory[key] = 0.85

        result = await cache.get("query", "passage", "model")

        assert result == 0.85
        assert cache._stats["memory_hits"] == 1

    @pytest.mark.asyncio
    async def test_memory_hit_moves_to_end(self):
        cache = RerankCache()
        key1 = cache._make_key("query1", "passage", "model")
        key2 = cache._make_key("query2", "passage", "model")
        cache._memory[key1] = 0.5
        cache._memory[key2] = 0.7

        await cache.get("query1", "passage", "model")

        keys = list(cache._memory.keys())
        assert keys[-1] == key1

    @pytest.mark.asyncio
    async def test_redis_hit(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = b"0.92"
        cache = RerankCache(redis_client=mock_redis)

        result = await cache.get("query", "passage", "model")

        assert result == 0.92
        assert cache._stats["redis_hits"] == 1

    @pytest.mark.asyncio
    async def test_redis_hit_adds_to_memory(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = b"0.92"
        cache = RerankCache(redis_client=mock_redis)

        await cache.get("query", "passage", "model")

        key = cache._make_key("query", "passage", "model")
        assert key in cache._memory
        assert cache._memory[key] == 0.92

    @pytest.mark.asyncio
    async def test_miss_without_redis(self):
        cache = RerankCache()

        result = await cache.get("query", "passage", "model")

        assert result is None
        assert cache._stats["misses"] == 1

    @pytest.mark.asyncio
    async def test_miss_with_redis(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        cache = RerankCache(redis_client=mock_redis)

        result = await cache.get("query", "passage", "model")

        assert result is None
        assert cache._stats["misses"] == 1

    @pytest.mark.asyncio
    async def test_redis_error_fallback(self):
        mock_redis = AsyncMock()
        mock_redis.get.side_effect = Exception("Connection failed")
        cache = RerankCache(redis_client=mock_redis)

        with patch("engine.reranker.cache.logger"):
            result = await cache.get("query", "passage", "model")

        assert result is None
        assert cache._stats["redis_errors"] == 1
        assert cache._stats["misses"] == 1


class TestGetBatch:
    @pytest.mark.asyncio
    async def test_empty_passages_returns_empty(self):
        cache = RerankCache()

        results, uncached = await cache.get_batch("query", [], "model")

        assert results == []
        assert uncached == []

    @pytest.mark.asyncio
    async def test_all_memory_hits(self):
        cache = RerankCache()
        passages = ["passage1", "passage2"]
        for p in passages:
            key = cache._make_key("query", p, "model")
            cache._memory[key] = 0.8

        results, uncached = await cache.get_batch("query", passages, "model")

        assert results == [0.8, 0.8]
        assert uncached == []
        assert cache._stats["memory_hits"] == 2

    @pytest.mark.asyncio
    async def test_all_misses_without_redis(self):
        cache = RerankCache()

        results, uncached = await cache.get_batch("query", ["p1", "p2"], "model")

        assert results == [None, None]
        assert uncached == [0, 1]
        assert cache._stats["misses"] == 2

    @pytest.mark.asyncio
    async def test_redis_hits(self):
        mock_redis = AsyncMock()
        mock_redis.mget.return_value = [b"0.9", b"0.7"]
        cache = RerankCache(redis_client=mock_redis)

        results, uncached = await cache.get_batch("query", ["p1", "p2"], "model")

        assert results == [0.9, 0.7]
        assert uncached == []
        assert cache._stats["redis_hits"] == 2

    @pytest.mark.asyncio
    async def test_partial_memory_hits(self):
        mock_redis = AsyncMock()
        mock_redis.mget.return_value = [b"0.6"]
        cache = RerankCache(redis_client=mock_redis)
        key1 = cache._make_key("query", "p1", "model")
        cache._memory[key1] = 0.9

        results, uncached = await cache.get_batch("query", ["p1", "p2"], "model")

        assert results == [0.9, 0.6]
        assert uncached == []
        assert cache._stats["memory_hits"] == 1
        assert cache._stats["redis_hits"] == 1

    @pytest.mark.asyncio
    async def test_partial_redis_misses(self):
        mock_redis = AsyncMock()
        mock_redis.mget.return_value = [b"0.9", None]
        cache = RerankCache(redis_client=mock_redis)

        results, uncached = await cache.get_batch("query", ["p1", "p2"], "model")

        assert results == [0.9, None]
        assert uncached == [1]

    @pytest.mark.asyncio
    async def test_redis_error_fallback(self):
        mock_redis = AsyncMock()
        mock_redis.mget.side_effect = Exception("Connection failed")
        cache = RerankCache(redis_client=mock_redis)

        with patch("engine.reranker.cache.logger"):
            results, uncached = await cache.get_batch("query", ["p1", "p2"], "model")

        assert results == [None, None]
        assert uncached == [0, 1]
        assert cache._stats["redis_errors"] == 1

    @pytest.mark.asyncio
    async def test_adds_redis_hits_to_memory(self):
        mock_redis = AsyncMock()
        mock_redis.mget.return_value = [b"0.9"]
        cache = RerankCache(redis_client=mock_redis)

        await cache.get_batch("query", ["p1"], "model")

        key = cache._make_key("query", "p1", "model")
        assert key in cache._memory


class TestSet:
    @pytest.mark.asyncio
    async def test_set_adds_to_memory(self):
        cache = RerankCache()

        await cache.set("query", "passage", "model", 0.85)

        key = cache._make_key("query", "passage", "model")
        assert cache._memory[key] == 0.85

    @pytest.mark.asyncio
    async def test_set_stores_in_redis(self):
        mock_redis = AsyncMock()
        cache = RerankCache(redis_client=mock_redis)

        await cache.set("query", "passage", "model", 0.85)

        key = cache._make_key("query", "passage", "model")
        mock_redis.setex.assert_called_once_with(
            f"{RerankCache.REDIS_KEY_PREFIX}{key}",
            RerankCache.REDIS_TTL_SECONDS,
            "0.85",
        )

    @pytest.mark.asyncio
    async def test_set_redis_error_logged(self):
        mock_redis = AsyncMock()
        mock_redis.setex.side_effect = Exception("Connection failed")
        cache = RerankCache(redis_client=mock_redis)

        with patch("engine.reranker.cache.logger"):
            await cache.set("query", "passage", "model", 0.85)

        assert cache._stats["redis_errors"] == 1
        key = cache._make_key("query", "passage", "model")
        assert key in cache._memory


class TestSetBatch:
    @pytest.mark.asyncio
    async def test_set_batch_calls_set_for_each(self):
        cache = RerankCache()

        await cache.set_batch("query", ["p1", "p2"], "model", [0.9, 0.7])

        key1 = cache._make_key("query", "p1", "model")
        key2 = cache._make_key("query", "p2", "model")
        assert cache._memory[key1] == 0.9
        assert cache._memory[key2] == 0.7


class TestAddToMemory:
    def test_adds_new_entry(self):
        cache = RerankCache()

        cache._add_to_memory("key1", 0.85)

        assert cache._memory["key1"] == 0.85

    def test_updates_existing_entry(self):
        cache = RerankCache()
        cache._memory["key1"] = 0.5

        cache._add_to_memory("key1", 0.9)

        assert cache._memory["key1"] == 0.9

    def test_moves_existing_to_end(self):
        cache = RerankCache()
        cache._memory["key1"] = 0.5
        cache._memory["key2"] = 0.6

        cache._add_to_memory("key1", 0.9)

        keys = list(cache._memory.keys())
        assert keys[-1] == "key1"

    def test_evicts_oldest_when_full(self):
        with patch.object(RerankCache, "MEMORY_SIZE", 2):
            cache = RerankCache()
            cache._memory["key1"] = 0.1
            cache._memory["key2"] = 0.2

            cache._add_to_memory("key3", 0.3)

            assert "key1" not in cache._memory
            assert "key2" in cache._memory
            assert "key3" in cache._memory


class TestGetStats:
    def test_initial_stats(self):
        cache = RerankCache()

        stats = cache.get_stats()

        assert stats["memory_hits"] == 0
        assert stats["redis_hits"] == 0
        assert stats["misses"] == 0
        assert stats["redis_errors"] == 0
        assert stats["total"] == 0
        assert stats["hit_rate"] == 0.0
        assert stats["memory_size"] == 0

    def test_hit_rate_calculation(self):
        cache = RerankCache()
        cache._stats["memory_hits"] = 5
        cache._stats["redis_hits"] = 3
        cache._stats["misses"] = 2
        cache._stats["redis_errors"] = 0

        stats = cache.get_stats()

        assert stats["total"] == 10
        assert stats["hit_rate"] == pytest.approx(0.8)

    def test_memory_size_reported(self):
        cache = RerankCache()
        cache._memory["k1"] = 0.1
        cache._memory["k2"] = 0.2

        stats = cache.get_stats()

        assert stats["memory_size"] == 2


class TestIntegration:
    @pytest.mark.asyncio
    async def test_full_cache_flow(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        cache = RerankCache(redis_client=mock_redis)

        result = await cache.get("query", "passage", "model")
        assert result is None
        assert cache._stats["misses"] == 1

        await cache.set("query", "passage", "model", 0.85)

        result = await cache.get("query", "passage", "model")
        assert result == 0.85
        assert cache._stats["memory_hits"] == 1

    @pytest.mark.asyncio
    async def test_batch_flow(self):
        mock_redis = AsyncMock()
        mock_redis.mget.return_value = [None, None]
        cache = RerankCache(redis_client=mock_redis)

        results, uncached = await cache.get_batch("query", ["p1", "p2"], "model")
        assert results == [None, None]
        assert uncached == [0, 1]

        await cache.set_batch("query", ["p1", "p2"], "model", [0.9, 0.7])

        results, uncached = await cache.get_batch("query", ["p1", "p2"], "model")
        assert results == [0.9, 0.7]
        assert uncached == []

    @pytest.mark.asyncio
    async def test_memory_eviction_lru(self):
        with patch.object(RerankCache, "MEMORY_SIZE", 3):
            cache = RerankCache()

            await cache.set("q", "p1", "m", 0.1)
            await cache.set("q", "p2", "m", 0.2)
            await cache.set("q", "p3", "m", 0.3)

            await cache.get("q", "p1", "m")

            await cache.set("q", "p4", "m", 0.4)

            key1 = cache._make_key("q", "p1", "m")
            key2 = cache._make_key("q", "p2", "m")
            assert key1 in cache._memory
            assert key2 not in cache._memory
