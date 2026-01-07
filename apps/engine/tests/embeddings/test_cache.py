from __future__ import annotations

import asyncio
import hashlib
import json
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import redis.asyncio as redis

from engine.embeddings.cache import CacheStats, EmbeddingCache, EmbeddingData

HASH_KEY_LENGTH = 32


class TestEmbeddingDataTypedDict:
    def test_structure(self):
        data: EmbeddingData = {"dense": [0.1, 0.2, 0.3], "sparse": None}
        assert data["dense"] == [0.1, 0.2, 0.3]
        assert data["sparse"] is None

    def test_with_sparse_vectors(self):
        data: EmbeddingData = {
            "dense": [0.1, 0.2],
            "sparse": {"token1": 0.5, "token2": 0.3},
        }
        assert data["sparse"] == {"token1": 0.5, "token2": 0.3}


class TestCacheStatsTypedDict:
    def test_structure(self):
        stats: CacheStats = {
            "memory": 10,
            "redis": 5,
            "disk": 3,
            "miss": 2,
            "hit_rate": 0.9,
        }
        assert stats["memory"] == 10
        assert stats["hit_rate"] == 0.9


class TestEmbeddingCacheConstants:
    def test_ttl_redis(self):
        assert EmbeddingCache.TTL_REDIS == 604_800

    def test_ttl_disk(self):
        assert EmbeddingCache.TTL_DISK == 2_592_000


class TestEmbeddingCacheInit:
    def test_init_with_defaults(self):
        mock_redis = MagicMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("engine.embeddings.cache.settings") as mock_settings:
                mock_settings.temp_dir = tmpdir
                cache = EmbeddingCache(redis_client=mock_redis)

                assert cache._redis is mock_redis
                assert cache._memory.maxsize == 10_000
                assert cache._stats == {"memory": 0, "redis": 0, "disk": 0, "miss": 0}
                cache._disk.close()

    def test_init_with_custom_memory_size(self):
        mock_redis = MagicMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            cache = EmbeddingCache(
                redis_client=mock_redis,
                memory_size=500,
                disk_path=tmpdir,
            )
            assert cache._memory.maxsize == 500
            cache._disk.close()

    def test_init_with_custom_disk_path(self):
        mock_redis = MagicMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            cache = EmbeddingCache(
                redis_client=mock_redis,
                disk_path=tmpdir,
            )
            assert cache._disk.directory.startswith(tmpdir)
            cache._disk.close()


class TestKey:
    @pytest.fixture
    def cache(self):
        mock_redis = MagicMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            c = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)
            yield c
            c._disk.close()

    def test_generates_hash_key(self, cache):
        key = cache._key("test text", "model-v1")
        expected = hashlib.sha256(b"model-v1:test text").hexdigest()[:32]
        assert key == expected

    @pytest.mark.parametrize(
        "text1,model1,text2,model2,should_differ",
        [
            ("text1", "model", "text2", "model", True),
            ("text", "model1", "text", "model2", True),
            ("text", "model", "text", "model", False),
            ("hello", "bge-m3", "hello", "bge-m3", False),
        ],
        ids=["different-text", "different-model", "same-inputs", "same-inputs-realistic"],
    )
    def test_key_uniqueness(self, cache, text1, model1, text2, model2, should_differ):
        key1 = cache._key(text1, model1)
        key2 = cache._key(text2, model2)
        assert (key1 != key2) == should_differ

    def test_key_length(self, cache):
        key = cache._key("any text", "any model")
        assert len(key) == HASH_KEY_LENGTH


class TestGet:
    @pytest.fixture
    def cache(self):
        mock_redis = AsyncMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            c = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)
            yield c
            c._disk.close()

    @pytest.mark.asyncio
    async def test_memory_hit(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}
        key = cache._key("test", "model")
        cache._memory[key] = data

        result = await cache.get("test", "model")

        assert result == data
        assert cache._stats["memory"] == 1

    @pytest.mark.asyncio
    async def test_redis_hit(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}
        cache._redis.get.return_value = json.dumps(data)

        result = await cache.get("test", "model")

        assert result == data
        assert cache._stats["redis"] == 1
        key = cache._key("test", "model")
        assert key in cache._memory

    @pytest.mark.asyncio
    async def test_disk_hit(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}
        key = cache._key("test", "model")
        cache._disk[key] = data
        cache._redis.get.return_value = None

        result = await cache.get("test", "model")

        assert result == data
        assert cache._stats["disk"] == 1
        assert key in cache._memory

    @pytest.mark.asyncio
    async def test_miss(self, cache):
        cache._redis.get.return_value = None

        result = await cache.get("nonexistent", "model")

        assert result is None
        assert cache._stats["miss"] == 1

    @pytest.mark.asyncio
    async def test_redis_error_fallback(self, cache):
        cache._redis.get.side_effect = redis.RedisError("connection failed")

        result = await cache.get("test", "model")

        assert result is None
        assert cache._stats["miss"] == 1

    @pytest.mark.asyncio
    async def test_redis_error_with_disk_fallback(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}
        key = cache._key("test", "model")
        cache._disk[key] = data
        cache._redis.get.side_effect = redis.RedisError("connection failed")

        result = await cache.get("test", "model")

        assert result == data
        assert cache._stats["disk"] == 1


class TestSet:
    @pytest.fixture
    def cache(self):
        mock_redis = AsyncMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            c = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)
            yield c
            c._disk.close()

    @pytest.mark.asyncio
    async def test_set_stores_in_memory(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}

        await cache.set("test", "model", data)

        key = cache._key("test", "model")
        assert cache._memory[key] == data

    @pytest.mark.asyncio
    async def test_set_stores_in_redis(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}

        await cache.set("test", "model", data)

        key = cache._key("test", "model")
        cache._redis.setex.assert_called_once_with(
            f"emb:{key}",
            EmbeddingCache.TTL_REDIS,
            json.dumps(data),
        )

    @pytest.mark.asyncio
    async def test_set_stores_in_disk(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}

        await cache.set("test", "model", data)

        key = cache._key("test", "model")
        assert cache._disk[key] == data

    @pytest.mark.asyncio
    async def test_set_with_custom_ttl(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}
        custom_ttl = 3600

        await cache.set("test", "model", data, ttl=custom_ttl)

        key = cache._key("test", "model")
        cache._redis.setex.assert_called_once_with(
            f"emb:{key}",
            custom_ttl,
            json.dumps(data),
        )

    @pytest.mark.asyncio
    async def test_set_redis_error_logs_warning(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}
        cache._redis.setex.side_effect = redis.RedisError("connection failed")

        with patch("engine.embeddings.cache.logger") as mock_logger:
            await cache.set("test", "model", data)

            mock_logger.warning.assert_called_once()
            key = cache._key("test", "model")
            assert cache._memory[key] == data
            assert cache._disk[key] == data

    @pytest.mark.asyncio
    async def test_set_with_sparse_vectors(self, cache):
        data: EmbeddingData = {
            "dense": [0.1, 0.2],
            "sparse": {"token1": 0.5, "token2": 0.3},
        }

        await cache.set("test", "model", data)

        key = cache._key("test", "model")
        assert cache._memory[key] == data


class TestGetStats:
    @pytest.fixture
    def cache(self):
        mock_redis = AsyncMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            c = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)
            yield c
            c._disk.close()

    def test_initial_stats(self, cache):
        stats = cache.get_stats()

        assert stats["memory"] == 0
        assert stats["redis"] == 0
        assert stats["disk"] == 0
        assert stats["miss"] == 0
        assert stats["hit_rate"] == 0.0

    @pytest.mark.parametrize(
        "memory,redis,disk,miss,expected_hit_rate",
        [
            (5, 3, 2, 10, 0.5),
            (10, 0, 0, 0, 1.0),
            (0, 0, 0, 10, 0.0),
            (25, 15, 10, 50, 0.5),
            (1, 1, 1, 1, 0.75),
            (0, 0, 0, 0, 0.0),
        ],
        ids=[
            "half-hits",
            "all-memory-hits",
            "all-misses",
            "large-numbers-half",
            "equal-distribution",
            "zero-total",
        ],
    )
    def test_hit_rate_calculation(
        self, cache, memory, redis, disk, miss, expected_hit_rate
    ):
        cache._stats["memory"] = memory
        cache._stats["redis"] = redis
        cache._stats["disk"] = disk
        cache._stats["miss"] = miss

        stats = cache.get_stats()

        assert stats["hit_rate"] == pytest.approx(expected_hit_rate)


class TestClose:
    @pytest.mark.asyncio
    async def test_close_closes_disk_cache(self):
        mock_redis = AsyncMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            cache = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)
            mock_disk = MagicMock()
            cache._disk = mock_disk

            await cache.close()

            mock_disk.close.assert_called_once()


class TestErrorPaths:
    @pytest.fixture
    def cache(self):
        mock_redis = AsyncMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            c = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)
            yield c
            c._disk.close()

    @pytest.mark.asyncio
    async def test_redis_connection_failure_on_get(self, cache):
        cache._redis.get.side_effect = redis.RedisError("Connection refused")

        result = await cache.get("test", "model")

        assert result is None
        assert cache._stats["miss"] == 1

    @pytest.mark.asyncio
    async def test_redis_connection_failure_falls_back_to_disk(self, cache):
        data: EmbeddingData = {"dense": [0.5, 0.6], "sparse": None}
        key = cache._key("test", "model")
        cache._disk[key] = data
        cache._redis.get.side_effect = redis.RedisError("Connection refused")

        result = await cache.get("test", "model")

        assert result == data
        assert cache._stats["disk"] == 1

    @pytest.mark.asyncio
    async def test_redis_timeout_on_set_still_stores_memory_and_disk(self, cache):
        data: EmbeddingData = {"dense": [0.1, 0.2], "sparse": None}
        cache._redis.setex.side_effect = redis.RedisError("Timeout")

        with patch("engine.embeddings.cache.logger") as mock_logger:
            await cache.set("test", "model", data)

        key = cache._key("test", "model")
        assert cache._memory[key] == data
        assert cache._disk[key] == data
        mock_logger.warning.assert_called_once()

    @pytest.mark.asyncio
    async def test_corrupted_redis_data_raises_json_error(self, cache):
        cache._redis.get.return_value = "not valid json {{"

        with pytest.raises(json.JSONDecodeError):
            await cache.get("test", "model")

    @pytest.mark.asyncio
    async def test_memory_lru_eviction_under_concurrent_access(self, cache):
        cache._memory = MagicMock()
        cache._memory.__contains__ = MagicMock(return_value=False)
        cache._memory.__setitem__ = MagicMock()
        cache._redis.get.return_value = None

        tasks = [cache.get(f"text{i}", "model") for i in range(100)]
        await asyncio.gather(*tasks)

        assert cache._memory.__setitem__.call_count == 0


class TestIntegration:
    @pytest.mark.asyncio
    async def test_full_cache_flow(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None

        with tempfile.TemporaryDirectory() as tmpdir:
            cache = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)

            result = await cache.get("test", "model")
            assert result is None
            assert cache._stats["miss"] == 1

            data: EmbeddingData = {"dense": [0.1, 0.2, 0.3], "sparse": None}
            await cache.set("test", "model", data)

            result = await cache.get("test", "model")
            assert result == data
            assert cache._stats["memory"] == 1

            cache._memory.clear()
            mock_redis.get.return_value = json.dumps(data)

            result = await cache.get("test", "model")
            assert result == data
            assert cache._stats["redis"] == 1

            await cache.close()

    @pytest.mark.asyncio
    async def test_memory_eviction(self):
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None

        with tempfile.TemporaryDirectory() as tmpdir:
            cache = EmbeddingCache(
                redis_client=mock_redis,
                memory_size=2,
                disk_path=tmpdir,
            )

            data: EmbeddingData = {"dense": [0.1], "sparse": None}
            await cache.set("text1", "model", data)
            await cache.set("text2", "model", data)
            await cache.set("text3", "model", data)

            assert len(cache._memory) == 2

            key1 = cache._key("text1", "model")
            assert key1 not in cache._memory

            await cache.close()
