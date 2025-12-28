from fastapi import APIRouter

from engine.api.routes import chunk, embeddings, health, parse, rerank, supported_types

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(parse.router, prefix="/parse", tags=["parse"])
api_router.include_router(chunk.router, prefix="/chunk", tags=["chunk"])
api_router.include_router(
    supported_types.router, prefix="/supported-types", tags=["supported-types"]
)
api_router.include_router(embeddings.router, prefix="/embeddings", tags=["embeddings"])
api_router.include_router(rerank.router, prefix="/rerank", tags=["rerank"])
