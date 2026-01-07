from typing import Any

from pydantic import BaseModel, Field


class RerankDocument(BaseModel):
    id: str = Field(description="Document identifier")
    content: str = Field(description="Document content to rank")
    title: str | None = Field(default=None, description="Document title")
    score: float | None = Field(default=None, description="Original retrieval score")
    rank: int | None = Field(default=None, description="Original rank position")


class RerankRequest(BaseModel):
    query: str = Field(min_length=1, max_length=512, description="Search query")
    passages: list[str] = Field(
        min_length=1,
        max_length=200,
        description="Passages to rerank",
    )
    top_k: int | None = Field(default=None, ge=1, le=100, description="Number of results")


class RerankDocumentsRequest(BaseModel):
    query: str = Field(min_length=1, max_length=512, description="Search query")
    documents: list[RerankDocument] = Field(
        min_length=1,
        max_length=200,
        description="Documents to rerank",
    )
    top_k: int = Field(default=20, ge=1, le=100, description="Number of results")


class RerankResult(BaseModel):
    index: int
    score: float
    passage: str


class RerankDocumentResult(BaseModel):
    id: str
    score: float
    original_score: float | None
    original_rank: int | None


class RerankResponse(BaseModel):
    results: list[RerankResult]
    model: str
    usage: dict[str, float]


class RerankDocumentsResponse(BaseModel):
    results: list[RerankDocumentResult]
    elapsed_ms: float
    model: str


class RerankStatsResponse(BaseModel):
    model: str
    device: str
    cache: dict[str, Any]
