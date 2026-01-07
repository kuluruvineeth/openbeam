from __future__ import annotations

import hashlib
import json
from typing import TypedDict

import diskcache  # type: ignore[import-untyped]
import redis.asyncio as redis
from cachetools import LRUCache  # type: ignore[import-untyped]

from engine.core.config import settings
from engine.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingData(TypedDict):
    dense: list[float]
    sparse: dict[str, float] | None


class CacheStats(TypedDict):
    memory: int
    redis: int
    disk: int
    miss: int
    hit_rate: float


class EmbeddingCache:
    TTL_REDIS = 604_800  # 7 days
    TTL_DISK = 2_592_000  # 30 days

    def __init__(
        self,
        redis_client: redis.Redis,
        memory_size: int = 10_000,
        disk_path: str | None = None,
    ) -> None:
        self._memory: LRUCache[str, EmbeddingData] = LRUCache(maxsize=memory_size)
        self._redis = redis_client
        cache_dir = disk_path or f"{settings.temp_dir}/embedding_cache"
        self._disk: diskcache.Cache = diskcache.Cache(cache_dir)
        self._stats: dict[str, int] = {"memory": 0, "redis": 0, "disk": 0, "miss": 0}

    def _key(self, text: str, model_id: str) -> str:
        return hashlib.sha256(f"{model_id}:{text}".encode()).hexdigest()[:32]

    async def get(self, text: str, model_id: str) -> EmbeddingData | None:
        key = self._key(text, model_id)

        if key in self._memory:
            self._stats["memory"] += 1
            data: EmbeddingData = self._memory[key]
            return data

        try:
            cached = await self._redis.get(f"emb:{key}")
            if cached:
                self._stats["redis"] += 1
                redis_data: EmbeddingData = json.loads(cached)
                self._memory[key] = redis_data
                return redis_data
        except redis.RedisError:
            pass

        if key in self._disk:
            self._stats["disk"] += 1
            data = self._disk[key]
            self._memory[key] = data
            return data

        self._stats["miss"] += 1
        return None

    async def set(
        self,
        text: str,
        model_id: str,
        data: EmbeddingData,
        ttl: int | None = None,
    ) -> None:
        key = self._key(text, model_id)
        redis_ttl = ttl or self.TTL_REDIS

        self._memory[key] = data

        try:
            await self._redis.setex(f"emb:{key}", redis_ttl, json.dumps(data))
        except redis.RedisError:
            logger.warning("redis_cache_set_failed", key=key)

        self._disk.set(key, data, expire=self.TTL_DISK)

    def get_stats(self) -> CacheStats:
        total = sum(self._stats.values())
        hit_rate = (total - self._stats["miss"]) / total if total > 0 else 0.0
        return CacheStats(
            memory=self._stats["memory"],
            redis=self._stats["redis"],
            disk=self._stats["disk"],
            miss=self._stats["miss"],
            hit_rate=hit_rate,
        )

    async def close(self) -> None:
        self._disk.close()
