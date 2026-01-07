from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from fastapi import HTTPException, status

from engine.common.logging import get_logger
from engine.common.security.utils import get_client_ip

if TYPE_CHECKING:
    from redis.asyncio import Redis
    from starlette.requests import Request

logger = get_logger(__name__)


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int) -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
        self.retry_after = retry_after


@dataclass(frozen=True, slots=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    reset_at: float
    retry_after: int = 0


@dataclass(frozen=True, slots=True)
class RateLimitConfig:
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_size: int = 10


@dataclass
class RateLimiter:
    redis: Redis
    config: RateLimitConfig = field(default_factory=RateLimitConfig)
    key_prefix: str = "ratelimit"

    async def check(self, identifier: str, window_seconds: int = 60) -> RateLimitResult:
        """Check rate limit for identifier using sliding window algorithm."""
        key = f"{self.key_prefix}:{identifier}:{window_seconds}"
        now = time.time()
        window_start = now - window_seconds

        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, window_seconds)

        results = await pipe.execute()
        request_count = results[2]

        limit = self._get_limit_for_window(window_seconds)
        remaining = max(0, limit - request_count)
        reset_at = now + window_seconds

        if request_count > limit:
            removal_pipe = self.redis.pipeline()
            removal_pipe.zrem(key, str(now))
            removal_pipe.expire(key, window_seconds)
            await removal_pipe.execute()

            retry_after = int(reset_at - now)
            logger.warning(
                "rate_limit_exceeded",
                identifier=identifier[:16],
                count=request_count,
                limit=limit,
                window=window_seconds,
            )
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_at=reset_at,
                retry_after=retry_after,
            )

        return RateLimitResult(allowed=True, remaining=remaining, reset_at=reset_at)

    def _get_limit_for_window(self, window_seconds: int) -> int:
        if window_seconds <= 60:
            return self.config.requests_per_minute
        if window_seconds <= 3600:
            return self.config.requests_per_hour
        return self.config.requests_per_hour * (window_seconds // 3600)

    async def check_and_raise(self, identifier: str, window_seconds: int = 60) -> None:
        """Check rate limit and raise RateLimitExceeded if exceeded."""
        result = await self.check(identifier, window_seconds)
        if not result.allowed:
            raise RateLimitExceeded(result.retry_after)


def get_client_identifier(request: Request) -> str:
    """Extract client identifier for rate limiting from request."""
    if hasattr(request.state, "auth") and request.state.auth:
        return f"key:{request.state.auth.key_hash}"

    client_ip = get_client_ip(request)
    return f"ip:{client_ip}"
