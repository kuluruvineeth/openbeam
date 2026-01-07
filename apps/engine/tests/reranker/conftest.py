from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock

import pytest

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

    from engine.reranker.cache import RerankCache


@pytest.fixture
def mock_cross_encoder() -> MagicMock:
    model = MagicMock()
    model.compute_scores.return_value = [0.9, 0.8, 0.7]
    model.model_name = "test-reranker"
    model.device = "cpu"
    return model


@pytest.fixture
async def rerank_cache(mock_redis: MagicMock) -> AsyncGenerator[RerankCache, None]:
    from engine.reranker.cache import RerankCache

    cache = RerankCache(redis_client=mock_redis)
    yield cache
