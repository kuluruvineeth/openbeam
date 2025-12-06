from pydantic import BaseModel

from engine.models.document import DocumentChunk, DocumentElement


class HealthResponse(BaseModel):
    status: str
    version: str


class ReadyResponse(BaseModel):
    ready: bool
    checks: dict[str, bool]


class ParseResponse(BaseModel):
    filename: str
    mime_type: str | None
    elements: list[DocumentElement]
    chunks: list[str] | None = None
    metadata: dict
    text_length: int
    page_count: int | None = None


class ChunkResponse(BaseModel):
    chunks: list[DocumentChunk]
    total_chunks: int
    total_characters: int
