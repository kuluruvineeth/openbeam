from __future__ import annotations

import hashlib
from collections import OrderedDict
from typing import TYPE_CHECKING

from engine.core.logging import get_logger

if TYPE_CHECKING:
    from redis.asyncio import Redis

logger = get_logger(__name__)


class RerankCache:
    MEMORY_SIZE = 5000
    REDIS_TTL_SECONDS = 3600
    REDIS_KEY_PREFIX = "rerank:"

    def __init__(self, redis_client: Redis | None = None) -> None:
        self._redis = redis_client
        self._memory: OrderedDict[str, float] = OrderedDict()
        self._stats = {
            "memory_hits": 0,
            "redis_hits": 0,
            "misses": 0,
            "redis_errors": 0,
        }

    def _make_key(self, query: str, passage: str, model: str) -> str:
        content = f"{model}:{query}:{passage}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]

    async def get(self, query: str, passage: str, model: str) -> float | None:
        key = self._make_key(query, passage, model)

        if key in self._memory:
            self._memory.move_to_end(key)
            self._stats["memory_hits"] += 1
            return self._memory[key]

        if self._redis:
            try:
                cached = await self._redis.get(f"{self.REDIS_KEY_PREFIX}{key}")
                if cached:
                    score = float(cached)
                    self._add_to_memory(key, score)
                    self._stats["redis_hits"] += 1
                    return score
            except Exception:
                logger.exception("rerank_cache_redis_get_failed")
                self._stats["redis_errors"] += 1

        self._stats["misses"] += 1
        return None

    async def get_batch(
        self,
        query: str,
        passages: list[str],
        model: str,
    ) -> tuple[list[float | None], list[int]]:
        if not passages:
            return [], []

        keys = [self._make_key(query, p, model) for p in passages]
        results: list[float | None] = [None] * len(passages)
        uncached_indices: list[int] = []

        redis_indices: list[int] = []
        for idx, key in enumerate(keys):
            if key in self._memory:
                self._memory.move_to_end(key)
                results[idx] = self._memory[key]
                self._stats["memory_hits"] += 1
            else:
                redis_indices.append(idx)

        if redis_indices and self._redis:
            try:
                redis_keys = [
                    f"{self.REDIS_KEY_PREFIX}{keys[i]}" for i in redis_indices
                ]
                cached_values = await self._redis.mget(redis_keys)

                for idx, value in zip(redis_indices, cached_values, strict=True):
                    if value is not None:
                        score = float(value)
                        results[idx] = score
                        self._add_to_memory(keys[idx], score)
                        self._stats["redis_hits"] += 1
            except Exception:
                logger.exception("rerank_cache_redis_mget_failed")
                self._stats["redis_errors"] += 1

        for idx, cached_score in enumerate(results):
            if cached_score is None:
                uncached_indices.append(idx)
                self._stats["misses"] += 1

        return results, uncached_indices

    async def set(
        self,
        query: str,
        passage: str,
        model: str,
        score: float,
    ) -> None:
        key = self._make_key(query, passage, model)
        self._add_to_memory(key, score)

        if self._redis:
            try:
                await self._redis.setex(
                    f"{self.REDIS_KEY_PREFIX}{key}",
                    self.REDIS_TTL_SECONDS,
                    str(score),
                )
            except Exception:
                logger.exception("rerank_cache_redis_set_failed")
                self._stats["redis_errors"] += 1

    async def set_batch(
        self,
        query: str,
        passages: list[str],
        model: str,
        scores: list[float],
    ) -> None:
        for passage, score in zip(passages, scores, strict=True):
            await self.set(query, passage, model, score)

    def _add_to_memory(self, key: str, score: float) -> None:
        if key in self._memory:
            self._memory.move_to_end(key)
            self._memory[key] = score
            return

        if len(self._memory) >= self.MEMORY_SIZE:
            self._memory.popitem(last=False)

        self._memory[key] = score

    def get_stats(self) -> dict[str, int | float]:
        total = sum(self._stats.values())
        hit_rate = (
            (self._stats["memory_hits"] + self._stats["redis_hits"]) / total
            if total > 0
            else 0.0
        )
        return {
            **self._stats,
            "total": total,
            "hit_rate": hit_rate,
            "memory_size": len(self._memory),
        }
