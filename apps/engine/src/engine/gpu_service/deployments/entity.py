from __future__ import annotations

import re
import time
from typing import TYPE_CHECKING

import torch
from ray import serve

from engine.common.exceptions import ModelLoadError
from engine.common.logging import get_logger
from engine.common.metrics import MODEL_INFERENCE_LATENCY
from engine.models.entity import Entity, EntityResponse

if TYPE_CHECKING:
    from gliner import GLiNER

logger = get_logger(__name__)

DEFAULT_LABELS = [
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


@serve.deployment(
    ray_actor_options={"num_gpus": 0.2},
    max_ongoing_requests=30,
    autoscaling_config={
        "min_replicas": 1,
        "max_replicas": 3,
        "target_ongoing_requests": 15,
    },
)
class EntityDeployment:
    def __init__(
        self,
        model_name: str = "urchade/gliner_medium-v2.1",
        cache_dir: str = "/models/entity",
    ) -> None:
        self._model_name = model_name
        self._cache_dir = cache_dir
        self._model: GLiNER | None = None
        self._device: str = "cpu"
        self._is_ready = False

        self._load_model()

    def _select_device(self) -> str:
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _load_model(self) -> None:
        from gliner import GLiNER

        self._device = self._select_device()

        logger.info(
            "loading_entity_model",
            model=self._model_name,
            device=self._device,
        )

        try:
            self._model = GLiNER.from_pretrained(
                self._model_name,
                cache_dir=self._cache_dir,
            )
            self._model = self._model.to(self._device)
            self._is_ready = True
            logger.info("entity_model_loaded", model=self._model_name)
        except Exception as e:
            logger.error("entity_model_load_failed", error=str(e))
            raise ModelLoadError(f"Failed to load {self._model_name}: {e}") from e

    def ready(self) -> bool:
        return self._is_ready

    async def extract(
        self,
        text: str,
        labels: list[str] | None = None,
        threshold: float = 0.5,
    ) -> EntityResponse:
        if not self._is_ready or self._model is None:
            raise ModelLoadError("Model not loaded")

        if not text or not text.strip():
            return EntityResponse(
                entities=[],
                model=self._model_name,
                usage={"latency_ms": 0.0},
            )

        start_time = time.perf_counter()
        effective_labels = labels if labels else DEFAULT_LABELS

        truncated = text[:4096]

        entities: list[Entity] = []
        entities.extend(self._extract_with_gliner(truncated, effective_labels, threshold))
        entities.extend(self._extract_with_regex(text))
        entities = self._deduplicate(entities)

        elapsed = time.perf_counter() - start_time
        MODEL_INFERENCE_LATENCY.labels(model="gliner", operation="extract").observe(
            elapsed
        )

        return EntityResponse(
            entities=entities,
            model=self._model_name,
            usage={"latency_ms": round(elapsed * 1000, 2)},
        )

    def _extract_with_gliner(
        self,
        text: str,
        labels: list[str],
        threshold: float,
    ) -> list[Entity]:
        if self._model is None:
            return []

        raw_entities = self._model.predict_entities(
            text,
            labels,
            threshold=threshold,
        )

        return [
            Entity(
                text=e["text"],
                label=e["label"],
                score=float(e["score"]),
                start=int(e["start"]),
                end=int(e["end"]),
                source="gliner",
            )
            for e in raw_entities
        ]

    def _extract_with_regex(self, text: str) -> list[Entity]:
        entities: list[Entity] = []

        for match in EMAIL_PATTERN.finditer(text):
            entities.append(
                Entity(
                    text=match.group(),
                    label="person",
                    score=1.0,
                    start=match.start(),
                    end=match.end(),
                    source="regex",
                )
            )

        for match in MENTION_PATTERN.finditer(text):
            entities.append(
                Entity(
                    text=match.group(1),
                    label="person",
                    score=0.9,
                    start=match.start(),
                    end=match.end(),
                    source="regex",
                )
            )

        for match in SLACK_USER_PATTERN.finditer(text):
            entities.append(
                Entity(
                    text=match.group(1),
                    label="person",
                    score=1.0,
                    start=match.start(),
                    end=match.end(),
                    source="regex",
                )
            )

        return entities

    def _deduplicate(self, entities: list[Entity]) -> list[Entity]:
        if not entities:
            return []

        sorted_entities = sorted(entities, key=lambda e: e.score, reverse=True)
        result: list[Entity] = []

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
    def _overlaps(a: Entity, b: Entity) -> bool:
        return not (a.end <= b.start or b.end <= a.start)
