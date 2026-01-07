from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from engine.common.exceptions import ModelLoadError
from engine.gpu_service.deployments.reranker import RerankerDeployment
from engine.models.rerank import RerankResponse


class MockFlagReranker:
    def __init__(self, model_name: str, use_fp16: bool, device: str, cache_dir: str):
        self.model_name = model_name
        self.use_fp16 = use_fp16
        self.device = device
        self.cache_dir = cache_dir

    def compute_score(
        self,
        pairs: list[list[str]],
        normalize: bool,
        batch_size: int,
    ) -> list[float]:
        return [0.9 - i * 0.1 for i in range(len(pairs))]


@pytest.fixture
def mock_torch():
    mock = MagicMock()
    mock.cuda.is_available.return_value = False
    mock.backends.mps.is_available.return_value = False
    with patch("engine.gpu_service.deployments.reranker.torch", mock):
        yield mock


@pytest.fixture
def mock_flag_embedding():
    mock = MagicMock()
    mock.FlagReranker = MockFlagReranker
    with patch.dict("sys.modules", {"FlagEmbedding": mock}):
        yield mock


class TestRerankerDeploymentInit:
    def test_init_with_cuda(self, mock_flag_embedding: MagicMock):
        mock = MagicMock()
        mock.cuda.is_available.return_value = True
        mock.backends.mps.is_available.return_value = False
        with patch("engine.gpu_service.deployments.reranker.torch", mock):
            with patch.object(RerankerDeployment, "__init__", lambda self: None):
                deployment = RerankerDeployment.__new__(RerankerDeployment)
                deployment._model_name = "BAAI/bge-reranker-v2-m3"
                deployment._max_batch_size = 16
                deployment._cache_dir = "/models/reranker"
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
        with patch("engine.gpu_service.deployments.reranker.torch", mock):
            with patch.object(RerankerDeployment, "__init__", lambda self: None):
                deployment = RerankerDeployment.__new__(RerankerDeployment)
                deployment._model_name = "BAAI/bge-reranker-v2-m3"
                deployment._max_batch_size = 16
                deployment._cache_dir = "/models/reranker"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False
                deployment._load_model()

            assert deployment._device == "mps"
            assert deployment._is_ready

    def test_init_with_cpu(self, mock_torch: MagicMock, mock_flag_embedding: MagicMock):
        with patch.object(RerankerDeployment, "__init__", lambda self: None):
            deployment = RerankerDeployment.__new__(RerankerDeployment)
            deployment._model_name = "BAAI/bge-reranker-v2-m3"
            deployment._max_batch_size = 16
            deployment._cache_dir = "/models/reranker"
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
        mock_flag.FlagReranker = raise_error
        with patch.dict("sys.modules", {"FlagEmbedding": mock_flag}):
            with patch.object(RerankerDeployment, "__init__", lambda self: None):
                deployment = RerankerDeployment.__new__(RerankerDeployment)
                deployment._model_name = "BAAI/bge-reranker-v2-m3"
                deployment._max_batch_size = 16
                deployment._cache_dir = "/models/reranker"
                deployment._model = None
                deployment._device = "cpu"
                deployment._is_ready = False

                with pytest.raises(ModelLoadError, match="Failed to load"):
                    deployment._load_model()


class TestRerankerDeploymentSelectDevice:
    def test_select_cuda(self):
        mock = MagicMock()
        mock.cuda.is_available.return_value = True
        mock.backends.mps.is_available.return_value = False
        with patch("engine.gpu_service.deployments.reranker.torch", mock):
            with patch.object(RerankerDeployment, "__init__", lambda self: None):
                deployment = RerankerDeployment.__new__(RerankerDeployment)
                assert deployment._select_device() == "cuda"

    def test_select_mps(self):
        mock = MagicMock()
        mock.cuda.is_available.return_value = False
        mock.backends.mps.is_available.return_value = True
        with patch("engine.gpu_service.deployments.reranker.torch", mock):
            with patch.object(RerankerDeployment, "__init__", lambda self: None):
                deployment = RerankerDeployment.__new__(RerankerDeployment)
                assert deployment._select_device() == "mps"

    def test_select_cpu(self, mock_torch: MagicMock):
        with patch.object(RerankerDeployment, "__init__", lambda self: None):
            deployment = RerankerDeployment.__new__(RerankerDeployment)
            assert deployment._select_device() == "cpu"


class TestRerankerDeploymentReady:
    def test_ready_returns_is_ready(self):
        with patch.object(RerankerDeployment, "__init__", lambda self: None):
            deployment = RerankerDeployment.__new__(RerankerDeployment)
            deployment._is_ready = True
            assert deployment.ready() is True

            deployment._is_ready = False
            assert deployment.ready() is False


class TestRerankerDeploymentRerank:
    @pytest.fixture
    def deployment(self) -> RerankerDeployment:
        with patch.object(RerankerDeployment, "__init__", lambda self: None):
            deployment = RerankerDeployment.__new__(RerankerDeployment)
            deployment._model_name = "BAAI/bge-reranker-v2-m3"
            deployment._max_batch_size = 16
            deployment._model = MockFlagReranker(
                "BAAI/bge-reranker-v2-m3",
                use_fp16=False,
                device="cpu",
                cache_dir="/models",
            )
            deployment._is_ready = True
            return deployment

    @pytest.mark.asyncio
    @pytest.mark.parametrize("is_ready", [False, True])
    async def test_rerank_fails_without_model(self, is_ready: bool):
        with patch.object(RerankerDeployment, "__init__", lambda self: None):
            deployment = RerankerDeployment.__new__(RerankerDeployment)
            deployment._is_ready = is_ready
            deployment._model = None

            with pytest.raises(ModelLoadError, match="Model not loaded"):
                await deployment.rerank("query", ["passage"])

    @pytest.mark.asyncio
    async def test_rerank_empty_passages(self, deployment: RerankerDeployment):
        response = await deployment.rerank("test query", [])
        assert isinstance(response, RerankResponse)
        assert response.results == []
        assert response.model == "BAAI/bge-reranker-v2-m3"
        assert response.usage["latency_ms"] == 0.0

    @pytest.mark.asyncio
    async def test_rerank_single_passage(self, deployment: RerankerDeployment):
        response = await deployment.rerank("test query", ["passage 1"])
        assert len(response.results) == 1
        assert response.results[0].passage == "passage 1"
        assert response.results[0].index == 0
        assert response.model == "BAAI/bge-reranker-v2-m3"
        assert 0 <= response.usage["latency_ms"] < 5000, "Latency should be bounded"

    @pytest.mark.asyncio
    async def test_rerank_multiple_passages(self, deployment: RerankerDeployment):
        passages = ["passage 1", "passage 2", "passage 3"]
        response = await deployment.rerank("test query", passages)
        assert len(response.results) == 3
        for result in response.results:
            assert result.passage in passages
            assert 0.0 <= result.score <= 1.0

    @pytest.mark.asyncio
    async def test_rerank_sorted_by_score_descending(
        self, deployment: RerankerDeployment
    ):
        passages = ["passage 1", "passage 2", "passage 3"]
        response = await deployment.rerank("test query", passages)
        scores = [r.score for r in response.results]
        assert scores == sorted(scores, reverse=True)

    @pytest.mark.asyncio
    async def test_rerank_with_top_k(self, deployment: RerankerDeployment):
        passages = ["passage 1", "passage 2", "passage 3", "passage 4"]
        response = await deployment.rerank("test query", passages, top_k=2)
        assert len(response.results) == 2

    @pytest.mark.asyncio
    async def test_rerank_top_k_larger_than_results(
        self, deployment: RerankerDeployment
    ):
        passages = ["passage 1", "passage 2"]
        response = await deployment.rerank("test query", passages, top_k=10)
        assert len(response.results) == 2

    @pytest.mark.asyncio
    async def test_rerank_single_score_as_number(self):
        class SingleScoreModel:
            def compute_score(
                self,
                pairs: list[list[str]],
                normalize: bool,
                batch_size: int,
            ) -> float:
                return 0.85

        with patch.object(RerankerDeployment, "__init__", lambda self: None):
            deployment = RerankerDeployment.__new__(RerankerDeployment)
            deployment._model_name = "BAAI/bge-reranker-v2-m3"
            deployment._max_batch_size = 16
            deployment._model = SingleScoreModel()
            deployment._is_ready = True

            response = await deployment.rerank("query", ["passage"])
            assert len(response.results) == 1
            assert response.results[0].score == 0.85

    @pytest.mark.asyncio
    async def test_rerank_batch_size_respected(self):
        call_args: list[int] = []

        class TrackingModel:
            def compute_score(
                self,
                pairs: list[list[str]],
                normalize: bool,
                batch_size: int,
            ) -> list[float]:
                call_args.append(batch_size)
                return [0.5 for _ in pairs]

        with patch.object(RerankerDeployment, "__init__", lambda self: None):
            deployment = RerankerDeployment.__new__(RerankerDeployment)
            deployment._model_name = "BAAI/bge-reranker-v2-m3"
            deployment._max_batch_size = 8
            deployment._model = TrackingModel()
            deployment._is_ready = True

            passages = ["p"] * 5
            await deployment.rerank("query", passages)
            assert call_args[0] == 5

            call_args.clear()
            passages = ["p"] * 20
            await deployment.rerank("query", passages)
            assert call_args[0] == 8

    @pytest.mark.asyncio
    async def test_rerank_latency_tracked(self, deployment: RerankerDeployment):
        response = await deployment.rerank("query", ["passage 1", "passage 2"])
        assert response.usage["latency_ms"] >= 0
        assert response.usage["latency_ms"] < 10000
