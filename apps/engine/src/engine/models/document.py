from pydantic import BaseModel, Field


class DocumentElement(BaseModel):
    type: str
    text: str
    metadata: dict | None = None
    page_number: int | None = None


class ParsedDocument(BaseModel):
    elements: list[DocumentElement]
    metadata: dict = Field(default_factory=dict)
    page_count: int | None = None
    text_length: int = 0


class DocumentChunk(BaseModel):
    index: int
    text: str
    metadata: dict = Field(default_factory=dict)
    page_number: int | None = None
    page_end: int | None = None
