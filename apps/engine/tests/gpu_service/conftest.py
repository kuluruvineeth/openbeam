from __future__ import annotations

from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock

import pytest

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable


@pytest.fixture
def mock_embedding_model() -> MagicMock:
    model = MagicMock()
    model.encode.return_value = {
        "dense_vecs": [[0.1, 0.2, 0.3]],
        "lexical_weights": [{"1": 0.5}],
    }
    return model


@pytest.fixture
def mock_reranker_model() -> MagicMock:
    model = MagicMock()
    model.compute_scores.return_value = [0.9, 0.8]
    return model


@pytest.fixture
def mock_entity_extractor() -> MagicMock:
    extractor = MagicMock()
    extractor.extract.return_value = []
    return extractor


@pytest.fixture
def mock_encode_fn() -> Callable[[list[str]], Awaitable[list[list[float]]]]:
    async def encode(texts: list[str]) -> list[list[float]]:
        return [[0.1, 0.2, 0.3] for _ in texts]

    return encode


@pytest.fixture
def mock_rerank_fn() -> Callable[[list[tuple[str, str]]], Awaitable[list[float]]]:
    async def rerank(pairs: list[tuple[str, str]]) -> list[float]:
        return [0.9 - 0.1 * i for i in range(len(pairs))]

    return rerank
