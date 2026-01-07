from fastapi import APIRouter, Depends, Request

from engine.models.embedding import (
    BatchEmbeddingRequest,
    BatchEmbeddingResponse,
    CacheStatsResponse,
    SingleEmbeddingRequest,
    SingleEmbeddingResponse,
)
from engine.services.embedding import EmbeddingService

router = APIRouter()


def get_embedding_service(request: Request) -> EmbeddingService:
    service: EmbeddingService = request.app.state.embedding_service
    return service


@router.post("/query", response_model=SingleEmbeddingResponse)
async def embed_query(
    request: SingleEmbeddingRequest,
    service: EmbeddingService = Depends(get_embedding_service),
) -> SingleEmbeddingResponse:
    return await service.embed_query(request.text, request.max_length)


@router.post("/document", response_model=SingleEmbeddingResponse)
async def embed_document(
    request: SingleEmbeddingRequest,
    service: EmbeddingService = Depends(get_embedding_service),
) -> SingleEmbeddingResponse:
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
    return CacheStatsResponse(
        memory=stats["memory"],
        redis=stats["redis"],
        disk=stats["disk"],
        miss=stats["miss"],
        hit_rate=stats["hit_rate"],
    )
