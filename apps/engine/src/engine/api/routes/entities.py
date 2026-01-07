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

    entities = extractor.extract(req.text, threshold=req.threshold)

    elapsed = (time.perf_counter() - start) * 1000

    return ExtractResponse(
        entities=[to_response(e) for e in entities],
        count=len(entities),
        elapsed_ms=round(elapsed, 2),
    )


@router.post("/extract/document", response_model=DocumentExtractResponse)
def extract_from_document(
    req: DocumentExtractRequest,
    request: Request,
) -> DocumentExtractResponse:
    extractor = get_entity_extractor(request)

    full_text = f"{req.title}\n\n{req.content}" if req.title else req.content
    entities = extractor.extract(full_text)

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
        entities=[to_response(e) for e in result_entities],
        entity_count=len(result_entities),
    )


def _extract_from_metadata(
    metadata: dict[str, str | int | bool | None],
) -> list[ExtractedEntity]:
    entities: list[ExtractedEntity] = []

    if channel := metadata.get("channel_name"):
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

    if repo := metadata.get("repository"):
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

    if project := metadata.get("project_name"):
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

    if team := metadata.get("team_name"):
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
