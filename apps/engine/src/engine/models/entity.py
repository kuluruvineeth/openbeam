from pydantic import BaseModel, Field


class Entity(BaseModel):
    text: str
    label: str
    score: float
    start: int
    end: int
    source: str


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=100000)
    labels: list[str] | None = None
    threshold: float = Field(default=0.5, ge=0.0, le=1.0)


class EntityResponse(BaseModel):
    entities: list[Entity]
    model: str
    usage: dict[str, float]


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
    title: str = ""
    content: str = Field(..., min_length=1, max_length=100000)
    author: str | None = None
    connector_metadata: dict[str, str | int | bool | None] | None = None


class DocumentExtractResponse(BaseModel):
    doc_id: str
    entities: list[ExtractedEntityResponse]
    entity_count: int
