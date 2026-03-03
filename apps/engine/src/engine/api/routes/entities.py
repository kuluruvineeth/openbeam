import time

from fastapi import APIRouter, Request

from engine.entities import EntityExtractor, ExtractedEntity
from engine.models.entity import (
    DocumentExtractRequest,
    DocumentExtractResponse,
    ExtractedEntityResponse,
    ExtractRequest,
    ExtractResponse,
)

router = APIRouter()


def get_entity_extractor(request: Request) -> EntityExtractor:
    extractor: EntityExtractor = request.app.state.entity_extractor
    return extractor


def to_response(entity: ExtractedEntity) -> ExtractedEntityResponse:
    return ExtractedEntityResponse(
        text=entity.text,
        label=entity.label,
        score=entity.score,
        start=entity.start,
        end=entity.end,
        source=entity.source,
    )


@router.post("/extract", response_model=ExtractResponse)
def extract_entities(
    req: ExtractRequest,
    request: Request,
) -> ExtractResponse:
    start = time.perf_counter()
    extractor = get_entity_extractor(request)

    entities = extractor.extract(req.text, threshold=req.threshold, labels=req.labels)

    elapsed = (time.perf_counter() - start) * 1000

    return ExtractResponse(
        entities=[to_response(e) for e in entities],
        count=len(entities),
        elapsed_ms=round(elapsed, 2),
    )


_METADATA_EXTRACTORS: dict[str, list[tuple[str, str, float]]] = {
    "__universal__": [
        ("channel_name", "channel", 1.0),
        ("repository", "repository", 1.0),
        ("project_name", "project", 1.0),
        ("team_name", "team", 1.0),
    ],
    "github": [
        ("repoFullName", "repository", 1.0),
        ("milestoneTitle", "event", 0.95),
        ("headRef", "topic", 0.7),
        ("baseRef", "topic", 0.7),
    ],
    "linear": [
        ("teamName", "team", 1.0),
        ("teamKey", "team", 1.0),
        ("projectName", "project", 1.0),
        ("cycleName", "event", 0.95),
        ("stateName", "topic", 0.8),
        ("identifier", "ticket", 1.0),
        ("parentIdentifier", "ticket", 1.0),
    ],
    "slack": [
        ("channelName", "channel", 1.0),
    ],
    "notion": [
        ("databaseName", "project", 0.9),
    ],
    "google_drive": [
        ("lastModifierName", "person", 0.95),
        ("lastModifierEmail", "person", 0.95),
        ("driveId", "project", 0.8),
    ],
}

_ARRAY_EXTRACTORS: dict[str, list[tuple[str, str, float]]] = {
    "github": [
        ("assignees", "person", 1.0),
        ("requestedReviewers", "person", 1.0),
    ],
    "gmail": [
        ("participants", "person", 1.0),
    ],
}

_NESTED_ARRAY_EXTRACTORS: dict[str, list[tuple[str, str, str, float]]] = {
    "github": [
        ("labels", "name", "topic", 0.85),
    ],
    "linear": [
        ("labels", "name", "topic", 0.85),
        ("teams", "name", "team", 1.0),
    ],
}


@router.post("/extract/document", response_model=DocumentExtractResponse)
def extract_from_document(
    req: DocumentExtractRequest,
    request: Request,
) -> DocumentExtractResponse:
    extractor = get_entity_extractor(request)

    full_text = f"{req.title}\n\n{req.content}" if req.title else req.content
    entities = extractor.extract(full_text, connector_type=req.connector_type)

    result_entities: list[ExtractedEntity] = list(entities)

    if req.author:
        result_entities.append(
            _metadata_entity(req.author, "person", 1.0)
        )

    if req.author_email and req.author_email != req.author:
        result_entities.append(
            _metadata_entity(req.author_email, "person", 1.0)
        )

    for field in (req.participants, req.assignees, req.reviewers):
        if field:
            for name in field:
                if name.strip():
                    result_entities.append(
                        _metadata_entity(name.strip(), "person", 1.0)
                    )

    if req.labels:
        for label_obj in req.labels:
            name = label_obj.get("name", "")
            if name.strip():
                result_entities.append(
                    _metadata_entity(name.strip(), "topic", 0.85)
                )

    if req.connector_metadata:
        result_entities.extend(
            _extract_from_metadata(req.connector_metadata, req.connector_type)
        )

    return DocumentExtractResponse(
        doc_id=req.doc_id,
        entities=[to_response(e) for e in result_entities],
        entity_count=len(result_entities),
    )


def _metadata_entity(text: str, label: str, score: float) -> ExtractedEntity:
    return ExtractedEntity(
        text=text, label=label, score=score, start=0, end=0, source="metadata",
    )


class _MetadataCollector:
    def __init__(self) -> None:
        self.entities: list[ExtractedEntity] = []
        self._seen: set[tuple[str, str]] = set()

    def add(self, text: str, label: str, score: float) -> None:
        key = (text.strip().lower(), label)
        if key in self._seen or not text.strip():
            return
        self._seen.add(key)
        self.entities.append(_metadata_entity(text.strip(), label, score))

    def extract_scalars(
        self,
        metadata: dict[str, str | int | bool | None],
        extractors: list[tuple[str, str, float]],
    ) -> None:
        for meta_key, label, conf in extractors:
            val = metadata.get(meta_key)
            if isinstance(val, str) and val.strip():
                self.add(val, label, conf)

    def extract_arrays(
        self,
        metadata: dict[str, str | int | bool | None],
        extractors: list[tuple[str, str, float]],
    ) -> None:
        for meta_key, label, conf in extractors:
            val = metadata.get(meta_key)
            if isinstance(val, list):
                for item in val:
                    if isinstance(item, str) and item.strip():
                        self.add(item, label, conf)

    def extract_nested(
        self,
        metadata: dict[str, str | int | bool | None],
        extractors: list[tuple[str, str, str, float]],
    ) -> None:
        for meta_key, name_field, label, conf in extractors:
            val = metadata.get(meta_key)
            if isinstance(val, list):
                for item in val:
                    if isinstance(item, dict):
                        name = item.get(name_field)
                        if isinstance(name, str) and name.strip():
                            self.add(name, label, conf)


def _extract_from_metadata(
    metadata: dict[str, str | int | bool | None],
    connector_type: str | None = None,
) -> list[ExtractedEntity]:
    collector = _MetadataCollector()

    collector.extract_scalars(metadata, _METADATA_EXTRACTORS["__universal__"])

    if connector_type and connector_type in _METADATA_EXTRACTORS:
        collector.extract_scalars(metadata, _METADATA_EXTRACTORS[connector_type])

    if connector_type and connector_type in _ARRAY_EXTRACTORS:
        collector.extract_arrays(metadata, _ARRAY_EXTRACTORS[connector_type])

    if connector_type and connector_type in _NESTED_ARRAY_EXTRACTORS:
        collector.extract_nested(metadata, _NESTED_ARRAY_EXTRACTORS[connector_type])

    return collector.entities


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "service": "entities"}
