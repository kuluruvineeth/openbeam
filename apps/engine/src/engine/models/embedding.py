from typing import Literal

from pydantic import BaseModel, Field

EmbeddingMode = Literal["query", "document"]


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=100)
    return_sparse: bool = Field(default=False)
    max_length: int = Field(default=512, ge=1, le=8192)


class EmbeddingResponse(BaseModel):
    embeddings: list[list[float]]
    sparse_embeddings: list[dict[str, float]] | None = None
    model: str
    usage: dict[str, float | int]


class SingleEmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=32000)
    max_length: int = Field(default=512, ge=1, le=8192)
    return_sparse: bool = Field(default=True)


class SingleEmbeddingResponse(BaseModel):
    dense: list[float]
    sparse: dict[str, float] | None = None


class BatchEmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=100)
    max_length: int = Field(default=512, ge=1, le=8192)
    mode: EmbeddingMode = Field(default="document")


class BatchEmbeddingResponse(BaseModel):
    embeddings: list[SingleEmbeddingResponse]


class CacheStatsResponse(BaseModel):
    memory: int
    redis: int
    disk: int
    miss: int
    hit_rate: float
