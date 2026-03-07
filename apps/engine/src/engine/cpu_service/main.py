from __future__ import annotations

import multiprocessing
import os
import warnings

os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import contextlib

if __name__ == "__main__" or multiprocessing.get_start_method(allow_none=True) is None:
    with contextlib.suppress(RuntimeError):
        multiprocessing.set_start_method("spawn", force=True)

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from engine.common.config import (
    CPUServiceSettings,
    SecuritySettings,
    get_cpu_settings,
    get_security_settings,
)
from engine.common.logging import configure_logging, get_logger
from engine.common.metrics_middleware import MetricsMiddleware
from engine.common.security import (
    RateLimitExceeded,
    RequestIDMiddleware,
    SecurityEvent,
    SecurityHeadersMiddleware,
    audit_logger,
    get_client_ip,
)
from engine.common.tracing import configure_tracing
from engine.cpu_service.lifespan import lifespan
from engine.cpu_service.router import api_router

CPU_SERVICE_NAME = "openbeam-engine-cpu"

logger = get_logger(__name__)


def create_app() -> FastAPI:
    settings = get_cpu_settings()
    security = get_security_settings()
    configure_logging(settings, service_name=CPU_SERVICE_NAME)

    app = FastAPI(
        title="OpenBeam Engine CPU Service",
        description="Document parsing, chunking, and LTR scoring",
        version="0.2.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    _configure_exception_handlers(app)
    _configure_middleware(app, settings, security)
    _configure_observability(app)
    configure_tracing(app, settings, service_name=CPU_SERVICE_NAME)

    app.include_router(api_router, prefix="/v1")
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
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    allowed_origins = security.allowed_origins if settings.is_production else ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=[
            "X-API-Key",
            "X-Request-ID",
            "Content-Type",
            "traceparent",
            "tracestate",
        ],
        expose_headers=["X-Request-ID", "Retry-After", "traceparent", "tracestate"],
    )


def _configure_observability(app: FastAPI) -> None:
    app.mount("/metrics", make_asgi_app())


def run() -> None:
    settings = get_cpu_settings()
    configure_logging(settings, service_name=CPU_SERVICE_NAME)

    # Suppress a noisy Python 3.12+ shutdown warning that can be triggered by
    # third-party ML libraries using multiprocessing primitives.
    #
    # This is intentionally placed in the entrypoint (rather than model modules)
    # to ensure it takes precedence even if other libraries modify warning
    # filters later during import/startup.
    warnings.filterwarnings(
        "ignore",
        message=r".*resource_tracker.*leaked semaphore.*",
        category=UserWarning,
    )

    workers = settings.workers
    if settings.enable_ml and workers > 1:
        logger.warning(
            "ml_workers_override",
            original=workers,
            override=1,
            reason="ML models require significant memory; use CPU_WORKERS=1 with CPU_ENABLE_ML=true",
        )
        workers = 1

    logger.info(
        "starting_cpu_service",
        host=settings.host,
        port=settings.port,
        workers=workers,
        environment=settings.environment,
    )

    uvicorn.run(
        "engine.cpu_service.main:create_app",
        factory=True,
        host=settings.host,
        port=settings.port,
        workers=workers,
    )


if __name__ == "__main__":
    run()
