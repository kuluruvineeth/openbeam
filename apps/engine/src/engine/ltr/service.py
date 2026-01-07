from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import TYPE_CHECKING

import lightgbm as lgb
import structlog

from .features import LTRFeatureExtractor

if TYPE_CHECKING:
    from engine.models.ltr import DocumentFeatures, UserContext

from typing import TypedDict


class ScoredDocument(TypedDict):
    doc_id: str
    score: float
    features: dict[str, float]

logger = structlog.get_logger()

_service_instance: LTRService | None = None
_service_lock = threading.Lock()


class LTRService:
    DEFAULT_MODEL_PATH = Path("/models/ltr")

    def __init__(
        self,
        model_path: Path | None = None,
        model_version: str = "latest",
    ) -> None:
        self._model_path = model_path or self.DEFAULT_MODEL_PATH
        self._model_version = model_version
        self._model: lgb.Booster | None = None
        self._feature_extractor = LTRFeatureExtractor()
        self._load_model()

    def _load_model(self) -> None:
        version_path = self._model_path / self._model_version
        model_file = version_path / "model.txt"

        if not model_file.exists():
            logger.warning(
                "ltr_model_not_found",
                path=str(model_file),
            )
            return

        self._model = lgb.Booster(model_file=str(model_file))
        logger.info(
            "ltr_model_loaded",
            version=self._model_version,
            path=str(model_file),
        )

    def reload_model(self, version: str | None = None) -> None:
        if version:
            self._model_version = version
        self._load_model()

    @property
    def is_ready(self) -> bool:
        return self._model is not None

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def feature_count(self) -> int:
        return self._feature_extractor.feature_count

    @property
    def model_path(self) -> Path:
        return self._model_path

    def score(
        self,
        docs: list[DocumentFeatures],
        query: str,
        user_context: UserContext | None = None,
        top_k: int = 20,
    ) -> tuple[list[ScoredDocument], float]:
        start_time = time.perf_counter()

        if not self.is_ready or len(docs) == 0:
            return [], 0.0

        features = self._feature_extractor.extract_batch(docs, query, user_context)
        if self._model is None:
            return [], 0.0
        scores = self._model.predict(features)

        results: list[ScoredDocument] = []
        for doc, score, feature_vec in zip(docs, scores, features, strict=True):
            results.append(
                {
                    "doc_id": doc.doc_id,
                    "score": float(score),
                    "features": dict(
                        zip(
                            self._feature_extractor.feature_names,
                            feature_vec.tolist(),
                            strict=True,
                        )
                    ),
                }
            )

        results.sort(key=lambda x: x["score"], reverse=True)
        results = results[:top_k]

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        logger.debug(
            "ltr_scoring_completed",
            input_docs=len(docs),
            output_docs=len(results),
            elapsed_ms=round(elapsed_ms, 2),
        )

        return results, elapsed_ms


def get_ltr_service() -> LTRService:
    global _service_instance

    if _service_instance is not None:
        return _service_instance

    with _service_lock:
        if _service_instance is None:
            _service_instance = LTRService()

    return _service_instance
