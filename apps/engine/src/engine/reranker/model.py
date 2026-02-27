from __future__ import annotations

import os
import sys
import threading
import warnings
from typing import Any, Literal, cast

warnings.filterwarnings("ignore", message=".*resource_tracker.*leaked semaphore.*")

import torch

from engine.core.logging import get_logger

logger = get_logger(__name__)

_model_instance: CrossEncoderModel | None = None
_model_lock = threading.Lock()


class ModelLoadError(Exception):
    pass


class CrossEncoderModel:
    MODEL_NAME = "BAAI/bge-reranker-v2-m3"

    _instance: CrossEncoderModel | None = None

    def __init__(self, model_name: str | None = None, device: str | None = None) -> None:
        self._model_name = model_name or self.MODEL_NAME
        self._device = self._resolve_device(device)
        self._backend = self._resolve_backend()
        self._model: Any
        self._tokenizer: Any = None
        self._model = self._load_model()

    def _resolve_device(self, device: str | None) -> str:
        override = (device or os.environ.get("CPU_ML_DEVICE") or "auto").strip().lower()
        if override != "auto":
            return override

        return self._select_device()

    def _resolve_backend(self) -> Literal["flagembedding", "transformers"]:
        override = (os.environ.get("CPU_ML_BACKEND") or "auto").strip().lower()
        if override in {"flagembedding", "transformers"}:
            return cast(Literal["flagembedding", "transformers"], override)

        # FlagEmbedding reranker has been observed to segfault on macOS/Python 3.12
        # in real server runs. Default to Transformers there unless overridden.
        if sys.platform == "darwin":
            return "transformers"

        return "flagembedding"

    def _select_device(self) -> str:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _load_model(self) -> Any:
        logger.info(
            "loading_cross_encoder",
            model=self._model_name,
            device=self._device,
            backend=self._backend,
        )
        try:
            if self._backend == "flagembedding":
                from FlagEmbedding import FlagReranker

                model = cast(Any, FlagReranker)(
                    self._model_name,
                    use_fp16=self._device != "cpu",
                    device=self._device,
                )
                self._tokenizer = None
                return model

            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            self._tokenizer = cast(Any, AutoTokenizer).from_pretrained(self._model_name)
            model = cast(Any, AutoModelForSequenceClassification).from_pretrained(
                self._model_name
            )
            model.eval()
            model.to(self._device)
            logger.info(
                "cross_encoder_loaded",
                model=self._model_name,
                device=self._device,
                backend=self._backend,
            )
            return model
        except Exception as e:
            logger.error(
                "cross_encoder_load_failed",
                model=self._model_name,
                device=self._device,
                backend=self._backend,
                error=str(e),
            )
            raise ModelLoadError(f"Failed to load {self._model_name}: {e}") from e

    @property
    def device(self) -> str:
        return self._device

    @property
    def model_name(self) -> str:
        return self._model_name

    def compute_scores(
        self,
        query: str,
        passages: list[str],
        normalize: bool = True,
        batch_size: int = 32,
    ) -> list[float]:
        if not passages:
            return []

        pairs = [[query, passage] for passage in passages]

        if self._backend == "flagembedding":
            scores = self._model.compute_score(
                pairs,
                normalize=normalize,
                batch_size=batch_size,
            )
        else:
            scores = self._compute_scores_transformers(pairs, batch_size=batch_size, normalize=normalize)

        if isinstance(scores, (int, float)):
            return [float(scores)]

        return [float(s) for s in scores]

    def compute_scores_batch(
        self,
        queries: list[str],
        passages_per_query: list[list[str]],
        normalize: bool = True,
        batch_size: int = 64,
    ) -> list[list[float]]:
        all_pairs: list[list[str]] = []
        indices: list[tuple[int, int]] = []

        for query_idx, (query, passages) in enumerate(
            zip(queries, passages_per_query, strict=True)
        ):
            for passage_idx, passage in enumerate(passages):
                all_pairs.append([query, passage])
                indices.append((query_idx, passage_idx))

        if not all_pairs:
            return [[] for _ in queries]

        all_scores = self._model.compute_score(
            all_pairs,
            normalize=normalize,
            batch_size=batch_size,
        )

        if isinstance(all_scores, (int, float)):
            all_scores = [all_scores]

        results: list[list[float]] = [[] for _ in queries]
        for idx, (query_idx, _) in enumerate(indices):
            results[query_idx].append(float(all_scores[idx]))

        return results

    def _compute_scores_transformers(
        self,
        pairs: list[list[str]],
        batch_size: int,
        normalize: bool,
    ) -> list[float]:
        if self._tokenizer is None:
            raise RuntimeError("Transformers backend not initialized correctly (tokenizer missing)")

        scores: list[float] = []
        with torch.inference_mode():
            for i in range(0, len(pairs), batch_size):
                batch = pairs[i : i + batch_size]
                queries = [q for q, _ in batch]
                passages = [p for _, p in batch]
                encoded = self._tokenizer(
                    queries,
                    passages,
                    padding=True,
                    truncation=True,
                    max_length=512,
                    return_tensors="pt",
                )
                encoded = {k: v.to(self._device) for k, v in encoded.items()}
                out = self._model(**encoded)
                logits = out.logits.squeeze(-1)
                if normalize:
                    logits = torch.sigmoid(logits)
                scores.extend([float(x) for x in logits.detach().cpu().tolist()])
        return scores


def get_cross_encoder_model(device: str | None = None) -> CrossEncoderModel:
    global _model_instance

    if _model_instance is not None:
        return _model_instance

    with _model_lock:
        if _model_instance is None:
            _model_instance = CrossEncoderModel(device=device)

    return _model_instance
