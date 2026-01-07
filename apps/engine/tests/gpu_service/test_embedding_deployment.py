from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from engine.common.exceptions import ModelLoadError
from engine.gpu_service.deployments.embedding import EmbeddingDeployment
from engine.models.embedding import EmbeddingResponse


class MockBGEM3FlagModel:
    def __init__(self, model_name: str, use_fp16: bool, device: str, cache_dir: str):
        self.model_name = model_name
        self.use_fp16 = use_fp16
        self.device = device
        self.cache_dir = cache_dir

    def encode(
        self,
        texts: list[str],
        batch_size: int,
        return_dense: bool,
        return_sparse: bool,
        return_colbert_vecs: bool,
    ) -> dict[str, Any]:
        dense = np.random.rand(len(texts), 1024)
        result: dict[str, Any] = {"dense_vecs": dense}
        if return_sparse:
            result["lexical_weights"] = [{f"token_{i}": 0.5} for i in range(len(texts))]
        return result


@pytest.fixture
def mock_torch():
    mock = MagicMock()
    mock.cuda.is_available.return_value = False
    mock.backends.mps.is_available.return_value = False
    with patch("engine.gpu_service.deployments.embedding.torch", mock):
        yield mock


@pytest.fixture
def mock_flag_embedding():
    mock = MagicMock()
    mock.BGEM3FlagModel = MockBGEM3FlagModel
    with patch.dict(
        "sys.modules", {"FlagEmbedding": mock}
    ):
        yield mock


class TestEmbeddingDeploymentInit:
    def test_init_with_cuda(self, mock_flag_embedding: MagicMock):
        mock = MagicMock()
        mock.cuda.is_available.return_value = True
        mock.backends.mps.is_available.return_value = False
        with patch("engine.gpu_service.deployments.embedding.torch", mock):
            with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
                deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
                deployment._model_name = "BAAI/bge-m3"
                deployment._max_batch_size = 32
                deployment._cache_dir = "/models/embeddings"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False
                deployment._load_model()

            assert deployment._device == "cuda"
            assert deployment._is_ready

    def test_init_with_mps(self, mock_flag_embedding: MagicMock):
        mock = MagicMock()
        mock.cuda.is_available.return_value = False
        mock.backends.mps.is_available.return_value = True
        with patch("engine.gpu_service.deployments.embedding.torch", mock):
            with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
                deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
                deployment._model_name = "BAAI/bge-m3"
                deployment._max_batch_size = 32
                deployment._cache_dir = "/models/embeddings"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False
                deployment._load_model()

            assert deployment._device == "mps"
            assert deployment._is_ready

    def test_init_with_cpu(self, mock_torch: MagicMock, mock_flag_embedding: MagicMock):
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            deployment._model_name = "BAAI/bge-m3"
            deployment._max_batch_size = 32
            deployment._cache_dir = "/models/embeddings"
            deployment._model = None
            deployment._device = "cpu"
            deployment._is_ready = False
            deployment._load_model()

        assert deployment._device == "cpu"
        assert deployment._is_ready

    def test_init_model_load_failure(self, mock_torch: MagicMock):
        def raise_error(*args: Any, **kwargs: Any) -> None:
            raise RuntimeError("Model failed to load")

        mock_flag = MagicMock()
        mock_flag.BGEM3FlagModel = raise_error
        with patch.dict("sys.modules", {"FlagEmbedding": mock_flag}):
            with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
                deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
                deployment._model_name = "BAAI/bge-m3"
                deployment._max_batch_size = 32
                deployment._cache_dir = "/models/embeddings"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False

                with pytest.raises(ModelLoadError, match="Failed to load"):
                    deployment._load_model()


class TestEmbeddingDeploymentSelectDevice:
    def test_select_cuda(self):
        mock = MagicMock()
        mock.cuda.is_available.return_value = True
        mock.backends.mps.is_available.return_value = False
        with patch("engine.gpu_service.deployments.embedding.torch", mock):
            with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
                deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
                assert deployment._select_device() == "cuda"

    def test_select_mps(self):
        mock = MagicMock()
        mock.cuda.is_available.return_value = False
        mock.backends.mps.is_available.return_value = True
        with patch("engine.gpu_service.deployments.embedding.torch", mock):
            with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
                deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
                assert deployment._select_device() == "mps"

    def test_select_cpu(self, mock_torch: MagicMock):
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            assert deployment._select_device() == "cpu"


class TestEmbeddingDeploymentReady:
    def test_ready_returns_is_ready(self):
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            deployment._is_ready = True
            assert deployment.ready() is True

            deployment._is_ready = False
            assert deployment.ready() is False


class TestEmbeddingDeploymentEncode:
    @pytest.fixture
    def deployment(self) -> EmbeddingDeployment:
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            deployment._model_name = "BAAI/bge-m3"
            deployment._max_batch_size = 32
            deployment._model = MockBGEM3FlagModel(
                "BAAI/bge-m3", use_fp16=False, device="cpu", cache_dir="/models"
            )
            deployment._is_ready = True
            return deployment

    @pytest.mark.asyncio
    @pytest.mark.parametrize("is_ready", [False, True])
    async def test_encode_fails_without_model(self, is_ready: bool):
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            deployment._is_ready = is_ready
            deployment._model = None

            with pytest.raises(ModelLoadError, match="Model not loaded"):
                await deployment.encode(["test"])

    @pytest.mark.asyncio
    async def test_encode_empty_texts(self, deployment: EmbeddingDeployment):
        response = await deployment.encode([])
        assert isinstance(response, EmbeddingResponse)
        assert response.embeddings == []
        assert response.sparse_embeddings is None
        assert response.model == "BAAI/bge-m3"
        assert response.usage["total_tokens"] == 0
        assert response.usage["latency_ms"] == 0.0

    @pytest.mark.asyncio
    async def test_encode_empty_texts_with_sparse(self, deployment: EmbeddingDeployment):
        response = await deployment.encode([], return_sparse=True)
        assert response.embeddings == []
        assert response.sparse_embeddings == []
        assert response.usage["total_tokens"] == 0

    @pytest.mark.asyncio
    async def test_encode_single_text(self, deployment: EmbeddingDeployment):
        response = await deployment.encode(["hello world"])
        assert isinstance(response, EmbeddingResponse)
        assert len(response.embeddings) == 1
        assert len(response.embeddings[0]) == 1024
        assert response.sparse_embeddings is None
        assert response.model == "BAAI/bge-m3"
        assert response.usage["total_tokens"] == 2
        assert 0 <= response.usage["latency_ms"] < 5000, "Latency should be bounded"

    @pytest.mark.asyncio
    async def test_encode_multiple_texts(self, deployment: EmbeddingDeployment):
        texts = ["hello world", "another text", "third document"]
        response = await deployment.encode(texts)
        assert len(response.embeddings) == 3
        for emb in response.embeddings:
            assert len(emb) == 1024
        assert response.usage["total_tokens"] == 6

    @pytest.mark.asyncio
    async def test_encode_with_sparse(self, deployment: EmbeddingDeployment):
        response = await deployment.encode(["test text"], return_sparse=True)
        assert len(response.embeddings) == 1
        assert response.sparse_embeddings is not None
        assert len(response.sparse_embeddings) == 1
        assert isinstance(response.sparse_embeddings[0], dict)

    @pytest.mark.asyncio
    async def test_encode_batch_size_respected(self):
        call_batch_sizes: list[int] = []

        class TrackingModel:
            def encode(
                self,
                texts: list[str],
                batch_size: int,
                **kwargs: Any,
            ) -> dict[str, Any]:
                call_batch_sizes.append(batch_size)
                return {"dense_vecs": np.random.rand(len(texts), 1024)}

        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            deployment._model_name = "BAAI/bge-m3"
            deployment._max_batch_size = 16
            deployment._model = TrackingModel()
            deployment._is_ready = True

            texts = ["text"] * 10
            await deployment.encode(texts)
            assert call_batch_sizes[0] == 10

            call_batch_sizes.clear()
            texts = ["text"] * 50
            await deployment.encode(texts)
            assert call_batch_sizes[0] == 16

    @pytest.mark.asyncio
    async def test_encode_latency_tracked(self, deployment: EmbeddingDeployment):
        response = await deployment.encode(["test text"])
        assert response.usage["latency_ms"] >= 0
        assert response.usage["latency_ms"] < 10000


class TestEmbeddingDeploymentFormatSparse:
    def test_format_sparse_none(self):
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            assert deployment._format_sparse(None) is None

    def test_format_sparse_empty(self):
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)
            assert deployment._format_sparse([]) == []

    def test_format_sparse_converts_dicts(self):
        with patch.object(EmbeddingDeployment, "__init__", lambda self: None):
            deployment = EmbeddingDeployment.__new__(EmbeddingDeployment)

            class DictLike(dict[str, float]):
                pass

            weights: list[dict[str, float]] = [DictLike({"token_a": 0.5, "token_b": 0.3})]
            result = deployment._format_sparse(weights)
            assert result == [{"token_a": 0.5, "token_b": 0.3}]
            assert type(result[0]) is dict
