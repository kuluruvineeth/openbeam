from __future__ import annotations

import sys
import types
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# Inject a fake FlagEmbedding module so patch("FlagEmbedding.BGEM3FlagModel") works
# even when the real GPU package isn't installed.
_flag_mod = types.ModuleType("FlagEmbedding")
_flag_mod.BGEM3FlagModel = MagicMock()  # type: ignore[attr-defined]
sys.modules.setdefault("FlagEmbedding", _flag_mod)

from engine.embeddings.model import BGEM3, EncodeResult, ModelLoadError


class TestEncodeResultTypedDict:
    def test_structure(self):
        result: EncodeResult = {
            "dense_vecs": np.array([[0.1, 0.2], [0.3, 0.4]]),
            "lexical_weights": [{"1": 0.5}, {"2": 0.3}],
        }
        assert result["dense_vecs"].shape == (2, 2)
        assert len(result["lexical_weights"]) == 2


class TestModelLoadError:
    def test_inherits_from_exception(self):
        assert issubclass(ModelLoadError, Exception)

    def test_message(self):
        error = ModelLoadError("Failed to load model")
        assert str(error) == "Failed to load model"


class TestBGEM3Constants:
    def test_model_name(self):
        assert BGEM3.MODEL_NAME == "BAAI/bge-m3"

    def test_dense_dim(self):
        assert BGEM3.DENSE_DIM == 1024

    def test_max_length(self):
        assert BGEM3.MAX_LENGTH == 8192


def _patch_bgem3(backend="flagembedding", device="cpu"):
    """Return a stack of patches that force a specific backend and device."""
    patches = [
        patch.object(BGEM3, "_resolve_backend", return_value=backend),
        patch.object(BGEM3, "_resolve_device", return_value=device),
    ]
    return patches


class TestBGEM3SelectDevice:
    @patch("engine.embeddings.model.torch")
    def test_cuda_when_available(self, mock_torch):
        mock_torch.cuda.is_available.return_value = True

        model = BGEM3.__new__(BGEM3)
        result = model._select_device()

        assert result == "cuda"

    @patch("engine.embeddings.model.torch")
    def test_mps_when_cuda_unavailable(self, mock_torch):
        mock_torch.cuda.is_available.return_value = False
        mock_torch.backends.mps.is_available.return_value = True

        model = BGEM3.__new__(BGEM3)
        result = model._select_device()

        assert result == "mps"

    @patch("engine.embeddings.model.torch")
    def test_cpu_fallback(self, mock_torch):
        mock_torch.cuda.is_available.return_value = False
        mock_torch.backends.mps.is_available.return_value = False

        model = BGEM3.__new__(BGEM3)
        result = model._select_device()

        assert result == "cpu"


class TestBGEM3Init:
    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_init_success(self, mock_model_class):
        mock_instance = MagicMock()
        mock_model_class.return_value = mock_instance

        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"):
            model = BGEM3()

        assert model._model is mock_instance
        mock_model_class.assert_called_once_with(
            BGEM3.MODEL_NAME,
            use_fp16=False,
            device="cpu",
        )

    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_init_uses_fp16_on_gpu(self, mock_model_class):
        mock_instance = MagicMock()
        mock_model_class.return_value = mock_instance

        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cuda"):
            BGEM3()

        mock_model_class.assert_called_once_with(
            BGEM3.MODEL_NAME,
            use_fp16=True,
            device="cuda",
        )

    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_init_failure_raises_model_load_error(self, mock_model_class):
        mock_model_class.side_effect = RuntimeError("Out of memory")

        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"), \
             pytest.raises(ModelLoadError) as exc_info:
            BGEM3()

        assert "Failed to load" in str(exc_info.value)
        assert "BAAI/bge-m3" in str(exc_info.value)


class TestBGEM3GetInstance:
    @pytest.fixture(autouse=True)
    def reset_singleton(self):
        original = BGEM3._instance
        BGEM3._instance = None
        yield
        BGEM3._instance = original

    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_creates_singleton(self, mock_model_class):
        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"):
            instance1 = BGEM3.get_instance()
            instance2 = BGEM3.get_instance()

        assert instance1 is instance2
        assert mock_model_class.call_count == 1

    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_returns_existing_instance(self, mock_model_class):
        existing = MagicMock()
        BGEM3._instance = existing

        result = BGEM3.get_instance()

        assert result is existing
        mock_model_class.assert_not_called()


class TestBGEM3Device:
    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_device_property(self, mock_model_class):
        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"):
            model = BGEM3()

        assert model.device == "cpu"


class TestBGEM3Encode:
    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_encode_with_defaults(self, mock_model_class):
        mock_instance = MagicMock()
        expected_result: EncodeResult = {
            "dense_vecs": np.array([[0.1, 0.2]]),
            "lexical_weights": [{"1": 0.5}],
        }
        mock_instance.encode.return_value = expected_result
        mock_model_class.return_value = mock_instance

        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"):
            model = BGEM3()

        result = model.encode(["test text"])

        assert result == expected_result
        mock_instance.encode.assert_called_once_with(
            ["test text"],
            return_dense=True,
            return_sparse=True,
            return_colbert_vecs=False,
            max_length=512,
        )

    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_encode_with_custom_max_length(self, mock_model_class):
        mock_instance = MagicMock()
        mock_instance.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [],
        }
        mock_model_class.return_value = mock_instance

        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"):
            model = BGEM3()

        model.encode(["text"], max_length=1024)

        mock_instance.encode.assert_called_once()
        call_kwargs = mock_instance.encode.call_args
        assert call_kwargs[1]["max_length"] == 1024

    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_encode_without_sparse(self, mock_model_class):
        mock_instance = MagicMock()
        mock_instance.encode.return_value = {
            "dense_vecs": np.array([[0.1]]),
            "lexical_weights": [],
        }
        mock_model_class.return_value = mock_instance

        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"):
            model = BGEM3()

        model.encode(["text"], return_sparse=False)

        mock_instance.encode.assert_called_once()
        call_kwargs = mock_instance.encode.call_args
        assert call_kwargs[1]["return_sparse"] is False

    @patch("FlagEmbedding.BGEM3FlagModel")
    def test_encode_multiple_texts(self, mock_model_class):
        mock_instance = MagicMock()
        expected_result: EncodeResult = {
            "dense_vecs": np.array([[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]),
            "lexical_weights": [{"1": 0.5}, {"2": 0.3}, {"3": 0.2}],
        }
        mock_instance.encode.return_value = expected_result
        mock_model_class.return_value = mock_instance

        with patch.object(BGEM3, "_resolve_backend", return_value="flagembedding"), \
             patch.object(BGEM3, "_resolve_device", return_value="cpu"):
            model = BGEM3()

        result = model.encode(["text1", "text2", "text3"])

        assert result["dense_vecs"].shape == (3, 2)
        assert len(result["lexical_weights"]) == 3
