from __future__ import annotations

import warnings
from typing import TYPE_CHECKING, TypedDict

import torch
from FlagEmbedding import BGEM3FlagModel

from engine.core.logging import get_logger

if TYPE_CHECKING:
    import numpy as np

warnings.filterwarnings(
    "ignore",
    message=".*fast tokenizer.*pad method.*",
    category=UserWarning,
)


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

    def __init__(self) -> None:
        device = self._select_device()
        logger.info("loading_model", model=self.MODEL_NAME, device=device)

        try:
            self._model = BGEM3FlagModel(
                self.MODEL_NAME,
                use_fp16=device != "cpu",
                device=device,
            )
            self._device = device
            logger.info("model_loaded", model=self.MODEL_NAME, device=device)
        except Exception as e:
            logger.error(
                "model_load_failed",
                model=self.MODEL_NAME,
                device=device,
                error=str(e),
            )
            raise ModelLoadError(f"Failed to load {self.MODEL_NAME}: {e}") from e

    @classmethod
    def get_instance(cls) -> BGEM3:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

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
        result: EncodeResult = self._model.encode(
            texts,
            return_dense=True,
            return_sparse=return_sparse,
            return_colbert_vecs=False,
            max_length=max_length,
        )
        return result
