from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock

import pytest

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

    from engine.embeddings.cache import EmbeddingCache


@pytest.fixture
def mock_bgem3_model() -> MagicMock:
    model = MagicMock()
    model.encode.return_value = {
        "dense_vecs": MagicMock(),
        "lexical_weights": [{}],
    }
    return model


@pytest.fixture
async def embedding_cache(mock_redis: MagicMock) -> AsyncGenerator[EmbeddingCache, None]:
    from engine.embeddings.cache import EmbeddingCache

    cache = EmbeddingCache(
        redis_client=mock_redis,
        memory_size=100,
        disk_path="/tmp/test_embedding_cache",
    )
    yield cache
    await cache.close()
