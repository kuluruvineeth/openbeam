from __future__ import annotations

import re
import threading
from dataclasses import dataclass
from typing import TYPE_CHECKING

import torch

from engine.core.logging import get_logger

if TYPE_CHECKING:
    from gliner import GLiNER

logger = get_logger(__name__)


@dataclass
class ExtractedEntity:
    text: str
    label: str
    score: float
    start: int
    end: int
    source: str


class ModelLoadError(Exception):
    pass


class EntityExtractor:
    MODEL_NAME = "urchade/gliner_medium-v2.1"

    GLINER_LABELS = [
        "person",
        "team",
        "project",
        "technology",
        "location",
        "organization",
    ]

    EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
    MENTION_PATTERN = re.compile(r"@([A-Za-z0-9_.-]+)")
    SLACK_USER_PATTERN = re.compile(r"<@([A-Z0-9]+)>")

    _instance: EntityExtractor | None = None
    _instance_lock = threading.Lock()

    def __init__(self) -> None:
        self._device = self._select_device()
        self._model: GLiNER | None = None
        self._model_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> EntityExtractor:
        if cls._instance is None:
            with cls._instance_lock:
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

    def _ensure_model(self) -> GLiNER:
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    from gliner import GLiNER

                    logger.info(
                        "loading_model", model=self.MODEL_NAME, device=self._device
                    )

                    try:
                        self._model = GLiNER.from_pretrained(self.MODEL_NAME)
                        self._model = self._model.to(self._device)
                        logger.info(
                            "model_loaded", model=self.MODEL_NAME, device=self._device
                        )
                    except Exception as e:
                        logger.error(
                            "model_load_failed",
                            model=self.MODEL_NAME,
                            device=self._device,
                            error=str(e),
                        )
                        raise ModelLoadError(
                            f"Failed to load {self.MODEL_NAME}: {e}"
                        ) from e

        return self._model

    def extract(
        self,
        text: str,
        threshold: float = 0.5,
        max_length: int = 4096,
    ) -> list[ExtractedEntity]:
        if not text or not text.strip():
            return []

        truncated = text[:max_length]
        entities: list[ExtractedEntity] = []

        entities.extend(self._extract_with_gliner(truncated, threshold))
        entities.extend(self._extract_with_regex(text))
        entities = self._deduplicate(entities)

        return entities

    def _extract_with_gliner(
        self,
        text: str,
        threshold: float,
    ) -> list[ExtractedEntity]:
        model = self._ensure_model()

        raw_entities = model.predict_entities(
            text,
            self.GLINER_LABELS,
            threshold=threshold,
        )

        return [
            ExtractedEntity(
                text=e["text"],
                label=e["label"],
                score=float(e["score"]),
                start=int(e["start"]),
                end=int(e["end"]),
                source="gliner",
            )
            for e in raw_entities
        ]

    def _extract_with_regex(self, text: str) -> list[ExtractedEntity]:
        entities: list[ExtractedEntity] = []

        for match in self.EMAIL_PATTERN.finditer(text):
            entities.append(
                ExtractedEntity(
                    text=match.group(),
                    label="person",
                    score=1.0,
                    start=match.start(),
                    end=match.end(),
                    source="regex",
                )
            )

        for match in self.MENTION_PATTERN.finditer(text):
            entities.append(
                ExtractedEntity(
                    text=match.group(1),
                    label="person",
                    score=0.9,
                    start=match.start(),
                    end=match.end(),
                    source="regex",
                )
            )

        for match in self.SLACK_USER_PATTERN.finditer(text):
            entities.append(
                ExtractedEntity(
                    text=match.group(1),
                    label="person",
                    score=1.0,
                    start=match.start(),
                    end=match.end(),
                    source="regex",
                )
            )

        return entities

    def _deduplicate(
        self,
        entities: list[ExtractedEntity],
    ) -> list[ExtractedEntity]:
        if not entities:
            return []

        sorted_entities = sorted(entities, key=lambda e: e.score, reverse=True)
        result: list[ExtractedEntity] = []

        for entity in sorted_entities:
            overlaps = False
            for existing in result:
                if self._overlaps(entity, existing):
                    overlaps = True
                    break

            if not overlaps:
                result.append(entity)

        return result

    @staticmethod
    def _overlaps(a: ExtractedEntity, b: ExtractedEntity) -> bool:
        return not (a.end <= b.start or b.end <= a.start)
