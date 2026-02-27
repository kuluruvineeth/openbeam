from __future__ import annotations

import os
import sys
import warnings
from typing import TYPE_CHECKING, Any, Literal, TypedDict, cast

import torch

from engine.core.logging import get_logger

warnings.filterwarnings("ignore", message=".*resource_tracker.*leaked semaphore.*")
warnings.filterwarnings("ignore", message=".*fast tokenizer.*pad method.*")

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

        logger.info(
            "loading_model", model=self.MODEL_NAME, device=device, backend=backend
        )

        try:
            if backend == "flagembedding":
                from FlagEmbedding import BGEM3FlagModel

                self._model = cast(Any, BGEM3FlagModel)(
                    self.MODEL_NAME,
                    use_fp16=device != "cpu",
                    device=device,
                )
            else:
                from transformers import AutoModel, AutoTokenizer  # noqa: I001

                self._tokenizer = cast(Any, AutoTokenizer).from_pretrained(self.MODEL_NAME)
                self._hf_model = cast(Any, AutoModel).from_pretrained(self.MODEL_NAME)
                self._hf_model.eval()
                self._hf_model.to(device)

            self._device = device
            logger.info(
                "model_loaded", model=self.MODEL_NAME, device=device, backend=backend
            )
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
            return cast(Literal["flagembedding", "transformers"], override)

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
        lexical_weights: list[dict[int, float]]
        if not return_sparse:
            lexical_weights = [{} for _ in texts]
        else:
            input_ids = encoded["input_ids"].detach().cpu()
            attention_mask = encoded["attention_mask"].detach().cpu()
            special_ids = set(getattr(self._tokenizer, "all_special_ids", []) or [])

            lexical_weights = []
            for ids_row, mask_row in zip(
                input_ids.tolist(),
                attention_mask.tolist(),
                strict=False,
            ):
                counts: dict[int, int] = {}
                total = 0
                for token_id, keep in zip(ids_row, mask_row, strict=False):
                    if not keep:
                        continue
                    if token_id in special_ids:
                        continue
                    total += 1
                    counts[token_id] = counts.get(token_id, 0) + 1

                if total == 0:
                    lexical_weights.append({})
                    continue

                lexical_weights.append(
                    {token_id: count / total for token_id, count in counts.items()}
                )

        return EncodeResult(
            dense_vecs=dense_np,
            lexical_weights=lexical_weights,
        )
