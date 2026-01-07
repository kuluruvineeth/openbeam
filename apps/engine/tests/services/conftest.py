from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock

import pytest

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

    from engine.services.embedding import EmbeddingService


@pytest.fixture
def mock_embedding_model() -> MagicMock:
    import numpy as np

    model = MagicMock()
    model.encode.return_value = {
        "dense_vecs": np.array([[0.1, 0.2, 0.3]]),
        "lexical_weights": [{"1": 0.5}],
    }
    return model


@pytest.fixture
def mock_embedding_cache() -> AsyncMock:
    cache = AsyncMock()
    cache.get.return_value = None
    cache.set.return_value = None
    cache.get_stats.return_value = {
        "memory": 10,
        "redis": 5,
        "disk": 2,
        "miss": 3,
        "hit_rate": 0.85,
    }
    return cache


@pytest.fixture
def embedding_service(
    mock_embedding_model: MagicMock,
    mock_embedding_cache: AsyncMock,
) -> EmbeddingService:
    from engine.services.embedding import EmbeddingService

    return EmbeddingService(model=mock_embedding_model, cache=mock_embedding_cache)
