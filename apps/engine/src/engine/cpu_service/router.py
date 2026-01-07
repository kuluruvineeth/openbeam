from __future__ import annotations

from fastapi import APIRouter

from engine.cpu_service.routes import chunk, health, ltr, parse, supported_types

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(parse.router, prefix="/parse", tags=["parse"])
api_router.include_router(chunk.router, prefix="/chunk", tags=["chunk"])
api_router.include_router(supported_types.router, prefix="/supported-types", tags=["supported-types"])
api_router.include_router(ltr.router, tags=["ltr"])
