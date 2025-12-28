from fastapi import APIRouter, Depends, Request

from engine.models.rerank import (
    RerankRequest,
    RerankResponse,
    RerankResult,
    RerankStatsResponse,
)
from engine.reranker import RerankerService
from engine.reranker.service import RerankInput

router = APIRouter()


def get_reranker_service(request: Request) -> RerankerService:
    return request.app.state.reranker_service


@router.post("", response_model=RerankResponse)
async def rerank(
    request: RerankRequest,
    service: RerankerService = Depends(get_reranker_service),
) -> RerankResponse:
    documents = [
        RerankInput(
            doc_id=doc.id,
            content=doc.content,
            title=doc.title,
            original_score=doc.score,
            original_rank=doc.rank,
        )
        for doc in request.documents
    ]

    results, elapsed_ms = await service.rerank(
        query=request.query,
        documents=documents,
        top_k=request.top_k,
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
async def stats(
    service: RerankerService = Depends(get_reranker_service),
) -> RerankStatsResponse:
    stats = service.get_stats()
    return RerankStatsResponse(
        model=stats["model"],
        device=stats["device"],
        cache=stats["cache"],
    )
