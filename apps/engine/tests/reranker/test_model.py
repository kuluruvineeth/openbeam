from __future__ import annotations

import sys
from unittest.mock import MagicMock, patch

import pytest


def get_mock_flag_embedding():
    return sys.modules["FlagEmbedding"]


class TestModelLoadError:
    def test_exception(self):
        from engine.reranker.model import ModelLoadError

        error = ModelLoadError("Failed to load model")
        assert str(error) == "Failed to load model"


class TestCrossEncoderModelConstants:
    def test_model_name_constant(self):
        from engine.reranker.model import CrossEncoderModel

        assert CrossEncoderModel.MODEL_NAME == "BAAI/bge-reranker-v2-m3"


class TestDeviceSelection:
    @patch("torch.cuda.is_available")
    @patch("torch.backends.mps.is_available")
    def test_selects_cuda(self, mock_mps, mock_cuda):
        mock_cuda.return_value = True
        mock_mps.return_value = False

        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.return_value = MagicMock()

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        assert model.device == "cuda"

    @patch("torch.cuda.is_available")
    @patch("torch.backends.mps.is_available")
    def test_selects_mps_when_no_cuda(self, mock_mps, mock_cuda):
        mock_cuda.return_value = False
        mock_mps.return_value = True

        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.return_value = MagicMock()

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        assert model.device == "mps"

    @patch("torch.cuda.is_available")
    @patch("torch.backends.mps.is_available")
    def test_selects_cpu_when_no_gpu(self, mock_mps, mock_cuda):
        mock_cuda.return_value = False
        mock_mps.return_value = False

        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.return_value = MagicMock()

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        assert model.device == "cpu"


class TestModelLoading:
    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_loads_with_default_model_name(self, mock_mps, mock_cuda):
        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.reset_mock()
        mock_flag.FlagReranker.return_value = MagicMock()

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()

        mock_flag.FlagReranker.assert_called_with(
            CrossEncoderModel.MODEL_NAME,
            use_fp16=False,
            device="cpu",
        )
        assert model.model_name == CrossEncoderModel.MODEL_NAME

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_loads_with_custom_model_name(self, mock_mps, mock_cuda):
        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.reset_mock()
        mock_flag.FlagReranker.return_value = MagicMock()

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel(model_name="custom/model")

        mock_flag.FlagReranker.assert_called_with(
            "custom/model",
            use_fp16=False,
            device="cpu",
        )
        assert model.model_name == "custom/model"

    @patch("torch.cuda.is_available", return_value=True)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_uses_fp16_on_cuda(self, mock_mps, mock_cuda):
        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.reset_mock()
        mock_flag.FlagReranker.return_value = MagicMock()

        from engine.reranker.model import CrossEncoderModel

        CrossEncoderModel()

        call_kwargs = mock_flag.FlagReranker.call_args[1]
        assert call_kwargs["use_fp16"] is True
        assert call_kwargs["device"] == "cuda"

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_raises_model_load_error_on_failure(self, mock_mps, mock_cuda):
        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.side_effect = RuntimeError("Download failed")

        from engine.reranker.model import CrossEncoderModel, ModelLoadError

        with pytest.raises(ModelLoadError) as exc_info:
            CrossEncoderModel()

        assert "Failed to load" in str(exc_info.value)

        mock_flag.FlagReranker.side_effect = None


class TestComputeScores:
    @pytest.fixture
    def mock_model(self):
        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.reset_mock()
        mock_reranker = MagicMock()
        mock_flag.FlagReranker.return_value = mock_reranker
        return mock_reranker

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_empty_passages_returns_empty(self, mock_mps, mock_cuda, mock_model):
        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores("test query", [])

        assert result == []
        mock_model.compute_score.assert_not_called()

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_single_passage(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = 0.85

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores("test query", ["passage 1"])

        assert result == [0.85]
        mock_model.compute_score.assert_called_once_with(
            [["test query", "passage 1"]],
            normalize=True,
            batch_size=32,
        )

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_multiple_passages(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = [0.9, 0.7, 0.5]

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores(
            "test query", ["passage 1", "passage 2", "passage 3"]
        )

        assert result == [0.9, 0.7, 0.5]

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_respects_normalize_param(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = [0.9]

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        model.compute_scores("query", ["passage"], normalize=False)

        call_kwargs = mock_model.compute_score.call_args[1]
        assert call_kwargs["normalize"] is False

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_respects_batch_size_param(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = [0.9]

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        model.compute_scores("query", ["passage"], batch_size=64)

        call_kwargs = mock_model.compute_score.call_args[1]
        assert call_kwargs["batch_size"] == 64


class TestComputeScoresBatch:
    @pytest.fixture
    def mock_model(self):
        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.reset_mock()
        mock_reranker = MagicMock()
        mock_flag.FlagReranker.return_value = mock_reranker
        return mock_reranker

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_empty_queries(self, mock_mps, mock_cuda, mock_model):
        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores_batch([], [])

        assert result == []

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_empty_passages_for_queries(self, mock_mps, mock_cuda, mock_model):
        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores_batch(["query1", "query2"], [[], []])

        assert result == [[], []]

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_single_query_single_passage(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = 0.9

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores_batch(["query"], [["passage"]])

        assert result == [[0.9]]

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_multiple_queries_multiple_passages(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = [0.9, 0.8, 0.7, 0.6]

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores_batch(
            ["query1", "query2"], [["p1", "p2"], ["p3", "p4"]]
        )

        assert result == [[0.9, 0.8], [0.7, 0.6]]

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_uneven_passages_per_query(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = [0.9, 0.8, 0.7]

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        result = model.compute_scores_batch(["q1", "q2"], [["p1"], ["p2", "p3"]])

        assert result == [[0.9], [0.8, 0.7]]

    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_respects_batch_size(self, mock_mps, mock_cuda, mock_model):
        mock_model.compute_score.return_value = [0.9]

        from engine.reranker.model import CrossEncoderModel

        model = CrossEncoderModel()
        model.compute_scores_batch(["query"], [["passage"]], batch_size=128)

        call_kwargs = mock_model.compute_score.call_args[1]
        assert call_kwargs["batch_size"] == 128


class TestGetCrossEncoderModel:
    @patch("torch.cuda.is_available", return_value=False)
    @patch("torch.backends.mps.is_available", return_value=False)
    def test_returns_singleton(self, mock_mps, mock_cuda):
        mock_flag = get_mock_flag_embedding()
        mock_flag.FlagReranker.reset_mock()
        mock_flag.FlagReranker.return_value = MagicMock()

        import engine.reranker.model as model_module

        model_module._model_instance = None

        from engine.reranker.model import get_cross_encoder_model

        model1 = get_cross_encoder_model()
        model2 = get_cross_encoder_model()

        assert model1 is model2
        assert mock_flag.FlagReranker.call_count == 1

        model_module._model_instance = None
