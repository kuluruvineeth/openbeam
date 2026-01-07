from fastapi import APIRouter, Depends, Request

from engine.models.rerank import (
    RerankDocumentResult,
    RerankDocumentsRequest,
    RerankDocumentsResponse,
    RerankStatsResponse,
)
from engine.reranker import RerankerService
from engine.reranker.service import RerankInput

router = APIRouter()


def get_reranker_service(request: Request) -> RerankerService:
    service: RerankerService = request.app.state.reranker_service
    return service


@router.post("", response_model=RerankDocumentsResponse)
async def rerank(
    request: RerankDocumentsRequest,
    service: RerankerService = Depends(get_reranker_service),
) -> RerankDocumentsResponse:
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

    return RerankDocumentsResponse(
        results=[
            RerankDocumentResult(
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
    data = service.get_stats()
    model = data["model"]
    device = data["device"]
    cache = data["cache"]
    if not isinstance(model, str) or not isinstance(device, str):
        raise TypeError("Invalid stats format")
    if not isinstance(cache, dict):
        raise TypeError("Invalid cache stats format")
    return RerankStatsResponse(model=model, device=device, cache=cache)
