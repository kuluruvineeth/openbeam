from typing import Literal

from pydantic import BaseModel, Field

EmbeddingMode = Literal["query", "document"]


class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=32000)
    max_length: int = Field(default=512, ge=1, le=8192)
    return_sparse: bool = Field(default=True)


class BatchEmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=100)
    max_length: int = Field(default=512, ge=1, le=8192)
    mode: EmbeddingMode = Field(default="document")


class EmbeddingResponse(BaseModel):
    dense: list[float]
    sparse: dict[str, float] | None = None


class BatchEmbeddingResponse(BaseModel):
    embeddings: list[EmbeddingResponse]


class CacheStatsResponse(BaseModel):
    memory: int
    redis: int
    disk: int
    miss: int
    hit_rate: float
