from __future__ import annotations

import re
import threading
from typing import TYPE_CHECKING, ClassVar

import torch

from engine.core.logging import get_logger
from engine.entities.chunker import chunk_text
from engine.entities.preprocessor import TextPreprocessor
from engine.entities.types import ExtractedEntity
from engine.entities.validator import EntityValidator

if TYPE_CHECKING:
    from gliner import GLiNER

logger = get_logger(__name__)


class ModelLoadError(Exception):
    pass


MAX_INPUT_LENGTH = 50_000
CHUNK_MAX_WORDS = 300
CHUNK_OVERLAP_WORDS = 50

_CONNECTOR_REGEX: dict[str, list[tuple[re.Pattern[str], str, float]]] = {
    "github": [
        (re.compile(r"(?<!\w)#(\d{1,6})\b"), "ticket", 0.9),
    ],
    "linear": [
        (re.compile(r"\b([A-Z]{2,10}-\d{1,6})\b"), "ticket", 0.95),
    ],
    "jira": [
        (re.compile(r"\b([A-Z]{2,10}-\d{1,6})\b"), "ticket", 0.95),
    ],
    "confluence": [
        (re.compile(r"\b([A-Z]{2,10}-\d{1,6})\b"), "ticket", 0.9),
    ],
    "slack": [
        (re.compile(r"<#[A-Z0-9]+\|([^>]+)>"), "channel", 1.0),
    ],
    "zendesk": [
        (
            re.compile(r"(?:ticket\s*#?\s*|#)(\d{4,8})\b", re.IGNORECASE),
            "ticket",
            0.9,
        ),
    ],
}


class EntityExtractor:
    MODEL_NAME = "gliner-community/gliner_medium-v2.5"

    GLINER_LABELS: ClassVar[list[str]] = [
        "person",
        "team",
        "project",
        "technology",
        "location",
        "organization",
        "topic",
        "product",
        "customer",
        "event",
        "ticket",
        "code repository",
        "communication channel",
    ]

    EMAIL_PATTERN = re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    )
    MENTION_PATTERN = re.compile(r"@([A-Za-z0-9_.-]+)")
    SLACK_USER_PATTERN = re.compile(r"<@([A-Z0-9]+)>")

    _instance: EntityExtractor | None = None
    _instance_lock = threading.Lock()

    def __init__(self) -> None:
        self._device = self._select_device()
        self._model: GLiNER | None = None
        self._model_lock = threading.Lock()
        self._preprocessor = TextPreprocessor()
        self._validator = EntityValidator()

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
                        "loading_model",
                        model=self.MODEL_NAME,
                        device=self._device,
                    )

                    try:
                        self._model = GLiNER.from_pretrained(
                            self.MODEL_NAME,
                            load_tokenizer=True,
                        )
                        self._model = self._model.to(self._device)
                        logger.info(
                            "model_loaded",
                            model=self.MODEL_NAME,
                            device=self._device,
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
        max_length: int = MAX_INPUT_LENGTH,
        labels: list[str] | None = None,
        connector_type: str | None = None,
    ) -> list[ExtractedEntity]:
        if not text or not text.strip():
            return []

        text = text[:max_length]

        preprocessed = self._preprocessor.clean(text)
        cleaned = preprocessed.cleaned
        if not cleaned.strip():
            return []

        chunks = chunk_text(
            cleaned,
            max_words=CHUNK_MAX_WORDS,
            overlap_words=CHUNK_OVERLAP_WORDS,
        )

        gliner_entities: list[ExtractedEntity] = []
        for chunk in chunks:
            chunk_entities = self._extract_with_gliner(
                chunk.text, threshold, labels
            )
            for entity in chunk_entities:
                cleaned_start = chunk.char_start + entity.start
                cleaned_end = chunk.char_start + entity.end
                gliner_entities.append(
                    ExtractedEntity(
                        text=entity.text,
                        label=entity.label,
                        score=entity.score,
                        start=preprocessed.remap_offset(cleaned_start),
                        end=preprocessed.remap_offset(cleaned_end),
                        source="gliner",
                    )
                )

        gliner_entities = self._validator.filter_batch(gliner_entities)

        regex_entities = self._extract_with_regex(text)
        regex_entities.extend(self._extract_with_connector_regex(text, connector_type))

        return self._deduplicate(gliner_entities + regex_entities)

    def _extract_with_gliner(
        self,
        text: str,
        threshold: float,
        labels: list[str] | None = None,
    ) -> list[ExtractedEntity]:
        model = self._ensure_model()

        labels_to_use = labels if labels is not None else self.GLINER_LABELS

        raw_entities = model.predict_entities(
            text,
            labels_to_use,
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

    @staticmethod
    def _extract_with_connector_regex(
        text: str,
        connector_type: str | None,
    ) -> list[ExtractedEntity]:
        if not connector_type or connector_type not in _CONNECTOR_REGEX:
            return []

        entities: list[ExtractedEntity] = []
        for pattern, label, score in _CONNECTOR_REGEX[connector_type]:
            for match in pattern.finditer(text):
                entity_text = match.group(1) if match.lastindex else match.group()
                entities.append(
                    ExtractedEntity(
                        text=entity_text,
                        label=label,
                        score=score,
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
        occupied: list[tuple[int, int]] = []

        for entity in sorted_entities:
            if not self._has_overlap(entity.start, entity.end, occupied):
                result.append(entity)
                self._insert_sorted(occupied, (entity.start, entity.end))

        return result

    @staticmethod
    def _has_overlap(
        start: int,
        end: int,
        occupied: list[tuple[int, int]],
    ) -> bool:
        if not occupied:
            return False

        lo, hi = 0, len(occupied)
        while lo < hi:
            mid = (lo + hi) // 2
            if occupied[mid][0] < end:
                lo = mid + 1
            else:
                hi = mid

        for i in range(lo - 1, -1, -1):
            occ_start, occ_end = occupied[i]
            if occ_end <= start:
                break
            if not (end <= occ_start or occ_end <= start):
                return True
        return False

    @staticmethod
    def _insert_sorted(
        occupied: list[tuple[int, int]],
        interval: tuple[int, int],
    ) -> None:
        lo, hi = 0, len(occupied)
        while lo < hi:
            mid = (lo + hi) // 2
            if occupied[mid][0] < interval[0]:
                lo = mid + 1
            else:
                hi = mid
        occupied.insert(lo, interval)

    @staticmethod
    def _overlaps(a: ExtractedEntity, b: ExtractedEntity) -> bool:
        return not (a.end <= b.start or b.end <= a.start)
