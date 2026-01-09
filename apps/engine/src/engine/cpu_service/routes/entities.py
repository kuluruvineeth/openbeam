from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()


class ExtractRequest(BaseModel):
    text: str
    threshold: float = 0.5
    labels: list[str] | None = None


class ExtractedEntityResponse(BaseModel):
    text: str
    label: str
    score: float
    start: int
    end: int
    source: str


class ExtractResponse(BaseModel):
    entities: list[ExtractedEntityResponse]
    count: int
    elapsed_ms: float


class DocumentExtractRequest(BaseModel):
    doc_id: str
    title: str | None = None
    content: str
    author: str | None = None
    connector_metadata: dict[str, str | int | bool | None] | None = None


class DocumentExtractResponse(BaseModel):
    doc_id: str
    entities: list[ExtractedEntityResponse]
    entity_count: int


def _get_extractor(request: Request):
    extractor = request.app.state.entity_extractor
    if extractor is None:
        raise HTTPException(
            status_code=503,
            detail="Entity extractor not available. Set CPU_ENABLE_ML=true to enable.",
        )
    return extractor


def _to_response(entity) -> ExtractedEntityResponse:
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
    extractor = _get_extractor(request)

    entities = extractor.extract(req.text, threshold=req.threshold, labels=req.labels)

    elapsed = (time.perf_counter() - start) * 1000

    return ExtractResponse(
        entities=[_to_response(e) for e in entities],
        count=len(entities),
        elapsed_ms=round(elapsed, 2),
    )


@router.post("/extract/document", response_model=DocumentExtractResponse)
def extract_from_document(
    req: DocumentExtractRequest,
    request: Request,
) -> DocumentExtractResponse:
    extractor = _get_extractor(request)

    full_text = f"{req.title}\n\n{req.content}" if req.title else req.content
    entities = extractor.extract(full_text)

    from engine.entities import ExtractedEntity

    result_entities: list[ExtractedEntity] = list(entities)

    if req.author:
        result_entities.append(
            ExtractedEntity(
                text=req.author,
                label="person",
                score=1.0,
                start=0,
                end=0,
                source="metadata",
            )
        )

    if req.connector_metadata:
        result_entities.extend(_extract_from_metadata(req.connector_metadata))

    return DocumentExtractResponse(
        doc_id=req.doc_id,
        entities=[_to_response(e) for e in result_entities],
        entity_count=len(result_entities),
    )


def _extract_from_metadata(
    metadata: dict[str, str | int | bool | None],
) -> list:
    from engine.entities import ExtractedEntity

    entities: list[ExtractedEntity] = []

    channel = metadata.get("channel_name")
    if isinstance(channel, str):
        entities.append(
            ExtractedEntity(
                text=channel,
                label="channel",
                score=1.0,
                start=0,
                end=0,
                source="metadata",
            )
        )

    repo = metadata.get("repository")
    if isinstance(repo, str):
        entities.append(
            ExtractedEntity(
                text=repo,
                label="repository",
                score=1.0,
                start=0,
                end=0,
                source="metadata",
            )
        )

    project = metadata.get("project_name")
    if isinstance(project, str):
        entities.append(
            ExtractedEntity(
                text=project,
                label="project",
                score=1.0,
                start=0,
                end=0,
                source="metadata",
            )
        )

    team = metadata.get("team_name")
    if isinstance(team, str):
        entities.append(
            ExtractedEntity(
                text=team,
                label="team",
                score=1.0,
                start=0,
                end=0,
                source="metadata",
            )
        )

    return entities


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "service": "entities"}
