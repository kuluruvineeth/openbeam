from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from engine.common.security.rate_limiter import (
    RateLimitConfig,
    RateLimiter,
    RateLimitExceeded,
    RateLimitResult,
)


class TestRateLimitConfig:
    def test_default_values(self):
        config = RateLimitConfig()
        assert config.requests_per_minute == 60
        assert config.requests_per_hour == 1000
        assert config.burst_size == 10

    def test_custom_values(self):
        config = RateLimitConfig(
            requests_per_minute=100,
            requests_per_hour=2000,
            burst_size=20,
        )
        assert config.requests_per_minute == 100
        assert config.requests_per_hour == 2000

    def test_immutable(self):
        config = RateLimitConfig()
        with pytest.raises(AttributeError):
            config.requests_per_minute = 100


class TestRateLimitResult:
    def test_allowed_result(self):
        result = RateLimitResult(allowed=True, remaining=5, reset_at=1000.0)
        assert result.allowed is True
        assert result.remaining == 5
        assert result.retry_after == 0

    def test_denied_result(self):
        result = RateLimitResult(
            allowed=False,
            remaining=0,
            reset_at=1000.0,
            retry_after=30,
        )
        assert result.allowed is False
        assert result.retry_after == 30

    def test_immutable(self):
        result = RateLimitResult(allowed=True, remaining=5, reset_at=1000.0)
        with pytest.raises(AttributeError):
            result.allowed = False


class TestRateLimitExceeded:
    def test_status_code(self):
        exc = RateLimitExceeded(retry_after=60)
        assert exc.status_code == 429

    def test_retry_after_header(self):
        exc = RateLimitExceeded(retry_after=60)
        assert exc.headers["Retry-After"] == "60"

    def test_detail_message(self):
        exc = RateLimitExceeded(retry_after=30)
        assert "30 seconds" in exc.detail

    def test_retry_after_attribute(self):
        exc = RateLimitExceeded(retry_after=45)
        assert exc.retry_after == 45


class TestRateLimiter:
    @pytest.fixture
    def mock_redis(self):
        redis = AsyncMock()
        pipe = AsyncMock()
        pipe.execute = AsyncMock(return_value=[None, None, 5, None])
        redis.pipeline = MagicMock(return_value=pipe)
        redis.zrem = AsyncMock()
        return redis

    @pytest.fixture
    def rate_limiter(self, mock_redis):
        return RateLimiter(
            redis=mock_redis,
            config=RateLimitConfig(requests_per_minute=10),
        )

    async def test_allows_under_limit(self, rate_limiter):
        result = await rate_limiter.check("test-id")
        assert result.allowed is True
        assert result.remaining == 5

    async def test_denies_over_limit(self, rate_limiter, mock_redis):
        pipe = AsyncMock()
        pipe.execute = AsyncMock(return_value=[None, None, 15, None])
        mock_redis.pipeline = MagicMock(return_value=pipe)

        result = await rate_limiter.check("test-id")
        assert result.allowed is False
        assert result.retry_after > 0

    async def test_check_and_raise_allowed(self, rate_limiter):
        await rate_limiter.check_and_raise("test-id")

    async def test_check_and_raise_exceeded(self, rate_limiter, mock_redis):
        pipe = AsyncMock()
        pipe.execute = AsyncMock(return_value=[None, None, 15, None])
        mock_redis.pipeline = MagicMock(return_value=pipe)

        with pytest.raises(RateLimitExceeded):
            await rate_limiter.check_and_raise("test-id")

    async def test_removes_request_on_exceed(self, rate_limiter, mock_redis):
        pipe = AsyncMock()
        pipe.execute = AsyncMock(return_value=[None, None, 15, None])
        mock_redis.pipeline = MagicMock(return_value=pipe)

        await rate_limiter.check("test-id")
        pipe.zrem.assert_called_once()

    def test_limit_for_minute_window(self, rate_limiter):
        limit = rate_limiter._get_limit_for_window(60)
        assert limit == 10

    def test_limit_for_hour_window(self, rate_limiter):
        limit = rate_limiter._get_limit_for_window(3600)
        assert limit == 1000

    def test_limit_for_multi_hour_window(self, rate_limiter):
        limit = rate_limiter._get_limit_for_window(7200)
        assert limit == 2000
