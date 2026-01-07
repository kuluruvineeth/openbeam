from __future__ import annotations

import tempfile
from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

import fakeredis.aioredis
import pytest

if TYPE_CHECKING:
    from redis.asyncio import Redis


@pytest.fixture
async def redis_client() -> AsyncGenerator[Redis, None]:
    client: Redis = fakeredis.aioredis.FakeRedis(decode_responses=False)
    yield client
    await client.aclose()


@pytest.fixture
def temp_dir() -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir
