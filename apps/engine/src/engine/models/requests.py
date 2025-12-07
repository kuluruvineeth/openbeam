from typing import Literal

from pydantic import BaseModel, Field

ParserStrategy = Literal["fast", "hi_res", "ocr_only", "auto"]


class ParseUrlRequest(BaseModel):
    url: str
    filename: str | None = None
    strategy: ParserStrategy | None = None


class ChunkRequest(BaseModel):
    text: str
    max_characters: int = Field(default=1500, ge=100, le=10000)
    overlap: int = Field(default=150, ge=0, le=500)


class ChunkElementsRequest(BaseModel):
    elements: list[dict]
    max_characters: int = Field(default=1500, ge=100, le=10000)
    overlap: int = Field(default=150, ge=0, le=500)
