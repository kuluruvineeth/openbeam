from __future__ import annotations

import os
from typing import TYPE_CHECKING

from engine.common.logging import get_logger

if TYPE_CHECKING:
    from fastapi import FastAPI

    from engine.common.config import BaseServiceSettings

logger = get_logger(__name__)

OTEL_SERVICE_NAME = "openplane-engine"


def configure_tracing(
    app: FastAPI,
    settings: BaseServiceSettings,
    *,
    service_name: str = OTEL_SERVICE_NAME,
) -> None:
    otel_endpoint = _get_otel_endpoint()
    if otel_endpoint is None:
        logger.info("tracing_disabled", reason="OTEL_EXPORTER_OTLP_ENDPOINT not set")
        return

    from opentelemetry import trace
    from opentelemetry.baggage.propagation import W3CBaggagePropagator
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
        OTLPSpanExporter,
    )
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.propagate import set_global_textmap
    from opentelemetry.propagators.composite import CompositePropagator
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.trace.propagation.tracecontext import (
        TraceContextTextMapPropagator,
    )

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": os.environ.get("APP_VERSION", "0.2.0"),
            "deployment.environment": settings.environment,
        }
    )

    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(
        endpoint=otel_endpoint, insecure=not settings.is_production
    )
    provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    set_global_textmap(
        CompositePropagator(
            [
                TraceContextTextMapPropagator(),
                W3CBaggagePropagator(),
            ]
        )
    )

    FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls="health,ready,metrics",
    )

    logger.info(
        "tracing_enabled",
        endpoint=otel_endpoint,
        service_name=service_name,
        environment=settings.environment,
    )


def _get_otel_endpoint() -> str | None:
    return os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
