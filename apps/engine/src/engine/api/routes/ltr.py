from pathlib import Path
from typing import cast

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request

from engine.ltr import LTRService, LTRTrainer
from engine.ltr.features import FEATURE_NAMES
from engine.models.ltr import (
    LTRHealthResponse,
    LTRRequest,
    LTRResponse,
    LTRResult,
    TrainingRequest,
    TrainingResponse,
)

router = APIRouter(prefix="/ltr", tags=["ltr"])


def get_ltr(request: Request) -> LTRService:
    return cast(LTRService, request.app.state.ltr_service)


@router.post("", response_model=LTRResponse)
async def score(
    request: LTRRequest,
    service: LTRService = Depends(get_ltr),
) -> LTRResponse:
    if not service.is_ready:
        raise HTTPException(
            status_code=503,
            detail="LTR model not loaded",
        )

    results, elapsed_ms = service.score(
        docs=request.documents,
        query=request.query,
        user_context=request.user_context,
        top_k=request.top_k,
    )

    return LTRResponse(
        results=[
            LTRResult(
                doc_id=r["doc_id"],
                score=r["score"],
                features=r["features"],
            )
            for r in results
        ],
        elapsed_ms=elapsed_ms,
        model_version=service.model_version,
        feature_count=service.feature_count,
    )


@router.get("/health", response_model=LTRHealthResponse)
async def health(service: LTRService = Depends(get_ltr)) -> LTRHealthResponse:
    return LTRHealthResponse(
        ready=service.is_ready,
        model_version=service.model_version,
        feature_count=service.feature_count,
    )


@router.post("/reload")
async def reload(
    version: str | None = None,
    service: LTRService = Depends(get_ltr),
) -> dict[str, bool | str]:
    service.reload_model(version)
    return {
        "reloaded": True,
        "model_version": service.model_version,
    }


@router.post("/train", response_model=TrainingResponse)
async def train(
    request: TrainingRequest,
    service: LTRService = Depends(get_ltr),
) -> TrainingResponse:
    impressions_data = [
        {
            "id": imp.id,
            "query": imp.query,
            "result_doc_ids": imp.result_doc_ids,
        }
        for imp in request.impressions
    ]

    clicks_data = []
    for imp in request.impressions:
        for click in imp.clicks:
            clicks_data.append(
                {
                    "impression_id": imp.id,
                    "doc_id": click.doc_id,
                    "position": click.position,
                    "dwell_time_ms": click.dwell_time_ms,
                    "feedback_type": click.feedback_type,
                }
            )

    features_by_doc: dict[str, np.ndarray] = {}
    for doc_id, features_dict in request.features_by_doc.items():
        feature_vec = np.zeros(len(FEATURE_NAMES), dtype=np.float32)
        for i, name in enumerate(FEATURE_NAMES):
            feature_vec[i] = features_dict.get(name, 0.0)
        features_by_doc[doc_id] = feature_vec

    if len(impressions_data) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient training data: {len(impressions_data)} impressions (minimum 10)",
        )

    trainer = LTRTrainer()
    X, y, groups = trainer.prepare_training_data(
        impressions_data,
        clicks_data,
        features_by_doc,
        FEATURE_NAMES,
    )

    if len(groups) < 5:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient training queries: {len(groups)} (minimum 5)",
        )

    result = trainer.train(X, y, groups, FEATURE_NAMES)

    model_base_path = Path(service.model_path).parent
    model_dir = trainer.save_model(result, model_base_path, request.version)

    return TrainingResponse(
        success=True,
        version=request.version,
        model_path=str(model_dir),
        metrics=result.metrics,
        feature_importance=result.feature_importance,
        training_time_seconds=result.training_time_seconds,
        num_queries=result.num_queries,
        num_documents=result.num_documents,
    )
