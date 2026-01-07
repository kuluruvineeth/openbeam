from typing import Any

from pydantic import BaseModel, Field


class DocumentElement(BaseModel):
    type: str
    text: str
    metadata: dict[str, Any] | None = None
    page_number: int | None = None


class ParsedDocument(BaseModel):
    elements: list[DocumentElement]
    metadata: dict[str, Any] = Field(default_factory=dict)
    page_count: int | None = None
    text_length: int = 0


class DocumentChunk(BaseModel):
    index: int
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    page_number: int | None = None
    page_end: int | None = None
