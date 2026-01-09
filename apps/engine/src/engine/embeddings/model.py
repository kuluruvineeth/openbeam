from __future__ import annotations

import os
import sys
import warnings
from typing import TYPE_CHECKING, Literal, TypedDict

warnings.filterwarnings("ignore", message=".*resource_tracker.*leaked semaphore.*")
warnings.filterwarnings("ignore", message=".*fast tokenizer.*pad method.*")

import torch

from engine.core.logging import get_logger

if TYPE_CHECKING:
    import numpy as np


class EncodeResult(TypedDict):
    dense_vecs: np.ndarray[tuple[int, int], np.dtype[np.floating]]
    lexical_weights: list[dict[int, float]]

logger = get_logger(__name__)


class ModelLoadError(Exception):
    """Raised when the embedding model fails to load."""


class BGEM3:
    MODEL_NAME = "BAAI/bge-m3"
    DENSE_DIM = 1024
    MAX_LENGTH = 8192

    _instance: BGEM3 | None = None

    def __init__(self, device: str | None = None) -> None:
        backend = self._resolve_backend()
        device = self._resolve_device(device)
        self._backend: Literal["flagembedding", "transformers"] = backend

        logger.info("loading_model", model=self.MODEL_NAME, device=device, backend=backend)

        try:
            if backend == "flagembedding":
                from FlagEmbedding import BGEM3FlagModel  # type: ignore[import-untyped]

                self._model = BGEM3FlagModel(
                    self.MODEL_NAME,
                    use_fp16=device != "cpu",
                    device=device,
                )
            else:
                from transformers import AutoModel, AutoTokenizer  # type: ignore[import-untyped]

                self._tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
                self._hf_model = AutoModel.from_pretrained(self.MODEL_NAME)
                self._hf_model.eval()
                self._hf_model.to(device)

            self._device = device
            logger.info("model_loaded", model=self.MODEL_NAME, device=device, backend=backend)
        except Exception as e:
            logger.error(
                "model_load_failed",
                model=self.MODEL_NAME,
                device=device,
                backend=backend,
                error=str(e),
            )
            raise ModelLoadError(f"Failed to load {self.MODEL_NAME}: {e}") from e

    @classmethod
    def get_instance(cls, device: str | None = None) -> BGEM3:
        if cls._instance is None:
            cls._instance = cls(device=device)
        return cls._instance

    def _resolve_backend(self) -> Literal["flagembedding", "transformers"]:
        override = (os.environ.get("CPU_ML_BACKEND") or "auto").strip().lower()
        if override in {"flagembedding", "transformers"}:
            return override  # type: ignore[return-value]

        # FlagEmbedding's BGEM3 implementation has been observed to segfault on
        # macOS/Python 3.12 in real server runs. Default to a pure-Transformers
        # backend on macOS unless explicitly overridden.
        if sys.platform == "darwin":
            return "transformers"

        return "flagembedding"

    def _resolve_device(self, device: str | None) -> str:
        override = (device or os.environ.get("CPU_ML_DEVICE") or "auto").strip().lower()
        if override != "auto":
            return override

        return self._select_device()

    def _select_device(self) -> str:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    @property
    def device(self) -> str:
        return self._device

    def encode(
        self,
        texts: list[str],
        max_length: int = 512,
        return_sparse: bool = True,
    ) -> EncodeResult:
        if self._backend == "flagembedding":
            result: EncodeResult = self._model.encode(
                texts,
                return_dense=True,
                return_sparse=return_sparse,
                return_colbert_vecs=False,
                max_length=max_length,
            )
            return result

        # Transformers fallback: dense-only sentence embeddings with mean pooling.
        # Sparse weights are not supported here (returned as empty dicts).
        with torch.inference_mode():
            encoded = self._tokenizer(
                texts,
                padding=True,
                truncation=True,
                max_length=max_length,
                return_tensors="pt",
            )
            encoded = {k: v.to(self._device) for k, v in encoded.items()}

            out = self._hf_model(**encoded)
            last_hidden = out.last_hidden_state
            mask = encoded["attention_mask"].unsqueeze(-1).to(last_hidden.dtype)
            pooled = (last_hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
            pooled = torch.nn.functional.normalize(pooled, p=2, dim=1)

        dense_np = pooled.detach().cpu().numpy()
        return EncodeResult(
            dense_vecs=dense_np,
            lexical_weights=[{} for _ in texts] if return_sparse else [{} for _ in texts],
        )
