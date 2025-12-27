from fastapi import APIRouter, Depends, Request

from engine.models.embedding import (
    BatchEmbeddingRequest,
    BatchEmbeddingResponse,
    CacheStatsResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)
from engine.services.embedding import EmbeddingService

router = APIRouter()


def get_embedding_service(request: Request) -> EmbeddingService:
    return request.app.state.embedding_service


@router.post("/query", response_model=EmbeddingResponse)
async def embed_query(
    request: EmbeddingRequest,
    service: EmbeddingService = Depends(get_embedding_service),
) -> EmbeddingResponse:
    return await service.embed_query(request.text, request.max_length)


@router.post("/document", response_model=EmbeddingResponse)
async def embed_document(
    request: EmbeddingRequest,
    service: EmbeddingService = Depends(get_embedding_service),
) -> EmbeddingResponse:
    return await service.embed_document(request.text, request.max_length)


@router.post("/batch", response_model=BatchEmbeddingResponse)
async def embed_batch(
    request: BatchEmbeddingRequest,
    service: EmbeddingService = Depends(get_embedding_service),
) -> BatchEmbeddingResponse:
    embeddings = await service.embed_batch(
        request.texts,
        request.mode,
        request.max_length,
    )
    return BatchEmbeddingResponse(embeddings=embeddings)


@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_stats(
    service: EmbeddingService = Depends(get_embedding_service),
) -> CacheStatsResponse:
    stats = service.get_cache_stats()
    return CacheStatsResponse(**stats)
