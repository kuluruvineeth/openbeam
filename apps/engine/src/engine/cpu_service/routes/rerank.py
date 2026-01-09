from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()


class RerankDocument(BaseModel):
    id: str
    content: str
    title: str | None = None
    score: float | None = None
    rank: int | None = None


class RerankRequest(BaseModel):
    query: str
    documents: list[RerankDocument]
    top_k: int = 20


class RerankResult(BaseModel):
    id: str
    score: float
    original_score: float | None
    original_rank: int | None


class RerankResponse(BaseModel):
    results: list[RerankResult]
    elapsed_ms: float
    model: str


class RerankStatsResponse(BaseModel):
    model: str
    device: str
    cache: dict[str, int | float]


def _get_service(request: Request):
    service = request.app.state.reranker_service
    if service is None:
        raise HTTPException(
            status_code=503,
            detail="Reranker service not available. Set CPU_ENABLE_ML=true to enable.",
        )
    return service


@router.post("", response_model=RerankResponse)
async def rerank(
    req: RerankRequest,
    request: Request,
) -> RerankResponse:
    service = _get_service(request)

    from engine.reranker.service import RerankInput

    documents = [
        RerankInput(
            doc_id=doc.id,
            content=doc.content,
            title=doc.title,
            original_score=doc.score,
            original_rank=doc.rank,
        )
        for doc in req.documents
    ]

    results, elapsed_ms = await service.rerank(
        query=req.query,
        documents=documents,
        top_k=req.top_k,
    )

    return RerankResponse(
        results=[
            RerankResult(
                id=r.doc_id,
                score=r.score,
                original_score=r.original_score,
                original_rank=r.original_rank,
            )
            for r in results
        ],
        elapsed_ms=elapsed_ms,
        model=service.model_name,
    )


@router.get("/stats", response_model=RerankStatsResponse)
async def stats(request: Request) -> RerankStatsResponse:
    service = _get_service(request)
    data = service.get_stats()
    model = data["model"]
    device = data["device"]
    cache = data["cache"]
    if not isinstance(model, str) or not isinstance(device, str):
        raise HTTPException(status_code=500, detail="Invalid stats format")
    if not isinstance(cache, dict):
        raise HTTPException(status_code=500, detail="Invalid cache stats format")
    return RerankStatsResponse(model=model, device=device, cache=cache)
