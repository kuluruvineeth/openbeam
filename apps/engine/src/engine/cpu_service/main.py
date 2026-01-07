from __future__ import annotations

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from engine.common.config import (
    CPUServiceSettings,
    SecuritySettings,
    get_cpu_settings,
    get_security_settings,
)
from engine.common.logging import configure_logging, get_logger
from engine.common.security import (
    RateLimitExceeded,
    RequestIDMiddleware,
    SecurityEvent,
    SecurityHeadersMiddleware,
    audit_logger,
    get_client_ip,
)
from engine.cpu_service.lifespan import lifespan
from engine.cpu_service.router import api_router

logger = get_logger(__name__)


def create_app() -> FastAPI:
    settings = get_cpu_settings()
    security = get_security_settings()
    configure_logging(settings)

    app = FastAPI(
        title="OpenPlane Engine CPU Service",
        description="Document parsing, chunking, and LTR scoring",
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    _configure_exception_handlers(app)
    _configure_middleware(app, settings, security)

    app.include_router(api_router)
    return app


def _configure_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(
        request: Request,
        exc: RateLimitExceeded,
    ) -> JSONResponse:
        audit_logger.log(
            SecurityEvent.RATE_LIMIT_EXCEEDED,
            client_ip=get_client_ip(request),
            path=request.url.path,
            method=request.method,
            status_code=429,
            retry_after=exc.retry_after,
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": exc.detail},
            headers={"Retry-After": str(exc.retry_after)},
        )


def _configure_middleware(
    app: FastAPI, settings: CPUServiceSettings, security: SecuritySettings
) -> None:
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    allowed_origins = security.allowed_origins if settings.is_production else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["X-API-Key", "X-Request-ID", "Content-Type"],
        expose_headers=["X-Request-ID", "Retry-After"],
    )


def run() -> None:
    settings = get_cpu_settings()
    configure_logging(settings)

    logger.info(
        "starting_cpu_service",
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
        environment=settings.environment,
    )

    uvicorn.run(
        "engine.cpu_service.main:create_app",
        factory=True,
        host=settings.host,
        port=settings.port,
        workers=settings.workers,
    )


if __name__ == "__main__":
    run()
