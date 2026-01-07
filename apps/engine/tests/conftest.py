from __future__ import annotations

import sys
from typing import TYPE_CHECKING, Any
from unittest.mock import MagicMock

import pytest

if TYPE_CHECKING:
    from collections.abc import Generator


def _create_flag_embedding_mock() -> MagicMock:
    mock = MagicMock()
    mock.BGEM3FlagModel = MagicMock()
    return mock


def _create_ray_mock() -> tuple[MagicMock, MagicMock]:
    mock_serve = MagicMock()
    mock_serve.deployment = lambda **kwargs: lambda cls: cls
    mock_ray = MagicMock()
    mock_ray.serve = mock_serve
    return mock_ray, mock_serve


def _create_gliner_mock() -> MagicMock:
    mock = MagicMock()
    mock.GLiNER = MagicMock()
    return mock


def _create_lightgbm_mock() -> MagicMock:
    mock = MagicMock()
    mock.Booster = MagicMock()
    mock.Dataset = MagicMock()
    mock.train = MagicMock()
    return mock


_ORIGINAL_MODULES: dict[str, Any] = {}
_MOCKED_MODULES: set[str] = set()


def pytest_configure(config: pytest.Config) -> None:
    modules_to_mock = [
        ("FlagEmbedding", _create_flag_embedding_mock),
        ("ray", lambda: _create_ray_mock()[0]),
        ("ray.serve", lambda: _create_ray_mock()[1]),
        ("gliner", _create_gliner_mock),
        ("lightgbm", _create_lightgbm_mock),
    ]

    for module_name, mock_factory in modules_to_mock:
        if module_name not in sys.modules:
            _ORIGINAL_MODULES[module_name] = None
            sys.modules[module_name] = mock_factory()
            _MOCKED_MODULES.add(module_name)
        else:
            _ORIGINAL_MODULES[module_name] = sys.modules[module_name]


def pytest_unconfigure(config: pytest.Config) -> None:
    for module_name in _MOCKED_MODULES:
        if _ORIGINAL_MODULES.get(module_name) is None:
            sys.modules.pop(module_name, None)
        else:
            sys.modules[module_name] = _ORIGINAL_MODULES[module_name]


@pytest.fixture(autouse=True)
def reset_singletons() -> Generator[None, None, None]:
    yield

    try:
        from engine.embeddings.model import BGEM3

        BGEM3._instance = None
    except (ImportError, AttributeError):
        pass

    try:
        from engine.entities.extractor import EntityExtractor

        EntityExtractor._instance = None
    except (ImportError, AttributeError):
        pass

    try:
        from engine.ltr import service as ltr_service

        ltr_service._service_instance = None
    except (ImportError, AttributeError):
        pass


@pytest.fixture
def mock_redis() -> MagicMock:
    redis = MagicMock()
    redis.pipeline.return_value = MagicMock()
    redis.pipeline.return_value.execute = MagicMock(return_value=[None, None, 0, True])
    return redis
