from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()


class SingleEmbeddingRequest(BaseModel):
    text: str
    max_length: int | None = None


class SingleEmbeddingResponse(BaseModel):
    dense: list[float]
    sparse: dict[str, float] | None


class BatchEmbeddingRequest(BaseModel):
    texts: list[str]
    mode: str = "document"
    max_length: int | None = None


class BatchEmbeddingResponse(BaseModel):
    embeddings: list[SingleEmbeddingResponse]


class CacheStatsResponse(BaseModel):
    memory: int
    redis: int
    disk: int
    miss: int
    hit_rate: float


def _get_service(request: Request):
    service = request.app.state.embedding_service
    if service is None:
        raise HTTPException(
            status_code=503,
            detail="Embedding service not available. Set CPU_ENABLE_ML=true to enable.",
        )
    return service


@router.post("/query", response_model=SingleEmbeddingResponse)
async def embed_query(
    req: SingleEmbeddingRequest,
    request: Request,
) -> SingleEmbeddingResponse:
    service = _get_service(request)
    result = await service.embed_query(req.text, req.max_length)
    return SingleEmbeddingResponse(dense=result.dense, sparse=result.sparse)


@router.post("/document", response_model=SingleEmbeddingResponse)
async def embed_document(
    req: SingleEmbeddingRequest,
    request: Request,
) -> SingleEmbeddingResponse:
    service = _get_service(request)
    result = await service.embed_document(req.text, req.max_length)
    return SingleEmbeddingResponse(dense=result.dense, sparse=result.sparse)


@router.post("/batch", response_model=BatchEmbeddingResponse)
async def embed_batch(
    req: BatchEmbeddingRequest,
    request: Request,
) -> BatchEmbeddingResponse:
    service = _get_service(request)
    results = await service.embed_batch(req.texts, req.mode, req.max_length)
    return BatchEmbeddingResponse(
        embeddings=[
            SingleEmbeddingResponse(dense=r.dense, sparse=r.sparse) for r in results
        ]
    )


@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_stats(request: Request) -> CacheStatsResponse:
    service = _get_service(request)
    stats = service.get_cache_stats()
    return CacheStatsResponse(
        memory=stats["memory"],
        redis=stats["redis"],
        disk=stats["disk"],
        miss=stats["miss"],
        hit_rate=stats["hit_rate"],
    )
